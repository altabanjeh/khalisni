from django.core.exceptions import ValidationError
from django.db import transaction

from accounts.models import CustomUser, CustomerProfile
from audit.utils import create_audit_log
from documents.services import create_order_document
from notifications.services import notify_client, send_notification_event
from organizations.models import OrganizationMembership
from organizations.services import resolve_order_organization
from orders.models import MissingDocumentRequest, Order, OrderAssignmentHistory, OrderNote, OrderStatusLog, Rating
from services.order_completion import create_related_service_notifications
from services.order_validation import validate_order_prerequisites
from workflow.rules import get_transition_rule
from workflow.transition_permissions import assert_can_cancel_order, assert_order_transition_allowed


def _build_guest_email(phone):
    digits = "".join(char for char in phone if char.isdigit()) or "guest"
    return f"{digits}@guest.khalisni.local"


def _get_or_create_public_customer(*, full_name, phone, national_id=""):
    """
    Reuse the guest customer account when a public user comes back.
    """
    customer = CustomUser.objects.filter(phone=phone).first()
    if customer and customer.role != CustomUser.Role.CUSTOMER:
        raise ValidationError({"phone": "Phone number belongs to a non-customer account."})

    if not customer:
        email = _build_guest_email(phone)
        suffix = 1
        while CustomUser.objects.filter(email=email).exists():
            email = f"{''.join(char for char in phone if char.isdigit()) or 'guest'}-{suffix}@guest.khalisni.local"
            suffix += 1
        return CustomUser.objects.create_user(
            email=email,
            password=None,
            full_name=full_name,
            phone=phone,
            national_id=national_id,
            role=CustomUser.Role.CUSTOMER,
        )

    customer.full_name = full_name
    customer.national_id = national_id or customer.national_id
    customer.save(update_fields=["full_name", "national_id", "updated_at"])
    return customer


def _sync_customer_organization(customer, organization):
    if organization is None:
        return
    profile, _ = CustomerProfile.objects.get_or_create(user=customer)
    if profile.organization_id != organization.id:
        profile.organization = organization
        profile.save(update_fields=["organization", "updated_at"])
    OrganizationMembership.objects.get_or_create(
        user=customer,
        organization=organization,
        role=OrganizationMembership.MembershipRole.CUSTOMER,
        defaults={"is_active": True},
    )


def _required_document_types(order):
    return list(
        order.service.document_requirements.filter(is_active=True, is_deleted=False, is_required=True).values_list("document_type", flat=True)
    )


def _approved_document_types(order, *, document_types):
    return set(
        order.documents.filter(
            is_deleted=False,
            status="approved",
            document_type__in=document_types,
        ).values_list("document_type", flat=True)
    )


def _assert_required_documents_satisfied(order):
    if order.missing_document_types:
        raise ValidationError({"detail": "Order still has unresolved missing customer documents."})

    required_document_types = _required_document_types(order)
    if not required_document_types:
        return

    approved_document_types = _approved_document_types(order, document_types=required_document_types)
    missing_approved_types = sorted(set(required_document_types) - approved_document_types)
    if missing_approved_types:
        raise ValidationError(
            {
                "detail": (
                    "All required documents must be approved before continuing workflow. "
                    f"Missing approvals for: {', '.join(missing_approved_types)}."
                )
            }
        )


def _audit_blocked_transition(*, request=None, actor=None, order, attempted_status, reason):
    create_audit_log(
        request=request,
        user=actor,
        action="blocked_order_status_transition",
        entity_type="Order",
        entity_id=order.pk,
        old_value={"status": order.status},
        new_value={"attempted_status": attempted_status, "reason": reason},
    )


def _require_text(value, *, field_name="detail", message):
    clean_value = (value or "").strip()
    if not clean_value:
        raise ValidationError({field_name: message})
    return clean_value


def _audit_transition(*, request=None, actor=None, order, action, old_status, new_status, note=""):
    create_audit_log(
        request=request,
        user=actor,
        action=action,
        entity_type="Order",
        entity_id=order.pk,
        old_value={"status": old_status},
        new_value={"status": new_status, "note": note},
    )


