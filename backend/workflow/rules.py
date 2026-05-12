from dataclasses import dataclass

from core.choices import OrderStatus, UserRole


INTERNAL_ROLES = frozenset({UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.SUPPORT})


@dataclass(frozen=True)
class TransitionRule:
    from_status: str
    to_status: str
    action: str
    allowed_roles: frozenset[str]
    validation_checks: tuple[str, ...] = ()
    reason_required: bool = False
    notification_trigger: bool = False
    audit_required: bool = True
    generic_status_update: bool = False


WORKFLOW_TRANSITIONS = (
    TransitionRule(
        from_status=OrderStatus.NEW,
        to_status=OrderStatus.UNDER_REVIEW,
        action="start_review",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("internal_actor_required",),
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.NEW,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=frozenset({UserRole.ADMIN, UserRole.CUSTOMER}),
        validation_checks=("customer_owns_order",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.UNDER_REVIEW,
        to_status=OrderStatus.WAITING_CUSTOMER,
        action="request_missing_documents",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("note_required",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.UNDER_REVIEW,
        to_status=OrderStatus.ASSIGNED,
        action="assign_provider",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=(
            "provider_required",
            "required_documents_approved",
            "provider_approved",
            "provider_available",
            "provider_service_match",
        ),
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.UNDER_REVIEW,
        to_status=OrderStatus.REJECTED,
        action="reject_order",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("reason_required",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.UNDER_REVIEW,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("assigned_employee_or_unassigned",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.WAITING_CUSTOMER,
        to_status=OrderStatus.UNDER_REVIEW,
        action="resume_review",
        allowed_roles=INTERNAL_ROLES | frozenset({UserRole.CUSTOMER}),
        validation_checks=("all_missing_documents_uploaded",),
    ),
    TransitionRule(
        from_status=OrderStatus.WAITING_CUSTOMER,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("assigned_employee_or_unassigned",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.ASSIGNED,
        to_status=OrderStatus.IN_PROGRESS,
        action="provider_start_work",
        allowed_roles=frozenset({UserRole.PROVIDER}),
        validation_checks=("assigned_provider_only",),
    ),
    TransitionRule(
        from_status=OrderStatus.ASSIGNED,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.IN_PROGRESS,
        to_status=OrderStatus.WAITING_GOVERNMENT,
        action="provider_pause_for_government",
        allowed_roles=frozenset({UserRole.PROVIDER}),
        validation_checks=("assigned_provider_only",),
    ),
    TransitionRule(
        from_status=OrderStatus.IN_PROGRESS,
        to_status=OrderStatus.READY_FOR_DELIVERY,
        action="mark_ready_for_delivery",
        allowed_roles=INTERNAL_ROLES | frozenset({UserRole.PROVIDER}),
        validation_checks=("final_document_required", "required_documents_approved"),
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.IN_PROGRESS,
        to_status=OrderStatus.REJECTED,
        action="reject_order",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("reason_required",),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.IN_PROGRESS,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.WAITING_GOVERNMENT,
        to_status=OrderStatus.IN_PROGRESS,
        action="provider_resume_work",
        allowed_roles=frozenset({UserRole.PROVIDER}),
        validation_checks=("assigned_provider_only",),
    ),
    TransitionRule(
        from_status=OrderStatus.WAITING_GOVERNMENT,
        to_status=OrderStatus.READY_FOR_DELIVERY,
        action="mark_ready_for_delivery",
        allowed_roles=INTERNAL_ROLES | frozenset({UserRole.PROVIDER}),
        validation_checks=("final_document_required", "required_documents_approved"),
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.WAITING_GOVERNMENT,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.READY_FOR_DELIVERY,
        to_status=OrderStatus.UNDER_REVIEW,
        action="return_to_internal_review",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("reason_required",),
        reason_required=True,
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.READY_FOR_DELIVERY,
        to_status=OrderStatus.IN_PROGRESS,
        action="return_to_provider",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("assigned_provider_required", "reason_required"),
        reason_required=True,
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.READY_FOR_DELIVERY,
        to_status=OrderStatus.COMPLETED,
        action="complete_order",
        allowed_roles=INTERNAL_ROLES,
        validation_checks=("final_document_verified_or_admin_override",),
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.READY_FOR_DELIVERY,
        to_status=OrderStatus.CANCELLED,
        action="cancel_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        reason_required=True,
        notification_trigger=True,
    ),
    TransitionRule(
        from_status=OrderStatus.COMPLETED,
        to_status=OrderStatus.UNDER_REVIEW,
        action="reopen_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        validation_checks=("reason_required",),
        reason_required=True,
        notification_trigger=True,
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.COMPLETED,
        to_status=OrderStatus.ARCHIVED,
        action="archive_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.REJECTED,
        to_status=OrderStatus.ARCHIVED,
        action="archive_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        generic_status_update=True,
    ),
    TransitionRule(
        from_status=OrderStatus.CANCELLED,
        to_status=OrderStatus.ARCHIVED,
        action="archive_order",
        allowed_roles=frozenset({UserRole.ADMIN}),
        generic_status_update=True,
    ),
)


TRANSITION_RULE_MAP = {
    (rule.from_status, rule.to_status): rule
    for rule in WORKFLOW_TRANSITIONS
}


ALLOWED_ORDER_TRANSITIONS = {}
for rule in WORKFLOW_TRANSITIONS:
    ALLOWED_ORDER_TRANSITIONS.setdefault(rule.from_status, []).append(rule.to_status)
for status_value in OrderStatus.values:
    ALLOWED_ORDER_TRANSITIONS.setdefault(status_value, [])
ALLOWED_ORDER_TRANSITIONS = {
    status_value: tuple(next_statuses)
    for status_value, next_statuses in ALLOWED_ORDER_TRANSITIONS.items()
}


def get_allowed_order_transitions():
    return {status: tuple(next_statuses) for status, next_statuses in ALLOWED_ORDER_TRANSITIONS.items()}


def get_transition_rule(current_status, new_status):
    return TRANSITION_RULE_MAP.get((current_status, new_status))


_GENERIC_STATUS_UPDATE_TARGETS = {}
for _rule in WORKFLOW_TRANSITIONS:
    if _rule.generic_status_update:
        _GENERIC_STATUS_UPDATE_TARGETS.setdefault(_rule.from_status, []).append(_rule.to_status)
_GENERIC_STATUS_UPDATE_TARGETS = {k: tuple(v) for k, v in _GENERIC_STATUS_UPDATE_TARGETS.items()}


def get_generic_status_update_targets(current_status):
    return _GENERIC_STATUS_UPDATE_TARGETS.get(current_status, ())
