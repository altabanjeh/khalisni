from django.core.exceptions import ValidationError

from core.choices import OrderStatus, UserRole
from orders.selectors import can_view_order
from workflow.rules import get_generic_status_update_targets
from workflow.transition_permissions import assert_can_cancel_order, assert_order_transition_allowed


def _role(user):
    return (getattr(user, "role", "") or "").lower()


def _has_perm(user, permission_name):
    return bool(user and user.is_authenticated and user.has_perm(permission_name))


def _can_transition(*, user, order, target_status):
    try:
        assert_order_transition_allowed(actor=user, order=order, new_status=target_status)
    except ValidationError:
        return False
    return True


def _can_cancel(*, user, order):
    try:
        assert_can_cancel_order(actor=user, order=order)
    except ValidationError:
        return False
    return True


def _allowed_status_transitions(*, user, order):
    if not user or not user.is_authenticated:
        return []

    role = _role(user)
    if role == UserRole.PROVIDER:
        candidates = [OrderStatus.IN_PROGRESS, OrderStatus.WAITING_GOVERNMENT]
    elif _has_perm(user, "orders.manage_order_workflow"):
        candidates = get_generic_status_update_targets(order.status)
    else:
        candidates = ()

    return [
        status_value
        for status_value in candidates
        if _can_transition(user=user, order=order, target_status=status_value)
    ]


def _can_assign_provider(*, user, order):
    if not _has_perm(user, "orders.assign_order"):
        return False
    if not _can_transition(user=user, order=order, target_status=OrderStatus.ASSIGNED):
        return False

    # Use prefetched attribute when available (list views), fall back to DB query otherwise.
    prefetched = getattr(order.service, "_active_required_docs", None)
    if prefetched is not None:
        required_document_types = [doc.document_type for doc in prefetched]
    else:
        required_document_types = list(
            order.service.document_requirements.filter(is_active=True, is_required=True).values_list("document_type", flat=True)
        )
    if not required_document_types:
        return True

    # Use prefetched documents when possible, otherwise query.
    all_docs = getattr(order, "_prefetched_objects_cache", {}).get("documents")
    if all_docs is not None:
        approved_document_types = {
            doc.document_type
            for doc in all_docs
            if not doc.is_deleted and doc.status == "approved" and doc.document_type in required_document_types
        }
    else:
        approved_document_types = set(
            order.documents.filter(
                is_deleted=False,
                status="approved",
                document_type__in=required_document_types,
            ).values_list("document_type", flat=True)
        )
    return set(required_document_types).issubset(approved_document_types)


def get_order_allowed_actions(*, user, order, can_view=None):
    role = _role(user)
    # Pass can_view=True from list serializers to skip the extra DB existence check —
    # the queryset already guarantees visibility.
    if can_view is None:
        can_view = bool(user and user.is_authenticated and can_view_order(user, order))
    status_transitions = _allowed_status_transitions(user=user, order=order) if can_view else []

    can_add_internal_note = can_view and (
        (role in {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT} and _has_perm(user, "orders.review_order"))
        or role == UserRole.PROVIDER
    )

    return {
        "can_view": can_view,
        "available_status_transitions": status_transitions,
        "can_cancel": can_view and _can_cancel(user=user, order=order),
        "can_upload_customer_document": can_view and role == UserRole.CUSTOMER and not order.is_final_state,
        "can_view_missing_documents_form": can_view and role == UserRole.CUSTOMER and order.status == OrderStatus.WAITING_CUSTOMER,
        "can_submit_rating": can_view and role == UserRole.CUSTOMER and order.status == OrderStatus.COMPLETED and not hasattr(order, "rating"),
        "can_request_documents": can_view
        and _has_perm(user, "orders.request_missing_documents")
        and _can_transition(user=user, order=order, target_status=OrderStatus.WAITING_CUSTOMER),
        "can_assign_provider": can_view and _can_assign_provider(user=user, order=order),
        "can_add_internal_note": can_add_internal_note,
        "can_add_customer_note": can_view
        and role in {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT}
        and _has_perm(user, "orders.review_order"),
        "can_verify_documents": can_view and _has_perm(user, "documents.verify_document"),
        "can_send_manual_notification": can_view and _has_perm(user, "notifications.send_manual_notification"),
        "can_reject": can_view and _has_perm(user, "orders.reject_order") and _can_transition(user=user, order=order, target_status=OrderStatus.REJECTED),
        "can_complete": can_view
        and _has_perm(user, "orders.manage_order_workflow")
        and _can_transition(user=user, order=order, target_status=OrderStatus.COMPLETED),
        "can_upload_final_document": can_view
        and (role == UserRole.PROVIDER or _has_perm(user, "documents.upload_final_document"))
        and _can_transition(user=user, order=order, target_status=OrderStatus.READY_FOR_DELIVERY),
    }
