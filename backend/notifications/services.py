from django.db import transaction

from accounts.models import CustomUser
from audit.utils import create_audit_log
from notifications.event_map import NOTIFICATION_EVENT_MAP
from notifications.models import Notification
from notifications.utils import create_notification, get_active_templates_for_key, render_notification_template


def _resolve_recipients(*, recipient_kind, order=None, document=None, payment=None):
    if recipient_kind == "customer":
        recipient = getattr(order, "customer", None)
        return [recipient] if recipient and recipient.is_active else []

    if recipient_kind == "provider":
        provider_profile = getattr(order, "assigned_provider", None)
        recipient = getattr(provider_profile, "user", None)
        return [recipient] if recipient and recipient.is_active else []

    if recipient_kind == "assigned_employee":
        recipient = getattr(order, "assigned_employee", None)
        return [recipient] if recipient and recipient.is_active else []

    if recipient_kind == "document_uploader":
        recipient = getattr(document, "uploaded_by", None)
        return [recipient] if recipient and recipient.is_active else []

    if recipient_kind == "admins":
        return list(CustomUser.objects.filter(role=CustomUser.Role.ADMIN, is_active=True))

    return []


def _build_context_data(*, order=None, document=None, payment=None, extra_context=None):
    context_data = {
        "order_number": getattr(order, "order_number", "") or "",
        "service_name": getattr(getattr(order, "service", None), "name_ar", "") or "",
        "customer_name": getattr(getattr(order, "customer", None), "full_name", "") or "",
        "status_label": "",
    }

    if payment is not None:
        context_data["status_label"] = payment.get_status_display()
    elif order is not None and getattr(order, "status", None):
        context_data["status_label"] = order.get_status_display()

    if extra_context:
        for key, value in extra_context.items():
            context_data[key] = "" if value is None else value

    return context_data


def _fallback_notification_content(*, event, recipient_kind, context_data):
    title = event.fallback_title
    message_template = event.fallback_message

    if event.key == "provider_assigned" and recipient_kind == "provider":
        title = "New assigned order"
        message_template = "A new order {{order_number}} was assigned to you."

    rendered = render_notification_template(
        template=type(
            "FallbackTemplate",
            (),
            {
                "title_ar": title,
                "title_en": "",
                "message_ar": message_template,
                "message_en": "",
                "key": event.template_key,
            },
        )(),
        context_data=context_data,
    )
    return rendered["title"], rendered["message"]


def _dedupe_exists(*, recipient, order, event_key, channel, dedupe_key):
    if not dedupe_key:
        return False

    queryset = Notification.objects.filter(
        recipient=recipient,
        template_key=event_key,
        channel=channel,
        context_data__dedupe_key=dedupe_key,
    )
    if order is not None:
        queryset = queryset.filter(order=order)
    return queryset.exists()