def _transition_order(*, order, actor, new_status, note, request=None, audit_action):
    old_status = order.status
    order.transition_status(new_status, changed_by=actor, note=note)
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action=audit_action,
        old_status=old_status,
        new_status=new_status,
        note=note,
    )
    return order


def create_public_order(*, data, request=None):
    """
    Create a public order from the unauthenticated client form.

    This service owns the initial side effects so the create API stays thin.
    """
    initial_documents = list(data.get("initial_documents", []))
    national_id = data.get("national_id", "")
    organization = resolve_order_organization(
        customer=None,
        service=data["service"],
        organization=data.get("organization"),
    )

    with transaction.atomic():
        customer = _get_or_create_public_customer(
            full_name=data["full_name"],
            phone=data["phone"],
            national_id=national_id,
        )
        _sync_customer_organization(customer, organization)
        order = Order.objects.create(
            customer=customer,
            organization=organization,
            branch=data.get("branch"),
            service=data["service"],
            service_name_snapshot=data["service"].name_ar,
            service_category_name_snapshot=data["service"].category.name_ar,
            organization_name_snapshot=organization.name,
            city=data["city"],
            customer_notes=data.get("notes", ""),
        )
        OrderStatusLog.objects.create(order=order, old_status="", new_status=order.status, changed_by=customer)

        for document in initial_documents:
            create_order_document(
                order=order,
                uploaded_by=customer,
                file_obj=document["file"],
                document_type=document["document_type"],
            )

        send_notification_event(
            event_key="order_submitted",
            order=order,
            actor=customer,
            request=request,
            dedupe_key=f"order_submitted:{order.pk}",
        )
        create_audit_log(
            request=request,
            user=customer,
            action="create_order",
            entity_type="Order",
            entity_id=order.pk,
            new_value={"order_number": order.order_number, "service": data["service"].name_ar},
        )
        return order


def create_customer_order(*, customer, data, request=None):
    """
    Create an order for an authenticated customer account.

    The submitted form can refresh the customer's contact fields so future
    tracking and follow-up stay in sync with the latest public-facing data.
    """
    if getattr(customer, "role", "") != CustomUser.Role.CUSTOMER:
        raise ValidationError({"detail": "Orders can only be created by customer accounts."})

    initial_documents = list(data.get("initial_documents", []))
    updated_fields = []
    prerequisite_check = validate_order_prerequisites(customer=customer, service=data["service"])
    organization = resolve_order_organization(
        customer=customer,
        service=data["service"],
        organization=data.get("organization"),
    )

    for field_name in ("full_name", "phone", "national_id"):
        new_value = data.get(field_name, "")
        if new_value is None:
            new_value = ""
        if getattr(customer, field_name) != new_value:
            setattr(customer, field_name, new_value)
            updated_fields.append(field_name)

    with transaction.atomic():
        if updated_fields:
            customer.save(update_fields=[*updated_fields, "updated_at"])
        _sync_customer_organization(customer, organization)

        order = Order.objects.create(
            customer=customer,
            organization=organization,
            branch=data.get("branch"),
            service=data["service"],
            service_name_snapshot=data["service"].name_ar,
            service_category_name_snapshot=data["service"].category.name_ar,
            organization_name_snapshot=organization.name,
            city=data["city"],
            customer_notes=data.get("notes", ""),
        )
        OrderStatusLog.objects.create(order=order, old_status="", new_status=order.status, changed_by=customer)

        for document in initial_documents:
            create_order_document(
                order=order,
                uploaded_by=customer,
                file_obj=document["file"],
                document_type=document["document_type"],
            )

        send_notification_event(
            event_key="order_submitted",
            order=order,
            actor=customer,
            request=request,
            dedupe_key=f"order_submitted:{order.pk}",
        )
        create_audit_log(
            request=request,
            user=customer,
            action="create_order",
            entity_type="Order",
            entity_id=order.pk,
            new_value={"order_number": order.order_number, "service": data["service"].name_ar},
        )
        order.prerequisite_warnings = prerequisite_check.warnings
        return order


