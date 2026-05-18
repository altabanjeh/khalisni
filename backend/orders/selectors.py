from django.db.models import Prefetch, Q

from organizations.selectors import enforce_organization_scope, is_customer_user, is_platform_super_admin, is_provider_user
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

    if is_platform_super_admin(user):
        return queryset
    if is_customer_user(user):
        return queryset.filter(customer=user)
    if is_provider_user(user):
        return queryset.filter(
            Q(assigned_provider__user=user)
            | Q(assigned_provider_organization__memberships__user=user, assigned_provider_organization__memberships__is_active=True)
        ).distinct()
    return enforce_organization_scope(queryset, user=user, organization_field="organization", branch_field="branch").distinct()


def get_reviewable_orders_for_user(user):
    queryset = get_orders_for_user(user)
    if is_platform_super_admin(user):
        return queryset
    if not is_customer_user(user) and not is_provider_user(user):
        return enforce_organization_scope(
            queryset.filter(
            Q(status__in=EMPLOYEE_REVIEWABLE_STATUSES)
            | Q(assigned_employee=user)
            | Q(
                assignment_history__assignment_type="employee",
                assignment_history__assigned_to=user,
            )
        ),
            user=user,
            organization_field="organization",
            branch_field="branch",
        ).distinct()
    return queryset.none()


def can_view_order(user, order):
    return get_orders_for_user(user).filter(pk=order.pk).exists()
