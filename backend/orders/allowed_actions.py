from django.core.exceptions import ValidationError

from core.choices import OrderStatus, UserRole
from organizations.selectors import is_partner_admin, is_partner_operational_user, is_provider_user
from orders.selectors import can_view_order
from orders.readiness import evaluate_order_requirements, unresolved_missing_request_types
from workflow.rules import WORKFLOW_TRANSITIONS

CUSTOMER_UPLOAD_STATUSES = frozenset(
    {OrderStatus.NEW, OrderStatus.UNDER_REVIEW, OrderStatus.WAITING_CUSTOMER}
)
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


def _workflow_transitions(*, user, order, readiness):
    """Describe every rule from this state, including why it is unavailable now."""
    options = []
    for rule in WORKFLOW_TRANSITIONS:
        if rule.from_status != order.status:
            continue
        # `reasons` keeps the existing English text; `blocked` carries the same
        # facts as stable codes so a screen can present them in its language.
        reasons = []
        blocked = []

        def block(code, message, **params):
            reasons.append(message)
            blocked.append({"code": code, "params": params})

        try:
            assert_order_transition_allowed(actor=user, order=order, new_status=rule.to_status)
        except ValidationError as error:
            code = "role_not_allowed" if _role(user) not in rule.allowed_roles else "actor_not_assigned"
            block(code, str(error.messages[0]), allowed_roles=sorted(rule.allowed_roles))
        if not reasons and rule.action == "assign_provider" and not readiness["requirements_complete"]:
            block("documents_incomplete", "Required documents are incomplete.")
        if not reasons and rule.action == "request_missing_documents" and not readiness["documents"]:
            block("no_uploadable_requirements", "This service has no uploadable document requirements.")
        if not reasons and rule.action == "resume_review":
            unresolved = unresolved_missing_request_types(order)
            if unresolved is None:
                block("missing_request_invalid", "No valid missing-document request exists.")
            elif unresolved:
                block(
                    "requested_documents_pending",
                    f"Requested documents still need upload: {', '.join(unresolved)}.",
                    document_types=list(unresolved),
                )
        if not reasons and rule.action in {"mark_ready_for_delivery", "complete_order"} and not readiness["requirements_complete"]:
            block("documents_incomplete", "Required documents are incomplete.")
        if not reasons and rule.action == "complete_order" and _role(user) != UserRole.ADMIN:
            latest_final = (
                order.documents.filter(is_deleted=False, is_final_document=True).order_by("-created_at", "-pk").first()
            )
            if latest_final is None or not latest_final.is_verified:
                block("final_result_unverified", "A verified final result is required before completion.")
        options.append({
            "to_status": rule.to_status,
            "action": rule.action,
            "channel": (
                "status" if rule.generic_status_update else
                "provider_status" if rule.action.startswith("provider_") else "dedicated"
            ),
            "available": not reasons,
            "blocked_reasons": reasons,
            "blocked": blocked,
            "reason_required": rule.reason_required,
        })
    return options


def _can_assign_provider(*, user, order):
    if not (_has_perm(user, "orders.assign_order") or is_partner_admin(user)):
        return False
    if not _can_transition(user=user, order=order, target_status=OrderStatus.ASSIGNED):
        return False

    return evaluate_order_requirements(order)["requirements_complete"]


def get_order_allowed_actions(*, user, order, can_view=None):
    role = _role(user)
    # Pass can_view=True from list serializers to skip the extra DB existence check —
    # the queryset already guarantees visibility.
    if can_view is None:
        can_view = bool(user and user.is_authenticated and can_view_order(user, order))
    readiness = evaluate_order_requirements(order) if can_view else None
    workflow_transitions = _workflow_transitions(user=user, order=order, readiness=readiness) if can_view else []
    status_transitions = [
        option["to_status"] for option in workflow_transitions
        if option["available"] and option["channel"] in {"status", "provider_status"}
    ]
    available_actions = {option["action"] for option in workflow_transitions if option["available"]}
    # A waiting order whose open request names no uploadable document cannot be
    # answered by the customer; only staff recovery can move it.
    missing_request_valid = None
    if can_view and order.status == OrderStatus.WAITING_CUSTOMER:
        missing_request_valid = unresolved_missing_request_types(order) is not None

    can_add_internal_note = can_view and (
        ((role in {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT} or is_partner_operational_user(user)) and (_has_perm(user, "orders.review_order") or is_partner_operational_user(user)))
        or role == UserRole.PROVIDER
        or is_provider_user(user)
    )

    return {
        "can_view": can_view,
        "available_status_transitions": status_transitions,
        "workflow_transitions": workflow_transitions,
        "readiness": readiness,
        "can_cancel": can_view and _can_cancel(user=user, order=order),
        "can_upload_customer_document": can_view and role == UserRole.CUSTOMER and order.status in CUSTOMER_UPLOAD_STATUSES,
        "can_view_missing_documents_form": can_view and role == UserRole.CUSTOMER and order.status == OrderStatus.WAITING_CUSTOMER,
        "missing_document_request_valid": missing_request_valid,
        "can_recover_missing_document_request": bool(
            missing_request_valid is False
            and role in {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT}
            and _has_perm(user, "orders.request_missing_documents")
            and _can_transition(user=user, order=order, target_status=OrderStatus.UNDER_REVIEW)
        ),
        "can_submit_rating": can_view and role == UserRole.CUSTOMER and order.status == OrderStatus.COMPLETED and not hasattr(order, "rating"),
        "can_request_documents": "request_missing_documents" in available_actions
        and (_has_perm(user, "orders.request_missing_documents") or is_partner_operational_user(user)),
        "can_assign_provider": "assign_provider" in available_actions and _can_assign_provider(user=user, order=order),
        "can_add_internal_note": can_add_internal_note,
        "can_add_customer_note": can_view
        and (role in {UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT} or is_partner_operational_user(user))
        and (_has_perm(user, "orders.review_order") or is_partner_operational_user(user)),
        "can_verify_documents": can_view and (_has_perm(user, "documents.verify_document") or is_partner_operational_user(user)),
        "can_send_manual_notification": can_view and _has_perm(user, "notifications.send_manual_notification"),
        "can_reject": can_view and (_has_perm(user, "orders.reject_order") or is_partner_operational_user(user)) and _can_transition(user=user, order=order, target_status=OrderStatus.REJECTED),
        "can_complete": "complete_order" in available_actions
        and (_has_perm(user, "orders.manage_order_workflow") or is_partner_operational_user(user)),
        "can_upload_final_document": can_view
        and (role == UserRole.PROVIDER or is_provider_user(user) or _has_perm(user, "documents.upload_final_document"))
        and "mark_ready_for_delivery" in available_actions,
    }
