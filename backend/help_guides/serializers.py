from django.contrib.auth.models import Permission
from rest_framework import serializers

from core.serializer_mixins import PkAsIdMixin
from help_guides.models import HelpGuide
from help_guides.screen_registry import HELP_SCREEN_REGISTRY, get_help_screen_label
from orders.models import Order


def _split_text_lines(value: str) -> list[str]:
    return [line.strip() for line in (value or "").splitlines() if line.strip()]


class HelpGuideReadSerializer(PkAsIdMixin, serializers.ModelSerializer):
    screen_label = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()
    common_error_items = serializers.SerializerMethodField()
    workflow_status_label = serializers.SerializerMethodField()

    class Meta:
        model = HelpGuide
        fields = (
            "id",
            "screen_key",
            "screen_label",
            "route_path",
            "role",
            "role_label",
            "workflow_status",
            "workflow_status_label",
            "title",
            "short_description",
            "purpose",
            "before_you_start",
            "step_by_step_guide",
            "steps",
            "expected_result",
            "common_errors",
            "common_error_items",
            "related_screen",
            "related_permission",
            "display_order",
        )

    def get_screen_label(self, obj):
        return get_help_screen_label(obj.screen_key)

    def get_role_label(self, obj):
        return obj.get_role_display()

    def get_steps(self, obj):
        return _split_text_lines(obj.step_by_step_guide)

    def get_common_error_items(self, obj):
        return _split_text_lines(obj.common_errors)

    def get_workflow_status_label(self, obj):
        return dict(Order.Status.choices).get(obj.workflow_status, obj.workflow_status)


class HelpGuideAdminSerializer(HelpGuideReadSerializer):
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    class Meta(HelpGuideReadSerializer.Meta):
        model = HelpGuide
        fields = HelpGuideReadSerializer.Meta.fields + (
            "permission_key",
            "search_keywords",
            "is_active",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def validate_permission_key(self, value):
        if not value:
            return ""
        if "." not in value:
            raise serializers.ValidationError("Permission must use the full codename format app_label.codename.")
        app_label, codename = value.split(".", 1)
        if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
            raise serializers.ValidationError("Permission does not exist in the current system.")
        return value

    def validate_related_permission(self, value):
        if not value:
            return ""
        if "." not in value:
            raise serializers.ValidationError("Related permission must use the full codename format app_label.codename.")
        app_label, codename = value.split(".", 1)
        if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
            raise serializers.ValidationError("Related permission does not exist in the current system.")
        return value

    def get_created_by_name(self, obj):
        return getattr(obj.created_by, "full_name", "")

    def get_updated_by_name(self, obj):
        return getattr(obj.updated_by, "full_name", "")


class HelpGuideMetadataSerializer(serializers.Serializer):
    screens = serializers.ListField()
    roles = serializers.ListField()
    workflow_statuses = serializers.ListField()


def build_help_guide_metadata():
    return {
        "screens": HELP_SCREEN_REGISTRY,
        "roles": [{"value": value, "label": label} for value, label in HelpGuide.Audience.choices],
        "workflow_statuses": [{"value": value, "label": label} for value, label in Order.Status.choices],
    }