def upload_customer_document(*, order, actor, validated_data, request=None):
    """
    Add a customer document and reopen review when the order was waiting on the
    customer.
    """
    if order.is_final_state:
        raise ValidationError({"detail": "Documents cannot be uploaded to a closed order."})

    requirement = order.service.document_requirements.filter(
        document_type=validated_data["document_type"],
        is_active=True,
        is_deleted=False,
    ).first()
    if (
        getattr(actor, "role", "") == CustomUser.Role.CUSTOMER
        and requirement
        and not requirement.client_can_replace_file
        and order.documents.filter(
            is_deleted=False,
            document_type=validated_data["document_type"],
        ).exists()
    ):
        raise ValidationError({"detail": "This document type cannot be replaced by the client after upload."})

    status_before_upload = order.status
    with transaction.atomic():
        document = create_order_document(
            order=order,
            uploaded_by=actor,
            file_obj=validated_data["file"],
            document_type=validated_data["document_type"],
            is_final_document=validated_data.get("is_final_document", False),
            verification_note=validated_data.get("verification_note", ""),
        )
        if order.status == Order.Status.WAITING_CUSTOMER:
            current_missing = list(order.missing_document_types or [])
            if current_missing:
                remaining_missing = [doc_type for doc_type in current_missing if doc_type != document.document_type]
                if remaining_missing != current_missing:
                    order.missing_document_types = remaining_missing
                    order.save(update_fields=["missing_document_types", "updated_at"])
                if not remaining_missing:
                    resume_review(
                        order=order,
                        actor=actor,
                        note="Customer uploaded all requested missing documents",
                        request=request,
                    )
            else:
                resume_review(
                    order=order,
                    actor=actor,
                    note="Customer uploaded missing documents",
                    request=request,
                )

    create_audit_log(
        request=request,
        action="customer_upload_document",
        entity_type="Document",
        entity_id=document.pk,
        new_value={"order": order.order_number, "type": document.document_type},
    )
    if status_before_upload == Order.Status.WAITING_CUSTOMER:
        send_notification_event(
            event_key="client_uploaded_missing_document",
            order=order,
            actor=actor,
            document=document,
            request=request,
            dedupe_key=f"client_uploaded_missing_document:{document.pk}",
        )
    return document


def create_customer_rating(*, order, actor, validated_data, request=None):
    """
    Create the post-completion customer rating for an order.
    """
    if order.status != Order.Status.COMPLETED:
        raise ValidationError({"detail": "Order is not completed yet."})
    if hasattr(order, "rating"):
        raise ValidationError({"detail": "Order has already been rated."})

    rating = Rating.objects.create(order=order, customer=actor, **validated_data)
    create_audit_log(request=request, action="rate_order", entity_type="Rating", entity_id=rating.pk)
    return rating


def update_order_status(*, order, actor, new_status, note="", request=None):
    """
    Route safe generic status updates through explicit workflow actions only.
    """
    transition_rule = get_transition_rule(order.status, new_status)
    if not transition_rule or not transition_rule.generic_status_update:
        _audit_blocked_transition(
            request=request,
            actor=actor,
            order=order,
            attempted_status=new_status,
            reason="Status requires a dedicated workflow action.",
        )
        raise ValidationError(
            {"status": "This status cannot be changed through the generic status endpoint."}
        )

    action_name = transition_rule.action
    if action_name == "start_review":
        return review_order(order=order, actor=actor, note=note or "Order under review", request=request)
    if action_name == "resume_review":
        return resume_review(order=order, actor=actor, note=note or "Order returned to review", request=request)
    if action_name == "return_to_internal_review":
        return return_to_internal_review(order=order, actor=actor, reason=note, request=request)
    if action_name == "return_to_provider":
        return return_to_provider(order=order, actor=actor, reason=note, request=request)
    if action_name == "reopen_order":
        return reopen_order(order=order, actor=actor, reason=note, request=request)
    if action_name == "archive_order":
        return archive_order(order=order, actor=actor, note=note, request=request)

    _audit_blocked_transition(
        request=request,
        actor=actor,
        order=order,
        attempted_status=new_status,
        reason=f"Unhandled workflow action '{action_name}'.",
    )
    raise ValidationError({"status": "No workflow action is configured for this transition."})


