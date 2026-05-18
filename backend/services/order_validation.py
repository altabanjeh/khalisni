from dataclasses import dataclass, field

from django.core.exceptions import ValidationError

from orders.models import Order
from services.models import ServiceRelation


COMPLETED_PREREQUISITE_STATUSES = {
    Order.Status.COMPLETED,
    Order.Status.ARCHIVED,
}


@dataclass
class OrderPrerequisiteCheck:
    blocking_relations: list = field(default_factory=list)
    warning_messages: list = field(default_factory=list)
    relation_statuses: list = field(default_factory=list)

    @property
    def warnings(self):
        return self.warning_messages


def get_completed_service_ids_for_customer(customer):
    if not getattr(customer, "pk", None):
        return set()

    return set(
        Order.objects.filter(
            customer=customer,
            status__in=COMPLETED_PREREQUISITE_STATUSES,
        ).values_list("service_id", flat=True)
    )


def get_active_prerequisite_relations_for_service(service):
    return ServiceRelation.objects.filter(
        target_service=service,
        relation_type=ServiceRelation.RelationType.PREREQUISITE,
        is_active=True,
    ).select_related("source_service", "target_service")


def evaluate_order_prerequisites(*, customer, service):
    completed_service_ids = get_completed_service_ids_for_customer(customer)
    check = OrderPrerequisiteCheck()

    for relation in get_active_prerequisite_relations_for_service(service):
        is_completed = relation.source_service_id in completed_service_ids
        service_state = {
            "relation_id": relation.pk,
            "source_service_id": relation.source_service_id,
            "source_service_name": relation.source_service.name_ar,
            "target_service_id": relation.target_service_id,
            "target_service_name": relation.target_service.name_ar,
            "is_required": relation.is_required,
            "is_completed": is_completed,
            "message_to_customer": relation.message_to_customer,
        }
        check.relation_statuses.append(service_state)

        if is_completed:
            continue

        if relation.is_required:
            check.blocking_relations.append(relation)
            continue

        warning_message = relation.message_to_customer.strip() or (
            f"You may need to complete {relation.source_service.name_ar} before {service.name_ar}."
        )
        check.warning_messages.append(warning_message)

    return check


def validate_order_prerequisites(*, customer, service):
    check = evaluate_order_prerequisites(customer=customer, service=service)
    if not check.blocking_relations:
        return check

    blocking_names = [relation.source_service.name_ar for relation in check.blocking_relations]
    detail_message = (
        f"This service requires completed prerequisite services first: {', '.join(blocking_names)}."
    )
    raise ValidationError(
        {
            "service": detail_message,
            "detail": detail_message,
            "prerequisites": [
                {
                    "service_id": relation.source_service_id,
                    "service_name": relation.source_service.name_ar,
                    "message_to_customer": relation.message_to_customer,
                }
                for relation in check.blocking_relations
            ],
        }
    )
