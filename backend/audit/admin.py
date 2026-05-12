from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "entity_type", "entity_id", "user", "status", "source")
    list_filter = ("action", "status", "source", "created_at")
    search_fields = ("entity_type", "entity_id", "entity_name", "message", "error_message", "request_id")
    readonly_fields = (
        "user",
        "action",
        "source",
        "status",
        "entity_type",
        "entity_id",
        "entity_name",
        "old_values",
        "new_values",
        "changed_fields",
        "message",
        "error_message",
        "request_id",
        "ip_address",
        "user_agent",
        "created_at",
    )