def submit_order(*, order, actor, request=None):
    """
    Move a new order into the internal review queue.
    """
    if order.status != Order.Status.NEW:
        raise ValidationError({"detail": "Only new orders can be submitted."})

    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.UNDER_REVIEW)
    return _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.UNDER_REVIEW,
        note="Order submitted",
        request=request,
        audit_action="submit_order",
    )


def review_order(*, order, actor, note="Order under review", request=None):
    """
    Claim an order for internal review and store the current employee owner.
    """
    if getattr(actor, "role", "") not in {CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT}:
        raise ValidationError({"detail": "Only internal staff can review orders."})

    clean_note = (note or "").strip() or "Order under review"
    with transaction.atomic():
        old_status = order.status
        if order.status != Order.Status.UNDER_REVIEW:
            assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.UNDER_REVIEW)
        order.assigned_employee = actor
        order.save(update_fields=["assigned_employee", "updated_at"])
        if order.status == Order.Status.NEW:
            order.transition_status(Order.Status.UNDER_REVIEW, changed_by=actor, note=clean_note)
        OrderAssignmentHistory.objects.create(
            order=order,
            assigned_to=actor,
            assigned_by=actor,
            assignment_type="employee",
            note=clean_note,
        )

    if old_status != order.status:
        send_notification_event(
            event_key="order_under_review",
            order=order,
            actor=actor,
            request=request,
            dedupe_key=f"order_under_review:{order.pk}:{old_status}:{order.status}",
        )
        _audit_transition(
            request=request,
            actor=actor,
            order=order,
            action="start_review",
            old_status=old_status,
            new_status=order.status,
            note=clean_note,
        )
    else:
        create_audit_log(request=request, action="claim_review_order", entity_type="Order", entity_id=order.pk)
    return order


def assign_provider_to_order(*, order, provider, actor, note="", request=None):
    """
    Assign a provider and trigger the provider notification.
    """
    if order.status == Order.Status.NEW:
        raise ValidationError({"detail": "Order cannot be assigned before review."})

    _assert_required_documents_satisfied(order)

    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.ASSIGNED)
    old_status = order.status
    previous_provider_id = order.assigned_provider_id
    order.assign_provider(provider, assigned_by=actor, note=note)
    if provider.organization_id and order.assigned_provider_organization_id != provider.organization_id:
        order.assigned_provider_organization = provider.organization
        order.save(update_fields=["assigned_provider_organization", "updated_at"])
    send_notification_event(
        event_key="provider_assigned",
        order=order,
        actor=actor,
        request=request,
        dedupe_key=f"provider_assigned:{order.pk}:{previous_provider_id or 0}:{provider.pk}",
    )
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="assign_provider",
        old_status=old_status,
        new_status=order.status,
        note=note,
    )
    return order


def assign_provider(*, order, provider, actor, note="", request=None):
    """
    Checklist-facing alias for provider assignment.
    """
    return assign_provider_to_order(order=order, provider=provider, actor=actor, note=note, request=request)


def request_missing_documents(*, order, actor, note_text, missing_document_types=None, request=None):
    """
    Record the customer-facing request note and move the order into the
    waiting-on-customer state in one transaction.
    """
    normalized_document_types = sorted(
        {
            str(document_type).strip()
            for document_type in (missing_document_types or [])
            if str(document_type).strip()
        }
    )
    clean_note = _require_text(
        note_text,
        field_name="note",
        message="A reason is required when requesting missing documents.",
    )
    with transaction.atomic():
        assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.WAITING_CUSTOMER)
        old_status = order.status
        order.missing_document_types = normalized_document_types
        order.save(update_fields=["missing_document_types", "updated_at"])
        note = OrderNote.objects.create(
            order=order,
            user=actor,
            note=clean_note,
            visibility=OrderNote.Visibility.CUSTOMER,
        )
        MissingDocumentRequest.objects.create(
            order=order,
            requested_by=actor,
            document_types=normalized_document_types,
            reason=clean_note,
        )
        order.transition_status(Order.Status.WAITING_CUSTOMER, changed_by=actor, note=note.note)

    send_notification_event(
        event_key="missing_documents_requested",
        order=order,
        actor=actor,
        request=request,
        dedupe_key=f"missing_documents_requested:{order.pk}:{note.pk}",
        extra_context={"status_label": note.note},
    )
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="request_documents",
        old_status=old_status,
        new_status=order.status,
        note=note.note,
    )
    return note


