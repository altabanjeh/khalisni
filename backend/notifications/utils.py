import re

from django.conf import settings

from notifications.event_map import ALLOWED_TEMPLATE_PLACEHOLDERS
from notifications.models import Notification, NotificationTemplate


PLACEHOLDER_PATTERN = re.compile(r"{{[^}]+}}")


def _safe_context_data(context_data):
    return {key: "" if value is None else str(value) for key, value in (context_data or {}).items()}


def validate_template_placeholders(text):
    normalized_text = str(text or "")
    for placeholder in PLACEHOLDER_PATTERN.findall(normalized_text):
        if placeholder not in ALLOWED_TEMPLATE_PLACEHOLDERS:
            raise ValueError(f"Unsupported placeholder: {placeholder}")
    return normalized_text


def render_notification_text(text, *, context_data):
    rendered = validate_template_placeholders(text)
    safe_context = _safe_context_data(context_data)

    for placeholder in ALLOWED_TEMPLATE_PLACEHOLDERS:
        variable_name = placeholder[2:-2].strip()
        if variable_name not in safe_context:
            raise ValueError(f"Missing required variable: {variable_name}")
        rendered = rendered.replace(placeholder, safe_context[variable_name])

    return rendered


def render_notification_template(*, template, context_data):
    safe_context = _safe_context_data(context_data)
    return {
        "title": render_notification_text(template.title_ar or template.title_en or template.key, context_data=safe_context),
        "message": render_notification_text(template.message_ar or template.message_en or template.key, context_data=safe_context),
    }


def is_channel_configured(channel):
    if channel == Notification.Channel.SYSTEM:
        return True

    settings_map = {
        Notification.Channel.EMAIL: getattr(settings, "NOTIFICATION_EMAIL_ENABLED", False),
        Notification.Channel.SMS: getattr(settings, "NOTIFICATION_SMS_ENABLED", False),
        Notification.Channel.WHATSAPP: getattr(settings, "NOTIFICATION_WHATSAPP_ENABLED", False),
    }
    return bool(settings_map.get(channel, False))


def create_notification(
    *,
    user,
    title,
    message,
    order=None,
    target_service=None,
    actor=None,
    channel=Notification.Channel.SYSTEM,
    status=None,
    template=None,
    template_key="",
    context_data=None,
    provider_response=None,
    notification_type=None,
):
    if status is None:
        status = Notification.Status.SENT if channel == Notification.Channel.SYSTEM else Notification.Status.PENDING

    response_payload = provider_response
    if response_payload is None and channel != Notification.Channel.SYSTEM and not is_channel_configured(channel):
        response_payload = {"detail": "External notification channel is not configured. Record stored only."}

    return Notification.objects.create(
        recipient=user,
        actor=actor,
        order=order,
        target_service=target_service,
        notification_type=notification_type or (Notification.NotificationType.ORDER if order else Notification.NotificationType.SYSTEM),
        channel=channel,
        title=title,
        message=message,
        template=template,
        template_key=template_key,
        context_data=context_data or {},
        recipient_email=getattr(user, "email", "") or "",
        recipient_phone=getattr(user, "phone", "") or "",
        status=status,
        provider_response=response_payload,
    )


def get_active_templates_for_key(template_key):
    return NotificationTemplate.objects.filter(key=template_key, is_active=True).order_by("channel", "template_id")
