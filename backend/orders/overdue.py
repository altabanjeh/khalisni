"""Late-order alert for supervisors (client sitemap: notify the supervisor of a late order).

An order is late when it has an expected delivery date (services with a
"confirmed after review" duration have none, so they are never "late"), the
date is in the past, and the order is not finished. The assigned employee and
the admins, the customer and the assigned provider each get one in-app
notification per order and expected date (CN-MAP-05); a new
expected date can alert again. Run ``manage.py notify_overdue_orders`` daily
(cron example in docs/operations/PRODUCTION_RELEASE_RUNBOOK.md).
"""

from django.utils import timezone

from notifications.services import send_notification_event
from orders.models import Order

FINISHED = {
    Order.Status.COMPLETED,
    Order.Status.REJECTED,
    Order.Status.CANCELLED,
    Order.Status.ARCHIVED,
}


def overdue_orders(today=None):
    today = today or timezone.localdate()
    return (
        Order.objects.exclude(status__in=FINISHED)
        .filter(expected_delivery_date__isnull=False, expected_delivery_date__lt=today)
        .select_related("customer", "service", "assigned_employee")
        .order_by("expected_delivery_date", "pk")
    )


def notify_overdue_orders(*, today=None, dry_run=False):
    """Return the late orders; notify staff unless ``dry_run``. Repeat runs do not duplicate alerts."""
    orders = list(overdue_orders(today))
    if not dry_run:
        for order in orders:
            expected = order.expected_delivery_date.isoformat()
            # Supervisors (assigned employee + admins), the customer, and the
            # assigned provider -- client sitemap CN-MAP-05.
            events = ["order_overdue", "order_overdue_customer"]
            if order.assigned_provider_id:
                events.append("order_overdue_provider")
            for event_key in events:
                send_notification_event(
                    event_key=event_key,
                    order=order,
                    dedupe_key=f"{event_key}:{order.pk}:{expected}",
                )
    return orders