def request_missing_info(*, order, actor, note_text, missing_document_types=None, request=None):
    return request_missing_documents(
        order=order,
        actor=actor,
        note_text=note_text,
        missing_document_types=missing_document_types,
        request=request,
    )


def add_order_note(*, order, actor, validated_data, request=None):
    """
    Create a note and notify the customer only when it is customer-visible.
    """
    note = OrderNote.objects.create(order=order, user=actor, **validated_data)
    if note.visibility == OrderNote.Visibility.CUSTOMER:
        notify_client(
            order=order,
            title="Order update",
            message=note.note,
            actor=actor,
            request=request,
            template_key="manual_customer_order_update",
            dedupe_key=f"order_note:{note.pk}",
        )
    create_audit_log(request=request, action="add_note", entity_type="OrderNote", entity_id=note.pk)
    return note


def upload_final_document(
    *,
    order,
    actor,
    validated_data,
    request=None,
    status_note,
    audit_action,
    customer_notification=None,
):
    """
    Persist the final output document and advance the workflow together.
    """
    _assert_required_documents_satisfied(order)

    with transaction.atomic():
        assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.READY_FOR_DELIVERY)
        old_status = order.status
        document = create_order_document(
            order=order,
            uploaded_by=actor,
            file_obj=validated_data["file"],
            document_type=validated_data["document_type"],
            is_final_document=True,
            verification_note=validated_data.get("verification_note", ""),
        )
        order.transition_status(
            Order.Status.READY_FOR_DELIVERY,
            changed_by=actor,
            note=status_note,
        )

    if getattr(actor, "role", "") == CustomUser.Role.PROVIDER:
        send_notification_event(
            event_key="provider_completed_work",
            order=order,
            actor=actor,
            document=document,
            request=request,
            dedupe_key=f"provider_completed_work:{document.pk}",
        )
    send_notification_event(
        event_key="order_ready_for_delivery",
        order=order,
        actor=actor,
        document=document,
        request=request,
        dedupe_key=f"order_ready_for_delivery:{document.pk}",
    )
    create_audit_log(request=request, action=audit_action, entity_type="Document", entity_id=document.pk)
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="mark_ready_for_delivery",
        old_status=old_status,
        new_status=order.status,
        note=status_note,
    )
    return document


def complete_order(*, order, actor, admin_confirmation=False, request=None):
    """
    Close the order after the final artifact has been confirmed.
    """
    if order.status == Order.Status.COMPLETED:
        raise ValidationError({"detail": "Order is already completed."})

    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.COMPLETED)
    _assert_required_documents_satisfied(order)

    final_documents = order.documents.filter(is_deleted=False, is_final_document=True)
    has_final_document = final_documents.exists()
    if not has_final_document and not admin_confirmation:
        _audit_blocked_transition(
            request=request,
            actor=actor,
            order=order,
            attempted_status=Order.Status.COMPLETED,
            reason="Final document is required before completion.",
        )
        raise ValidationError({"detail": "Completed order must have final document or admin confirmation."})
    if has_final_document and not final_documents.filter(is_verified=True).exists() and not admin_confirmation:
        _audit_blocked_transition(
            request=request,
            actor=actor,
            order=order,
            attempted_status=Order.Status.COMPLETED,
            reason="Final document must be verified before completion.",
        )
        raise ValidationError({"detail": "Final document must be verified before completing the order."})

    with transaction.atomic():
        old_status = order.status
        if order.missing_document_types:
            order.missing_document_types = []
            order.save(update_fields=["missing_document_types", "updated_at"])
        order.transition_status(Order.Status.COMPLETED, changed_by=actor, note="Order completed")
        if order.assigned_provider:
            order.assigned_provider.total_completed_orders += 1
            order.assigned_provider.save(update_fields=["total_completed_orders"])
        send_notification_event(
            event_key="order_completed",
            order=order,
            actor=actor,
            request=request,
            dedupe_key=f"order_completed:{order.pk}:{order.completed_at.isoformat() if order.completed_at else ''}",
        )
        create_related_service_notifications(order=order, actor=actor, request=request)
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="complete_order",
        old_status=old_status,
        new_status=order.status,
        note="Order completed",
    )
    return order