def send_notification_event(*, event_key, order=None, actor=None, document=None, payment=None, request=None, dedupe_key="", extra_context=None):
    event = NOTIFICATION_EVENT_MAP[event_key]
    context_data = _build_context_data(order=order, document=document, payment=payment, extra_context=extra_context)
    templates = list(get_active_templates_for_key(event.template_key))
    created_notifications = []

    with transaction.atomic():
        for recipient_kind in event.recipients:
            recipients = _resolve_recipients(
                recipient_kind=recipient_kind,
                order=order,
                document=document,
                payment=payment,
            )
            for recipient in recipients:
                if templates:
                    template_sources = templates
                else:
                    template_sources = [None]

                for template in template_sources:
                    channel = template.channel if template else Notification.Channel.SYSTEM
                    if _dedupe_exists(
                        recipient=recipient,
                        order=order,
                        event_key=event.key,
                        channel=channel,
                        dedupe_key=dedupe_key,
                    ):
                        create_audit_log(
                            request=request,
                            user=actor,
                            action="notification_event_skipped",
                            entity_type="Notification",
                            entity_id=f"{event.key}:{getattr(order, 'pk', '')}:{recipient.pk}",
                            new_value={
                                "event_key": event.key,
                                "recipient_id": recipient.pk,
                                "channel": channel,
                                "dedupe_key": dedupe_key,
                            },
                        )
                        continue

                    try:
                        if template:
                            rendered = render_notification_template(template=template, context_data=context_data)
                            title = rendered["title"]
                            message = rendered["message"]
                        else:
                            title, message = _fallback_notification_content(
                                event=event,
                                recipient_kind=recipient_kind,
                                context_data=context_data,
                            )
                    except ValueError as exc:
                        create_audit_log(
                            request=request,
                            user=actor,
                            action="notification_event_failed",
                            entity_type="Notification",
                            entity_id=f"{event.key}:{getattr(order, 'pk', '')}:{recipient.pk}",
                            new_value={
                                "event_key": event.key,
                                "recipient_id": recipient.pk,
                                "error": str(exc),
                                "dedupe_key": dedupe_key,
                            },
                        )
                        continue

                    notification = create_notification(
                        user=recipient,
                        actor=actor,
                        order=order,
                        title=title,
                        message=message,
                        channel=channel,
                        template=template,
                        template_key=event.key,
                        context_data={**context_data, "event_key": event.key, "dedupe_key": dedupe_key},
                    )
                    created_notifications.append(notification)
                    create_audit_log(
                        request=request,
                        user=actor,
                        action=event.audit_action,
                        entity_type="Notification",
                        entity_id=notification.pk,
                        new_value={
                            "event_key": event.key,
                            "recipient_id": recipient.pk,
                            "channel": notification.channel,
                            "status": notification.status,
                            "dedupe_key": dedupe_key,
                        },
                    )

    return created_notifications


def notify_client(*, order, title, message, actor=None, request=None, template_key="manual_order_update", dedupe_key=""):
    return [
        create_notification(
            user=order.customer,
            actor=actor,
            order=order,
            title=title,
            message=message,
            template_key=template_key,
            context_data={"dedupe_key": dedupe_key, "event_key": template_key},
        )
    ]


def notify_employee(*, employee, order, title, message, actor=None, request=None, template_key="manual_employee_update", dedupe_key=""):
    return [
        create_notification(
            user=employee,
            actor=actor,
            order=order,
            title=title,
            message=message,
            template_key=template_key,
            context_data={"dedupe_key": dedupe_key, "event_key": template_key},
        )
    ]


def notify_provider(*, provider_profile, order, title, message, actor=None, request=None, template_key="manual_provider_update", dedupe_key=""):
    return [
        create_notification(
            user=provider_profile.user,
            actor=actor,
            order=order,
            title=title,
            message=message,
            template_key=template_key,
            context_data={"dedupe_key": dedupe_key, "event_key": template_key},
        )
    ]


def notify_admin(*, order, title, message, actor=None, request=None, template_key="manual_admin_update", dedupe_key=""):
    notifications = []
    for admin in CustomUser.objects.filter(role=CustomUser.Role.ADMIN, is_active=True):
        notifications.append(
            create_notification(
                user=admin,
                actor=actor,
                order=order,
                title=title,
                message=message,
                template_key=template_key,
                context_data={"dedupe_key": dedupe_key, "event_key": template_key},
            )
        )
    return notifications


def send_manual_order_notification(*, order, actor, template, request=None):
    rendered = render_notification_template(
        template=template,
        context_data=_build_context_data(order=order, extra_context={"status_label": order.get_status_display()}),
    )
    notification = create_notification(
        user=order.customer,
        actor=actor,
        order=order,
        title=rendered["title"],
        message=rendered["message"],
        channel=Notification.Channel.SYSTEM,
        template=template,
        template_key=template.key,
        context_data={"event_key": template.key, "dedupe_key": f"manual:{order.pk}:{template.pk}:{actor.pk}"},
    )
    create_audit_log(
        request=request,
        user=actor,
        action="send_manual_notification",
        entity_type="Notification",
        entity_id=notification.pk,
        new_value={
            "order_number": order.order_number,
            "recipient_id": order.customer_id,
            "template_id": template.pk,
            "template_key": template.key,
        },
    )
    return notification
