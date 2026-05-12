import re

from rest_framework import serializers

from notifications.event_map import ALLOWED_TEMPLATE_PLACEHOLDERS
from notifications.models import Notification, NotificationTemplate


PLACEHOLDER_PATTERN = re.compile(r"{{[^}]+}}")


def _validate_safe_template_text(value):
    text = str(value or "")
    lowered = text.lower()
    if "<script" in lowered or "<" in text or ">" in text:
        raise serializers.ValidationError("HTML and script tags are not allowed in notification templates.")
    for token in PLACEHOLDER_PATTERN.findall(text):
        if token not in ALLOWED_TEMPLATE_PLACEHOLDERS:
            raise serializers.ValidationError(f"Unsupported placeholder: {token}")
    return text


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.CharField(source="recipient.full_name", read_only=True)
    actor_name = serializers.CharField(source="actor.full_name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Notification
        fields = "__all__"


class ManualNotificationSerializer(serializers.Serializer):
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=NotificationTemplate.objects.filter(is_active=True, channel=Notification.Channel.SYSTEM)
    )

    def validate_template_id(self, value):
        if not value.is_active:
            raise serializers.ValidationError("The selected notification template is not active.")
        if value.channel != Notification.Channel.SYSTEM:
            raise serializers.ValidationError("Employees may send only in-app notification templates.")
        return value


class NotificationAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


class NotificationTemplateSerializer(serializers.ModelSerializer):
    available_placeholders = serializers.SerializerMethodField()

    class Meta:
        model = NotificationTemplate
        fields = (
            "template_id",
            "key",
            "channel",
            "title_ar",
            "title_en",
            "message_ar",
            "message_en",
            "is_active",
            "created_at",
            "updated_at",
            "available_placeholders",
        )
        read_only_fields = ("template_id", "created_at", "updated_at", "available_placeholders")

    def get_available_placeholders(self, obj):
        return sorted(ALLOWED_TEMPLATE_PLACEHOLDERS)

    def validate_title_ar(self, value):
        return _validate_safe_template_text(value)

    def validate_title_en(self, value):
        return _validate_safe_template_text(value)

    def validate_message_ar(self, value):
        return _validate_safe_template_text(value)

    def validate_message_en(self, value):
        return _validate_safe_template_text(value)


class EmployeeNotificationTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationTemplate
        fields = ("template_id", "key", "channel", "title_ar", "message_ar")


class NotificationTemplatePreviewSerializer(serializers.Serializer):
    title_ar = serializers.CharField(required=False, allow_blank=True)
    title_en = serializers.CharField(required=False, allow_blank=True)
    message_ar = serializers.CharField(required=False, allow_blank=True)
    message_en = serializers.CharField(required=False, allow_blank=True)

    def validate_title_ar(self, value):
        return _validate_safe_template_text(value)

    def validate_title_en(self, value):
        return _validate_safe_template_text(value)

    def validate_message_ar(self, value):
        return _validate_safe_template_text(value)

    def validate_message_en(self, value):
        return _validate_safe_template_text(value)