def verify_order(*, order, actor, admin_confirmation=False, request=None):
    """
    Explicit verification step for the final order result.
    """
    return complete_order(order=order, actor=actor, admin_confirmation=admin_confirmation, request=request)


def deliver_order(*, order, actor, admin_confirmation=False, request=None):
    """
    Delivery is currently the same final state as completion for the backend.
    """
    return complete_order(order=order, actor=actor, admin_confirmation=admin_confirmation, request=request)


def reject_order(*, order, actor, reason, request=None):
    """
    Reject the order with a mandatory reason and notify the customer.
    """
    clean_reason = _require_text(
        reason,
        field_name="reason",
        message="A reason is required when rejecting an order.",
    )
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.REJECTED)
    old_status = order.status
    if order.missing_document_types:
        order.missing_document_types = []
        order.save(update_fields=["missing_document_types", "updated_at"])
    order.transition_status(Order.Status.REJECTED, changed_by=actor, note=clean_reason)
    notify_client(
        order=order,
        title="Order rejected",
        message=order.rejection_reason,
        actor=actor,
        request=request,
        template_key="manual_order_rejected",
        dedupe_key=f"order_rejected:{order.pk}:{clean_reason}",
    )
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="reject_order",
        old_status=old_status,
        new_status=order.status,
        note=clean_reason,
    )
    return order


def cancel_order(*, order, actor, reason, request=None):
    """
    Central cancellation rule shared by client and staff actions.
    """
    clean_reason = _require_text(
        reason,
        field_name="reason",
        message="A reason is required when cancelling an order.",
    )
    assert_can_cancel_order(actor=actor, order=order)
    old_status = order.status
    if order.missing_document_types:
        order.missing_document_types = []
        order.save(update_fields=["missing_document_types", "updated_at"])
    order.transition_status(Order.Status.CANCELLED, changed_by=actor, note=clean_reason)
    send_notification_event(
        event_key="order_cancelled",
        order=order,
        actor=actor,
        request=request,
        dedupe_key=f"order_cancelled:{order.pk}:{old_status}:{order.status}",
    )
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="cancel_order",
        old_status=old_status,
        new_status=order.status,
        note=clean_reason,
    )
    return order


def provider_update_status(*, order, actor, new_status, note="", request=None):
    """
    Apply the provider-owned status changes only.
    """
    allowed_statuses = {
        Order.Status.IN_PROGRESS,
        Order.Status.WAITING_GOVERNMENT,
    }
    if new_status not in allowed_statuses:
        raise ValidationError({"detail": "Status not allowed for provider."})

    assert_order_transition_allowed(actor=actor, order=order, new_status=new_status)
    old_status = order.status
    clean_note = (note or "").strip()
    order.transition_status(new_status, changed_by=actor, note=clean_note)
    if old_status == Order.Status.ASSIGNED and new_status == Order.Status.IN_PROGRESS:
        send_notification_event(
            event_key="provider_started_work",
            order=order,
            actor=actor,
            request=request,
            dedupe_key=f"provider_started_work:{order.pk}:{old_status}:{new_status}",
        )
    _audit_transition(
        request=request,
        actor=actor,
        order=order,
        action="provider_status_update",
        old_status=old_status,
        new_status=order.status,
        note=clean_note,
    )
    return order


