from notifications.models import Notification


def get_notifications_for_user(user):
    """
    The notification centre (bell, unread count, read state) is personal.

    Every role sees and changes only the notifications addressed to it. Staff
    oversight of what was sent for an order uses the admin notification log,
    which is read-only with respect to the recipient's read state.
    """
    queryset = Notification.objects.select_related("recipient", "actor", "order", "template").filter(is_deleted=False)

    if not user or not user.is_authenticated:
        return queryset.none()
    return queryset.filter(recipient=user)
