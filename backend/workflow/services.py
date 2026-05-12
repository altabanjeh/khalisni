from django.core.exceptions import ValidationError

from core.choices import OrderStatus
from workflow.rules import ALLOWED_ORDER_TRANSITIONS


def validate_order_transition(current_status, new_status):
    """
    Enforce the canonical order transition map.
    """
    if new_status not in OrderStatus.values:
        raise ValidationError(f"Invalid order status: {new_status}")

    allowed_statuses = ALLOWED_ORDER_TRANSITIONS.get(current_status, ())
    if new_status not in allowed_statuses:
        raise ValidationError(f"Invalid status transition from {current_status} to {new_status}.")
