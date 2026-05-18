from collections import deque

from django.core.exceptions import ValidationError


RELATION_TYPE_HELP_TEXT = {
    "prerequisite": "The customer should complete the source service before starting the target service.",
    "recommended_after": "Show the target service after the source service is completed.",
    "optional_bundle": "Offer the target service as an optional add-on related to the source service.",
    "alternative": "Present the target service as an alternative option to the source service.",
}


def ensure_required_prerequisite_not_circular(*, source_service_id, target_service_id, exclude_relation_id=None):
    """
    Prevent cycles only for active required prerequisite chains.

    Edge meaning:
    source_service -> target_service
    """
    from services.models import ServiceRelation

    if source_service_id == target_service_id:
        raise ValidationError({"target_service": "Source service and target service must be different."})

    queryset = ServiceRelation.objects.filter(
        relation_type=ServiceRelation.RelationType.PREREQUISITE,
        is_required=True,
        is_active=True,
    )
    if exclude_relation_id:
        queryset = queryset.exclude(pk=exclude_relation_id)
    queryset = queryset.values_list("source_service_id", "target_service_id")

    adjacency = {}
    for source_id, current_target_id in queryset:
        adjacency.setdefault(source_id, set()).add(current_target_id)

    visited = {target_service_id}
    queue = deque([(target_service_id, [target_service_id])])

    while queue:
        current_service_id, path = queue.popleft()
        for next_service_id in adjacency.get(current_service_id, set()):
            if next_service_id == source_service_id:
                cycle_path = path + [next_service_id]
                raise ValidationError(
                    {
                        "target_service": (
                            "This required prerequisite creates a circular dependency: "
                            + " -> ".join(str(item) for item in cycle_path)
                        )
                    }
                )
            if next_service_id in visited:
                continue
            visited.add(next_service_id)
            queue.append((next_service_id, path + [next_service_id]))


def relation_snapshot(relation):
    return {
        "source_service_id": relation.source_service_id,
        "target_service_id": relation.target_service_id,
        "relation_type": relation.relation_type,
        "is_required": relation.is_required,
        "message_to_customer": relation.message_to_customer,
        "is_active": relation.is_active,
        "created_by_id": relation.created_by_id,
    }
