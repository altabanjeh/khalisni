from documents.models import Document
from orders.selectors import get_orders_for_user


def get_documents_for_user(user):
    """
    Restrict document visibility to the orders the caller may access.
    """
    queryset = Document.objects.select_related(
        "order",
        "order__customer",
        "order__assigned_provider__user",
        "order__assigned_employee",
        "uploaded_by",
        "verified_by",
    ).filter(is_deleted=False)

    if not user or not user.is_authenticated:
        return queryset.none()

    return queryset.filter(order_id__in=get_orders_for_user(user).values("pk"))