def start_work(*, order, actor, note="", request=None):
    """
    Convenience wrapper for the first provider transition.
    """
    return provider_update_status(
        order=order,
        actor=actor,
        new_status=Order.Status.IN_PROGRESS,
        note=note or "Provider started work",
        request=request,
    )


def complete_provider_work(*, order, actor, validated_data, request=None):
    """
    Upload the provider final result and move the case to staff verification.
    """
    return upload_final_document(
        order=order,
        actor=actor,
        validated_data=validated_data,
        request=request,
        status_note="Provider completed work and uploaded final result",
        audit_action="provider_upload_final_document",
        customer_notification={
            "title": "Final result uploaded",
            "message": f"Order {order.order_number} is ready for verification.",
        },
    )


def provider_add_internal_note(*, order, actor, note_text, request=None):
    """
    Attach a provider work note that remains internal to operations.
    """
    note = OrderNote.objects.create(
        order=order,
        user=actor,
        note=note_text,
        visibility=OrderNote.Visibility.INTERNAL,
    )
    create_audit_log(request=request, action="provider_add_note", entity_type="OrderNote", entity_id=note.pk)
    return note


def resume_review(*, order, actor, note="", request=None):
    from django.utils import timezone as tz

    if order.missing_document_types:
        raise ValidationError({"detail": "All requested missing documents must be uploaded before review can resume."})
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.UNDER_REVIEW)
    clean_note = (note or "").strip() or "Order returned to review"
    if getattr(actor, "role", "") in {CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT}:
        order.assigned_employee = actor
        order.save(update_fields=["assigned_employee", "updated_at"])
    # Close any open MissingDocumentRequest cycle for this order.
    MissingDocumentRequest.objects.filter(order=order, is_resolved=False).update(
        is_resolved=True, responded_at=tz.now()
    )
    return _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.UNDER_REVIEW,
        note=clean_note,
        request=request,
        audit_action="resume_review",
    )


def return_to_provider(*, order, actor, reason, request=None):
    clean_reason = _require_text(
        reason,
        field_name="reason",
        message="A reason is required when returning an order to the provider.",
    )
    if not order.assigned_provider_id:
        raise ValidationError({"detail": "This order has no assigned provider to return work to."})
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.IN_PROGRESS)
    result = _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.IN_PROGRESS,
        note=clean_reason,
        request=request,
        audit_action="return_to_provider",
    )
    send_notification_event(
        event_key="provider_result_returned",
        order=order,
        actor=actor,
        request=request,
        dedupe_key=f"provider_result_returned:{order.pk}:{clean_reason}",
    )
    return result


def return_to_internal_review(*, order, actor, reason, request=None):
    clean_reason = _require_text(
        reason,
        field_name="reason",
        message="A reason is required when returning an order to internal review.",
    )
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.UNDER_REVIEW)
    if getattr(actor, "role", "") in {CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT}:
        order.assigned_employee = actor
        order.save(update_fields=["assigned_employee", "updated_at"])
    return _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.UNDER_REVIEW,
        note=clean_reason,
        request=request,
        audit_action="return_to_internal_review",
    )


def reopen_order(*, order, actor, reason, request=None):
    clean_reason = _require_text(
        reason,
        field_name="reason",
        message="A reason is required when reopening a completed order.",
    )
    if order.status != Order.Status.COMPLETED:
        raise ValidationError({"detail": "Only completed orders can be reopened."})
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.UNDER_REVIEW)
    order.completed_at = None
    result = _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.UNDER_REVIEW,
        note=clean_reason,
        request=request,
        audit_action="reopen_order",
    )
    send_notification_event(
        event_key="order_reopened",
        order=order,
        actor=actor,
        request=request,
        dedupe_key=f"order_reopened:{order.pk}:{clean_reason}",
    )
    return result


def archive_order(*, order, actor, note="", request=None):
    assert_order_transition_allowed(actor=actor, order=order, new_status=Order.Status.ARCHIVED)
    clean_note = (note or "").strip() or "Order archived"
    return _transition_order(
        order=order,
        actor=actor,
        new_status=Order.Status.ARCHIVED,
        note=clean_note,
        request=request,
        audit_action="archive_order",
    )
