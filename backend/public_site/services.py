from accounts.models import CustomUser
from notifications.models import Notification
from notifications.utils import create_notification
from public_site.models import MissingServiceRequest


def get_missing_service_request_recipients():
    recipients = list(
        CustomUser.objects.filter(
            role__in=[CustomUser.Role.ADMIN, CustomUser.Role.SUPPORT],
            is_active=True,
        ).order_by("full_name")
    )
    if recipients:
        return recipients

    return list(
        CustomUser.objects.filter(
            role__in=[CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE],
            is_active=True,
        ).order_by("full_name")
    )


def notify_missing_service_request_created(*, missing_request, actor=None):
    notifications = []
    title = f"طلب خدمة غير موجودة: {missing_request.service_name}"
    requester_label = (
        missing_request.requester_name
        or getattr(missing_request.created_by_user, "full_name", "")
        or "زائر الموقع"
    )
    message = (
        f"تم استلام طلب جديد برقم {missing_request.request_number} "
        f"من {requester_label}. راجع الطلب وعيّن مسؤول المتابعة."
    )

    for recipient in get_missing_service_request_recipients():
        notifications.append(
            create_notification(
                user=recipient,
                actor=actor,
                title=title,
                message=message,
                template_key="missing_service_request_created",
                context_data={
                    "request_number": missing_request.request_number,
                    "service_name": missing_request.service_name,
                    "request_status": missing_request.get_status_display(),
                },
                notification_type=Notification.NotificationType.SUPPORT,
            )
        )

    return notifications


def notify_missing_service_request_assigned(*, missing_request, actor=None):
    if not missing_request.assigned_to_id or not missing_request.assigned_to.is_active:
        return None

    return create_notification(
        user=missing_request.assigned_to,
        actor=actor,
        title=f"تم تعيين طلب خدمة لك: {missing_request.request_number}",
        message=f"تم تعيين طلب {missing_request.service_name} إليك للمتابعة.",
        template_key="missing_service_request_assigned",
        context_data={
            "request_number": missing_request.request_number,
            "service_name": missing_request.service_name,
            "request_status": missing_request.get_status_display(),
        },
        notification_type=Notification.NotificationType.SUPPORT,
    )
