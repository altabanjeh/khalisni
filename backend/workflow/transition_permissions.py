from django.core.exceptions import ValidationError

from core.choices import OrderStatus, UserRole
from organizations.selectors import is_provider_user
from workflow.rules import get_transition_rule


def _role(actor):
    return (getattr(actor, "role", "") or "").lower()


def _ensure_actor_matches_transition(actor, order):
    role = _role(actor)
    if role == UserRole.CUSTOMER and order.customer_id != actor.id:
        raise ValidationError({"detail": "Only the order customer can perform this action."})
    if role == UserRole.PROVIDER or is_provider_user(actor):
        can_access = bool(order.assigned_provider and order.assigned_provider.user_id == actor.id)
        if not can_access and order.assigned_provider_organization_id:
            can_access = order.assigned_provider_organization.memberships.filter(user=actor, is_active=True).exists()
        if not can_access:
            raise ValidationError({"detail": "Only the assigned provider can perform this action."})
    if role in {UserRole.EMPLOYEE, UserRole.SUPPORT}:
        assigned_employee_id = getattr(order, "assigned_employee_id", None)
        if assigned_employee_id and assigned_employee_id != actor.id and order.status != OrderStatus.NEW:
            raise ValidationError({"detail": "Only the assigned employee can perform this action."})


def assert_order_transition_allowed(*, actor, order, new_status):
    role = _role(actor)
    transition_rule = get_transition_rule(order.status, new_status)
    allowed_roles = transition_rule.allowed_roles if transition_rule else set()
    if role not in allowed_roles:
        raise ValidationError(
            {"detail": f"Role '{role or 'anonymous'}' cannot move order from {order.status} to {new_status}."}
        )
    _ensure_actor_matches_transition(actor, order)


def assert_can_cancel_order(*, actor, order):
    role = _role(actor)

    if role == UserRole.CUSTOMER:
        if order.customer_id != actor.id:
            raise ValidationError({"detail": "Only the order customer can cancel this order."})
        if order.status != OrderStatus.NEW:
            raise ValidationError({"detail": "Customers may cancel only newly submitted orders."})
        return

    if role in {UserRole.EMPLOYEE, UserRole.SUPPORT}:
        if order.status not in {OrderStatus.UNDER_REVIEW, OrderStatus.WAITING_CUSTOMER}:
            raise ValidationError({"detail": "Employees may cancel only review-stage orders."})
        assigned_employee_id = getattr(order, "assigned_employee_id", None)
        if assigned_employee_id and assigned_employee_id != actor.id:
            raise ValidationError({"detail": "Only the assigned employee can cancel this order."})
        return

    if role == UserRole.ADMIN:
        if order.is_final_state:
            raise ValidationError({"detail": "Finalized orders cannot be cancelled."})
        return

    raise ValidationError({"detail": "You are not allowed to cancel this order."})
