from django.contrib.auth.models import Permission
from rest_framework import serializers

from core.serializer_mixins import PkAsIdMixin
from help_guides.models import HelpGuide, HelpGuideAction, HelpGuideField, HelpGuideService, HelpGuideWorkflow
from help_guides.screen_registry import HELP_SCREEN_REGISTRY, get_help_screen_label
from orders.models import Order


def _split_text_lines(value: str) -> list[str]:
    return [line.strip() for line in (value or "").splitlines() if line.strip()]


def _get_value(obj, key, default=""):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _normalize_screen_label(obj):
    return _get_value(obj, "screen_label") or get_help_screen_label(_get_value(obj, "screen_key"))


def _normalize_role_label(obj):
    if isinstance(obj, dict):
        return obj.get("role_label") or obj.get("role", "")
    return obj.get_role_display()


def _normalize_status_label(status_value: str) -> str:
    return dict(Order.Status.choices).get(status_value, status_value)


def serialize_screen_guide(obj):
    workflow_status = _get_value(obj, "workflow_status")
    return {
        "id": _get_value(obj, "id", _get_value(obj, "pk")),
        "screen_key": _get_value(obj, "screen_key"),
        "screen_label": _normalize_screen_label(obj),
        "route_path": _get_value(obj, "route_path"),
        "role": _get_value(obj, "role"),
        "role_label": _normalize_role_label(obj),
        "workflow_status": workflow_status,
        "workflow_status_label": _normalize_status_label(workflow_status),
        "title": _get_value(obj, "title"),
        "short_description": _get_value(obj, "short_description"),
        "purpose": _get_value(obj, "purpose"),
        "before_you_start": _get_value(obj, "before_you_start"),
        "step_by_step_guide": _get_value(obj, "step_by_step_guide"),
        "steps": _split_text_lines(_get_value(obj, "step_by_step_guide")),
        "when_to_use": _get_value(obj, "when_to_use"),
        "main_workflow": _get_value(obj, "main_workflow"),
        "expected_result": _get_value(obj, "expected_result"),
        "common_errors": _get_value(obj, "common_errors"),
        "common_error_items": _split_text_lines(_get_value(obj, "common_errors")),
        "next_step": _get_value(obj, "next_step"),
        "related_screen": _get_value(obj, "related_screen"),
        "related_screen_label": get_help_screen_label(_get_value(obj, "related_screen")),
        "related_permission": _get_value(obj, "related_permission"),
        "display_order": _get_value(obj, "display_order", 0),
        "source": _get_value(obj, "source", "database"),
    }


def serialize_action_guide(obj):
    return {
        "id": _get_value(obj, "id", _get_value(obj, "pk")),
        "screen_key": _get_value(obj, "screen_key"),
        "screen_label": _normalize_screen_label(obj),
        "button_key": _get_value(obj, "button_key"),
        "button_label": _get_value(obj, "button_label"),
        "role": _get_value(obj, "role"),
        "role_label": _normalize_role_label(obj),
        "permission_key": _get_value(obj, "permission_key"),
        "purpose": _get_value(obj, "purpose"),
        "when_to_use": _get_value(obj, "when_to_use"),
        "action_result": _get_value(obj, "action_result"),
        "status_before": _get_value(obj, "status_before"),
        "status_before_label": _normalize_status_label(_get_value(obj, "status_before")),
        "status_after": _get_value(obj, "status_after"),
        "status_after_label": _normalize_status_label(_get_value(obj, "status_after")),
        "notification_triggered": _get_value(obj, "notification_triggered"),
        "warning_message": _get_value(obj, "warning_message"),
        "common_errors": _get_value(obj, "common_errors"),
        "safety_rule": _get_value(obj, "safety_rule"),
        "confirmation_message": _get_value(obj, "confirmation_message"),
        "display_order": _get_value(obj, "display_order", 0),
        "source": _get_value(obj, "source", "database"),
    }


