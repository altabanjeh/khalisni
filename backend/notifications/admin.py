from django.contrib import admin

from notifications.models import Notification, NotificationTemplate


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("notification_id", "recipient", "notification_type", "channel", "status", "is_read", "created_at")
    list_filter = ("notification_type", "channel", "status", "is_read", "created_at")
    search_fields = ("recipient__full_name", "recipient__email", "title", "message", "order__order_number")
    readonly_fields = (
        "recipient",
        "actor",
        "order",
        "recipient_email",
        "recipient_phone",
        "external_message_id",
        "provider_response",
        "queued_at",
        "sent_at",
        "delivered_at",
        "failed_at",
        "read_at",
        "created_at",
        "updated_at",
    )


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ("key", "title_ar", "channel", "is_active", "updated_at")
    list_filter = ("channel", "is_active")
    search_fields = ("key", "title_ar", "title_en", "message_ar", "message_en")
    readonly_fields = ("updated_at",)
