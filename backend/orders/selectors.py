from django.db.models import Prefetch, Q

from orders.models import Order
from services.models import ServiceRequiredDocument


EMPLOYEE_REVIEWABLE_STATUSES = {
    Order.Status.NEW,
    Order.Status.UNDER_REVIEW,
    Order.Status.WAITING_CUSTOMER,
    Order.Status.WAITING_GOVERNMENT,
    Order.Status.READY_FOR_DELIVERY,
}


def get_orders_for_user(user):
    queryset = Order.objects.select_related(
        "customer",
        "service",
        "service__category",
        "assigned_provider",
        "assigned_provider__user",
        "assigned_employee",
        "assigned_by",
    ).prefetch_related(
        "documents",
        "status_logs",
        "notes__user",
        Prefetch(
            "service__document_requirements",
            queryset=ServiceRequiredDocument.objects.filter(is_active=True, is_required=True).only("document_type"),
            to_attr="_active_required_docs",
        ),
    )

    if not user or not user.is_authenticated:
        return queryset.none()

    role = (getattr(user, "role", "") or "").lower()
    if role == "admin":
        return queryset
    if role == "customer":
        return queryset.filter(customer=user)
    if role == "provider":
        return queryset.filter(assigned_provider__user=user)
    if role in {"employee", "support"}:
        return queryset.filter(
            Q(status__in=EMPLOYEE_REVIEWABLE_STATUSES)
            | Q(assigned_employee=user)
            | Q(
                assignment_history__assignment_type="employee",
                assignment_history__assigned_to=user,
            )
        ).distinct()
    return queryset.none()


def get_reviewable_orders_for_user(user):
    queryset = get_orders_for_user(user)
    role = (getattr(user, "role", "") or "").lower()
    if role == "admin":
        return queryset
    if role in {"employee", "support"}:
        return queryset.filter(
            Q(status__in=EMPLOYEE_REVIEWABLE_STATUSES)
            | Q(assigned_employee=user)
            | Q(
                assignment_history__assignment_type="employee",
                assignment_history__assigned_to=user,
            )
        ).distinct()
    return queryset.none()


def can_view_order(user, order):
    return get_orders_for_user(user).filter(pk=order.pk).exists()
