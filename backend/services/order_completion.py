from audit.utils import create_audit_log
from notifications.models import Notification
from notifications.utils import create_notification
from services.models import ServiceRelation


SERVICE_RECOMMENDATION_TEMPLATE_KEY = "service_relation_recommendation"
SERVICE_RECOMMENDATION_TITLE = "Related service recommended"


def get_completion_recommendation_relations(service):
    return ServiceRelation.objects.filter(
        source_service=service,
        relation_type__in=[
            ServiceRelation.RelationType.RECOMMENDED_AFTER,
            ServiceRelation.RelationType.OPTIONAL_BUNDLE,
        ],
        is_active=True,
        target_service__is_active=True,
    ).select_related("source_service", "target_service")


def _recommendation_message(*, order, relation):
    custom_message = (relation.message_to_customer or "").strip()
    if custom_message:
        return custom_message

    return (
        f"Your {order.service.name_ar} order is completed. "
        f"You may also need {relation.target_service.name_ar}."
    )


def create_related_service_notifications(*, order, actor=None, request=None):
    created_notifications = []

    for relation in get_completion_recommendation_relations(order.service):
        duplicate_exists = Notification.objects.filter(
            recipient=order.customer,
            order=order,
            target_service=relation.target_service,
            template_key=SERVICE_RECOMMENDATION_TEMPLATE_KEY,
            is_read=False,
        ).exists()
        if duplicate_exists:
            continue

        dedupe_key = f"{SERVICE_RECOMMENDATION_TEMPLATE_KEY}:{order.pk}:{relation.target_service_id}"
        notification = create_notification(
            user=order.customer,
            actor=actor,
            order=order,
            target_service=relation.target_service,
            title=SERVICE_RECOMMENDATION_TITLE,
            message=_recommendation_message(order=order, relation=relation),
            template_key=SERVICE_RECOMMENDATION_TEMPLATE_KEY,
            context_data={
                "event_key": SERVICE_RECOMMENDATION_TEMPLATE_KEY,
                "dedupe_key": dedupe_key,
                "service_name": order.service.name_ar,
                "target_service_name": relation.target_service.name_ar,
            },
            notification_type=Notification.NotificationType.ORDER,
        )
        created_notifications.append(notification)
        create_audit_log(
            request=request,
            user=actor,
            action="create_service_relation_notification",
            entity_type="Notification",
            entity_id=notification.pk,
            new_value={
                "order_id": order.pk,
                "target_service_id": relation.target_service_id,
                "template_key": SERVICE_RECOMMENDATION_TEMPLATE_KEY,
            },
        )

    return created_notifications
