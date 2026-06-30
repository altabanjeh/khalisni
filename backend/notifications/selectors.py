from django.db.models import Q

from notifications.models import Notification
from orders.selectors import get_orders_for_user, get_reviewable_orders_for_user


def get_notifications_for_user(user):
    """
    Apply the production matrix visibility rules for the notification center.

    Clients see their own notifications, providers and employees see the
    notifications tied to orders they are allowed to work on, and admins see
    the full stream.
    """
    queryset = Notification.objects.select_related("recipient", "actor", "order", "template").filter(is_deleted=False)

    if not user or not user.is_authenticated:
        return queryset.none()

    role = (getattr(user, "role", "") or "").lower()
    if role == "admin":
        return queryset
    if role == "customer":
        return queryset.filter(recipient=user)
    if role in {"employee", "support"}:
        related_order_ids = get_reviewable_orders_for_user(user).values("pk")
        return queryset.filter(Q(recipient=user) | Q(order_id__in=related_order_ids)).distinct()
    if role == "provider":
        related_order_ids = get_orders_for_user(user).values("pk")
        return queryset.filter(Q(recipient=user) | Q(order_id__in=related_order_ids)).distinct()
    return queryset.none()
