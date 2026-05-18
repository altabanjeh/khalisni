class PkAsIdMixin:
    """Inject an `id` key equal to the instance's PK into the serialized output.

    Needed for models that use a custom-named primary key (e.g. notification_id,
    service_id) so that mobile/frontend code can rely on a consistent `id` field.
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = instance.pk
        return data
