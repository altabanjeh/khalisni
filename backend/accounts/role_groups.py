from django.contrib.auth.models import Group, Permission
from django.db.utils import OperationalError, ProgrammingError

from core.choices import UserRole


ROLE_TO_GROUP_NAME = {
    UserRole.CUSTOMER: "client",
    UserRole.EMPLOYEE: "employee",
    UserRole.SUPPORT: "employee",
    UserRole.PROVIDER: "provider",
    UserRole.ADMIN: "admin",
}


ROLE_GROUP_NAMES = sorted(set(ROLE_TO_GROUP_NAME.values()))


GROUP_PERMISSION_MAP = {
    "client": {
        "orders.add_order",
        "orders.submit_order",
        "orders.cancel_order",
        "orders.view_order",
        "documents.add_document",
        "documents.view_document",
        "notifications.view_notification",
        "payment.add_payment",
        "payment.view_payment",
        "payment.create_payment_record",
        "payment.view_payment_status",
    },
    "employee": {
        "orders.view_order",
        "orders.review_order",
        "orders.request_missing_documents",
        "orders.cancel_order",
        "orders.reject_order",
        "orders.assign_order",
        "orders.manage_order_workflow",
        "orders.view_reports_dashboard",
        "documents.view_document",
        "documents.verify_document",
        "notifications.view_notification",
        "notifications.send_manual_notification",
    },
    "provider": {
        "orders.view_order",
        "orders.process_order",
        "documents.view_document",
        "documents.add_document",
        "documents.upload_final_document",
        "notifications.view_notification",
    },
}


def ensure_role_groups():
    groups = {}
    for group_name in ROLE_GROUP_NAMES:
        groups[group_name], _ = Group.objects.get_or_create(name=group_name)

    for group_name, permission_names in GROUP_PERMISSION_MAP.items():
        permissions = Permission.objects.filter(
            content_type__app_label__in=["accounts", "orders", "documents", "services", "notifications", "payment"],
            codename__in=[permission_name.split(".", 1)[1] for permission_name in permission_names],
        )
        groups[group_name].permissions.set(permissions)

    admin_permissions = Permission.objects.exclude(content_type__app_label__in={"contenttypes", "sessions"})
    groups["admin"].permissions.set(admin_permissions)
    return groups


def sync_user_role_group(user):
    if not getattr(user, "pk", None):
        return

    target_group_name = ROLE_TO_GROUP_NAME.get((getattr(user, "role", "") or "").lower())
    if not target_group_name:
        return

    try:
        groups = ensure_role_groups()
    except (OperationalError, ProgrammingError):
        return

    existing_role_groups = user.groups.filter(name__in=ROLE_GROUP_NAMES)
    user.groups.remove(*existing_role_groups.exclude(name=target_group_name))
    target_group = groups[target_group_name]
    if not user.groups.filter(pk=target_group.pk).exists():
        user.groups.add(target_group)
