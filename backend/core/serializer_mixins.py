class PkAsIdMixin:
    """Inject an `id` key equal to the instance's PK into the serialized output.

    Needed for models that use a custom-named primary key (e.g. notification_id,
    service_id) so that mobile/frontend code can rely on a consistent `id` field.
    """

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["id"] = instance.pk
        return data


SOFT_DELETE_FIELDS = ("is_deleted", "deleted_at", "deleted_by", "delete_reason")


class SoftDeleteFieldsReadOnlyMixin:
    """Soft-delete state is server-owned.

    Deleting and restoring go through the guarded delete/restore actions
    (super-admin check, password, audit entry). Accepting these fields in a
    PATCH body would let any editor skip that guard.
    """

    def get_fields(self):
        fields = super().get_fields()
        for name in SOFT_DELETE_FIELDS:
            if name in fields:
                fields[name].read_only = True
        return fields
