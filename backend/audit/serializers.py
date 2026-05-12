from rest_framework import serializers

from audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="pk", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    module = serializers.CharField(source="entity_type", read_only=True)

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "audit_id",
            "user_name",
            "user_role",
            "action",
            "module",
            "entity_type",
            "entity_id",
            "entity_name",
            "message",
            "status",
            "source",
            "old_values",
            "new_values",
            "changed_fields",
            "request_id",
            "ip_address",
            "user_agent",
            "created_at",
        )
