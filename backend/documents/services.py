from django.core.exceptions import ValidationError
from django.db import transaction

from audit.utils import create_audit_log
from notifications.services import send_notification_event
from documents.models import Document
from orders.models import Order


def _uploaded_by_role_for(user):
    """
    Persist the actor's business role on the document row.

    Keeping a copy of the uploader role avoids ambiguity if the user role
    changes later and makes document audit trails easier to reason about.
    """
    if not user:
        return ""

    role = (getattr(user, "role", "") or "").lower()
    allowed_roles = {choice for choice, _ in Document.UploadedByRole.choices}
    if role in allowed_roles:
        return role
    return ""


def create_order_document(
    *,
    order,
    uploaded_by,
    file_obj,
    document_type,
    is_final_document=False,
    verification_note="",
):
    """
    Create a document row for an order from an already-validated upload.

    Views and workflow services use this helper so every document creation
    path writes the same core metadata.
    """
    requirement = None
    if order and getattr(order, "service_id", None):
        requirement = order.service.document_requirements.filter(
            document_type=document_type,
            is_active=True,
            is_deleted=False,
        ).first()

    initial_status = Document.DocumentStatus.UPLOADED
    initial_note = verification_note
    is_rule_approved = False
    if requirement and not is_final_document and not requirement.requires_verification:
        initial_status = Document.DocumentStatus.APPROVED
        initial_note = verification_note or "Approved automatically by service rule."
        is_rule_approved = True

    return Document.objects.create(
        order=order,
        uploaded_by=uploaded_by,
        uploaded_by_role=_uploaded_by_role_for(uploaded_by),
        document_type=document_type,
        file=file_obj,
        original_filename=file_obj.name,
        file_size=file_obj.size,
        mime_type=getattr(file_obj, "content_type", ""),
        status=initial_status,
        is_final_document=is_final_document,
        verification_note=initial_note,
        auto_approved_by_rule=is_rule_approved,
    )


def _clear_missing_document_type_if_resolved(*, document, actor, request=None):
    order = document.order
    missing = list(order.missing_document_types or [])
    if not missing or document.document_type not in missing:
        return
    remaining = [t for t in missing if t != document.document_type]
    order.missing_document_types = remaining
    order.save(update_fields=["missing_document_types", "updated_at"])
    if not remaining and order.status == Order.Status.WAITING_CUSTOMER:
        from orders.services import resume_review  # local import avoids circular dependency
        resume_review(
            order=order,
            actor=actor,
            note="Staff approved all requested documents.",
            request=request,
        )


def verify_document(*, document, actor, is_verified, note="", request=None):
    """
    Approve or reject a document after staff review.

    Rejection requires a reason because that note is what the customer or
    provider will use to correct the submission.
    """
    clean_note = (note or "").strip()
    with transaction.atomic():
        old_document_status = document.status
        if is_verified:
            if document.is_verified:
                raise ValidationError({"detail": "This document is already verified."})
            document.mark_verified(user=actor, note=clean_note)
            create_audit_log(
                request=request,
                user=actor,
                action="verify_document",
                entity_type="Document",
                entity_id=document.pk,
                old_value={"status": old_document_status},
                new_value={"status": document.status, "note": clean_note},
            )
            send_notification_event(
                event_key="document_verified",
                order=document.order,
                actor=actor,
                document=document,
                request=request,
                dedupe_key=f"document_verified:{document.pk}",
            )
            _clear_missing_document_type_if_resolved(
                document=document, actor=actor, request=request
            )
            return document

        if not clean_note:
            raise ValidationError({"note": "A rejection note is required when rejecting a document."})
        if document.status == Document.DocumentStatus.REJECTED:
            raise ValidationError({"detail": "This document is already rejected."})

        order_old_status = document.order.status
        document.mark_rejected(user=actor, reason=clean_note)
        create_audit_log(
            request=request,
            user=actor,
            action="reject_document",
            entity_type="Document",
            entity_id=document.pk,
            old_value={"status": old_document_status},
            new_value={"status": document.status, "note": clean_note},
        )
        send_notification_event(
            event_key="document_rejected",
            order=document.order,
            actor=actor,
            document=document,
            request=request,
            dedupe_key=f"document_rejected:{document.pk}",
        )
        if document.is_final_document and document.order.status == Order.Status.READY_FOR_DELIVERY:
            target_status = Order.Status.IN_PROGRESS if document.order.assigned_provider_id else Order.Status.UNDER_REVIEW
            document.order.transition_status(
                target_status,
                changed_by=actor,
                note=clean_note or "Final document rejected and returned for rework.",
            )
            create_audit_log(
                request=request,
                user=actor,
                action="return_order_after_final_document_rejection",
                entity_type="Order",
                entity_id=document.order.pk,
                old_value={"status": order_old_status},
                new_value={"status": document.order.status, "note": clean_note},
            )
    return document


def can_user_download_document(*, user, document):
    """
    Centralize document download rules from the permission matrix.

    The function returns a boolean only; the view remains responsible for
    choosing whether the denial becomes 403 or 404.
    """
    if not user or not user.is_authenticated:
        return False

    role = (getattr(user, "role", "") or "").lower()
    order = document.order

    if role in {"admin", "employee", "support"}:
        return True

    if role == "customer":
        return order.customer_id == user.id

    if role == "provider":
        if not order.assigned_provider or order.assigned_provider.user_id != user.id:
            return False

        # Providers may always access final outputs and only the required
        # client documents for the specific service they are executing.
        if document.is_final_document:
            return True

        requirement = order.service.document_requirements.filter(
            document_type=document.document_type,
            is_active=True,
            is_deleted=False,
        ).first()
        return bool(requirement and requirement.provider_can_view_file)

    return False