def serialize_field_guide(obj):
    return {
        "id": _get_value(obj, "id", _get_value(obj, "pk")),
        "screen_key": _get_value(obj, "screen_key"),
        "screen_label": _normalize_screen_label(obj),
        "field_key": _get_value(obj, "field_key"),
        "field_label": _get_value(obj, "field_label"),
        "model_name": _get_value(obj, "model_name"),
        "model_field": _get_value(obj, "model_field"),
        "role": _get_value(obj, "role"),
        "role_label": _normalize_role_label(obj),
        "permission_key": _get_value(obj, "permission_key"),
        "purpose": _get_value(obj, "purpose"),
        "required": bool(_get_value(obj, "required", False)),
        "editable": bool(_get_value(obj, "editable", True)),
        "data_type": _get_value(obj, "data_type"),
        "accepted_format": _get_value(obj, "accepted_format"),
        "valid_example": _get_value(obj, "valid_example"),
        "invalid_example": _get_value(obj, "invalid_example"),
        "validation_rule": _get_value(obj, "validation_rule"),
        "error_explanation": _get_value(obj, "error_explanation"),
        "placeholder_text": _get_value(obj, "placeholder_text"),
        "tooltip_text": _get_value(obj, "tooltip_text"),
        "default_value": _get_value(obj, "default_value"),
        "max_length": _get_value(obj, "max_length"),
        "who_can_edit": _get_value(obj, "who_can_edit"),
        "locked_when": _get_value(obj, "locked_when"),
        "display_order": _get_value(obj, "display_order", 0),
        "source": _get_value(obj, "source", "database"),
    }


def serialize_service_guide(obj):
    service_name = _get_value(obj, "service_name")
    category_name = _get_value(obj, "category_name")
    return {
        "id": _get_value(obj, "id", _get_value(obj, "pk")),
        "service_id": _get_value(obj, "service_id", _get_value(_get_value(obj, "service", {}), "id")),
        "service_name": service_name,
        "category_name": category_name,
        "screen_key": _get_value(obj, "screen_key"),
        "role": _get_value(obj, "role"),
        "role_label": _normalize_role_label(obj),
        "permission_key": _get_value(obj, "permission_key"),
        "description": _get_value(obj, "description"),
        "who_can_use": _get_value(obj, "who_can_use"),
        "required_documents": _split_text_lines(_get_value(obj, "required_documents")),
        "optional_documents": _split_text_lines(_get_value(obj, "optional_documents")),
        "required_data": _split_text_lines(_get_value(obj, "required_data")),
        "prerequisites": _split_text_lines(_get_value(obj, "prerequisites")),
        "related_services": _split_text_lines(_get_value(obj, "related_services")),
        "workflow_summary": _split_text_lines(_get_value(obj, "workflow_summary")),
        "final_output": _get_value(obj, "final_output"),
        "common_errors": _split_text_lines(_get_value(obj, "common_errors")),
        "common_rejection_reasons": _split_text_lines(_get_value(obj, "common_rejection_reasons")),
        "common_missing_document_reasons": _split_text_lines(_get_value(obj, "common_missing_document_reasons")),
        "estimated_processing_time": _get_value(obj, "estimated_processing_time"),
        "price_rule": _get_value(obj, "price_rule"),
        "provider_requirement": _get_value(obj, "provider_requirement"),
        "display_order": _get_value(obj, "display_order", 0),
        "source": _get_value(obj, "source", "database"),
    }


def serialize_workflow_guide(obj):
    return {
        "id": _get_value(obj, "id", _get_value(obj, "pk")),
        "screen_key": _get_value(obj, "screen_key"),
        "screen_label": _normalize_screen_label(obj),
        "workflow_key": _get_value(obj, "workflow_key"),
        "current_status": _get_value(obj, "current_status"),
        "current_status_label": _normalize_status_label(_get_value(obj, "current_status")),
        "action_key": _get_value(obj, "action_key"),
        "action_label": _get_value(obj, "action_label"),
        "button_key": _get_value(obj, "button_key"),
        "role": _get_value(obj, "role"),
        "role_label": _normalize_role_label(obj),
        "permission_key": _get_value(obj, "permission_key"),
        "next_status": _get_value(obj, "next_status"),
        "next_status_label": _normalize_status_label(_get_value(obj, "next_status")),
        "required_fields": _split_text_lines(_get_value(obj, "required_fields")),
        "system_effect": _get_value(obj, "system_effect"),
        "notification_effect": _get_value(obj, "notification_effect"),
        "blocked_cases": _split_text_lines(_get_value(obj, "blocked_cases")),
        "correction_process": _split_text_lines(_get_value(obj, "correction_process")),
        "display_order": _get_value(obj, "display_order", 0),
        "source": _get_value(obj, "source", "database"),
    }


class BaseGuideAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()

    def validate_permission_key(self, value):
        if not value:
            return ""
        if "." not in value:
            raise serializers.ValidationError("Permission must use the full codename format app_label.codename.")
        app_label, codename = value.split(".", 1)
        if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
            raise serializers.ValidationError("Permission does not exist in the current system.")
        return value

    def get_created_by_name(self, obj):
        return getattr(obj.created_by, "full_name", "")

    def get_updated_by_name(self, obj):
        return getattr(obj.updated_by, "full_name", "")


class HelpGuideAdminSerializer(BaseGuideAdminSerializer):
    screen_label = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
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
            "permission_key",
            "workflow_status",
            "workflow_status_label",
            "title",
            "short_description",
            "purpose",
            "before_you_start",
            "step_by_step_guide",
            "when_to_use",
            "main_workflow",
            "expected_result",
            "common_errors",
            "next_step",
            "related_screen",
            "related_permission",
            "search_keywords",
            "internal_notes",
            "display_order",
            "is_active",
            "created_by",
            "created_by_name",
            "updated_by",
            "updated_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def validate_related_permission(self, value):
        if not value:
            return ""
        if "." not in value:
            raise serializers.ValidationError("Related permission must use the full codename format app_label.codename.")
        app_label, codename = value.split(".", 1)
        if not Permission.objects.filter(content_type__app_label=app_label, codename=codename).exists():
            raise serializers.ValidationError("Related permission does not exist in the current system.")
        return value

    def get_screen_label(self, obj):
        return get_help_screen_label(obj.screen_key)

    def get_role_label(self, obj):
        return obj.get_role_display()

    def get_workflow_status_label(self, obj):
        return _normalize_status_label(obj.workflow_status)


class HelpGuideReadOnlySerializer(HelpGuideAdminSerializer):
    class Meta(HelpGuideAdminSerializer.Meta):
        fields = tuple(field for field in HelpGuideAdminSerializer.Meta.fields if field != "internal_notes")


class HelpGuideActionAdminSerializer(BaseGuideAdminSerializer):
    screen_label = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()

    class Meta:
        model = HelpGuideAction
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def get_screen_label(self, obj):
        return get_help_screen_label(obj.screen_key)

    def get_role_label(self, obj):
        return obj.get_role_display()


class HelpGuideFieldAdminSerializer(BaseGuideAdminSerializer):
    screen_label = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()

    class Meta:
        model = HelpGuideField
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def get_screen_label(self, obj):
        return get_help_screen_label(obj.screen_key)

    def get_role_label(self, obj):
        return obj.get_role_display()


class HelpGuideServiceAdminSerializer(BaseGuideAdminSerializer):
    role_label = serializers.SerializerMethodField()
    service_name = serializers.CharField(source="service.name_ar", read_only=True)
    category_name = serializers.CharField(source="service.category.name_ar", read_only=True)

    class Meta:
        model = HelpGuideService
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def get_role_label(self, obj):
        return obj.get_role_display()


class HelpGuideWorkflowAdminSerializer(BaseGuideAdminSerializer):
    screen_label = serializers.SerializerMethodField()
    role_label = serializers.SerializerMethodField()
    current_status_label = serializers.SerializerMethodField()
    next_status_label = serializers.SerializerMethodField()

    class Meta:
        model = HelpGuideWorkflow
        fields = "__all__"
        read_only_fields = ("created_by", "updated_by", "created_at", "updated_at", "created_by_name", "updated_by_name")

    def get_screen_label(self, obj):
        return get_help_screen_label(obj.screen_key)

    def get_role_label(self, obj):
        return obj.get_role_display()

    def get_current_status_label(self, obj):
        return _normalize_status_label(obj.current_status)

    def get_next_status_label(self, obj):
        return _normalize_status_label(obj.next_status)


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
