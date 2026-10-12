"""Serialize order workflow actions and keep failed attempts atomic.

Every mutating workflow service runs inside one transaction holding a row lock
on its order and works on freshly loaded state. A request that was prepared
against an older copy of the order (second tab, double click, another staff
member acting first) is therefore validated against what is true now, and a
failure part-way through leaves no status, timeline, notification or
assignment rows behind.
"""

import threading
from functools import wraps

from django.db import transaction

from audit.utils import create_audit_log
from orders.models import Order

_state = threading.local()


def _held():
    if not hasattr(_state, "held"):
        _state.held = set()
        _state.deferred_audits = []
    return _state.held


def defer_audit_log(**kwargs):
    """Record an audit row that must survive the rollback of a refused action."""
    if _held():
        _state.deferred_audits.append(kwargs)
    else:
        create_audit_log(**kwargs)


def lock_order(order):
    """Lock the order row and reload the instance in place."""
    list(Order.objects.select_for_update().filter(pk=order.pk).values_list("pk", flat=True))
    order.refresh_from_db()
    order._prefetched_objects_cache = {}
    return order


def locked_order_action(get_order=None):
    """Decorate a keyword-only workflow service so it runs under the order lock."""

    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kwargs):
            order = get_order(kwargs) if get_order else kwargs["order"]
            held = _held()
            if order.pk in held:
                return function(*args, **kwargs)
            outermost = not held
            held.add(order.pk)
            try:
                with transaction.atomic():
                    lock_order(order)
                    return function(*args, **kwargs)
            finally:
                held.discard(order.pk)
                if outermost:
                    pending, _state.deferred_audits = _state.deferred_audits, []
                    for audit_kwargs in pending:
                        create_audit_log(**audit_kwargs)

        return wrapper

    return decorator
