from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.text import slugify
from rest_framework import serializers

from core.serializer_mixins import PkAsIdMixin
from providers.models import ProviderProfile
from services.models import (
    Address,
    Service,
    ServiceCategory,
    ServiceProviderAssignment,
    ServiceRelation,
    ServiceRequiredDocument,
)
from services.order_validation import get_completed_service_ids_for_customer
from services.service_relations import RELATION_TYPE_HELP_TEXT
from services.selectors import resolve_service_organization_from_request, visible_services_queryset


def _matched_partner_config(service):
    configs = getattr(service, "_matched_partner_configs", None) or []
    return configs[0] if configs else None


def _fallback_slug(*parts):
    for part in parts:
        value = slugify(part or "")
        if value:
            return value
    return ""


def _normalize_extension(value):
    extension = str(value or "").strip().lower()
    if not extension:
        return ""
    return extension if extension.startswith(".") else f".{extension}"


SAFE_ADMIN_DOCUMENT_EXTENSIONS = {
    _normalize_extension(extension)
    for extension in getattr(settings, "ALLOWED_UPLOAD_EXTENSIONS", [])
}


class ServiceCategorySerializer(PkAsIdMixin, serializers.ModelSerializer):
    name = serializers.CharField(source="name_ar", read_only=True)
    description = serializers.CharField(source="description_ar", read_only=True)
    parent_name = serializers.CharField(source="parent.name_ar", read_only=True)
    full_path_name = serializers.CharField(read_only=True)
    full_path_name_en = serializers.CharField(read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = (
            "id",
            "name",
            "name_ar",
            "name_en",
            "slug",
            "parent",
            "parent_name",
            "description",
            "description_ar",
            "description_en",
            "icon",
            "color",
            "display_order",
            "sort_order",
            "is_active",
            "show_on_public_site",
            "full_path_name",
            "full_path_name_en",
            "children",
        )

    def get_children(self, obj):
        children = getattr(obj, "_prefetched_public_children", None)
        if children is None:
            children = obj.children.filter(is_active=True, show_on_public_site=True).order_by("sort_order", "name_ar")
        return ServiceCategorySerializer(children, many=True, context=self.context).data


class AdminCategoryRuleSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(required=False, allow_blank=True)
    name = serializers.CharField(source="name_ar", read_only=True)
    description = serializers.CharField(source="description_ar", read_only=True)
    parent_id = serializers.PrimaryKeyRelatedField(
        source="parent",
        queryset=ServiceCategory.objects.all(),
        required=False,
        allow_null=True,
    )
    parent_name = serializers.CharField(source="parent.name_ar", read_only=True)
    help_text = serializers.SerializerMethodField()
    full_path_name = serializers.CharField(read_only=True)
    active_services_count = serializers.IntegerField(read_only=True)
    services_preview = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = (
            "id",
            "name",
            "name_ar",
            "name_en",
            "slug",
            "parent_id",
            "parent_name",
            "full_path_name",
            "description",
            "description_ar",
            "description_en",
            "icon",
            "color",
            "display_order",
            "sort_order",
            "is_active",
            "show_on_public_site",
            "active_services_count",
            "services_preview",
            "help_text",
        )
        read_only_fields = ("help_text",)

    def get_help_text(self, obj):
        return "Use categories to group services for the public catalog and internal operations."

    def get_services_preview(self, obj):
        services = getattr(obj, "_prefetched_services_preview", None)
        if services is None:
            services = obj.services.filter(is_active=True).order_by("name_ar")[:5]
        return [{"id": service.id, "name_ar": service.name_ar, "slug": service.slug} for service in services]

    def create(self, validated_data):
        if "sort_order" in validated_data and "display_order" not in validated_data:
            validated_data["display_order"] = validated_data["sort_order"]
        validated_data["slug"] = validated_data.get("slug") or _fallback_slug(
            validated_data.get("name_en"),
            validated_data.get("name_ar"),
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "sort_order" in validated_data and "display_order" not in validated_data:
            validated_data["display_order"] = validated_data["sort_order"]
        if "slug" in validated_data:
            instance.slug = validated_data["slug"] or _fallback_slug(
                validated_data.get("name_en", instance.name_en),
                validated_data.get("name_ar", instance.name_ar),
            )
            validated_data.pop("slug", None)
        elif "name_ar" in validated_data or "name_en" in validated_data:
            instance.slug = _fallback_slug(
                validated_data.get("name_en", instance.name_en),
                validated_data.get("name_ar", instance.name_ar),
            )
        return super().update(instance, validated_data)


class RelatedServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name_ar", "name_en", "slug", "description_ar", "description_en", "estimated_duration", "service_fee", "government_fee")


class ServiceRelationServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name_ar", "name_en", "slug")


class ServiceRelationAdminSerializer(serializers.ModelSerializer):
    source_service = ServiceRelationServiceSerializer(read_only=True)
    target_service = ServiceRelationServiceSerializer(read_only=True)
    source_service_id = serializers.PrimaryKeyRelatedField(
        source="source_service",
        queryset=Service.objects.filter(is_active=True),
    )
    target_service_id = serializers.PrimaryKeyRelatedField(
        source="target_service",
        queryset=Service.objects.filter(is_active=True),
    )
    source_service_name = serializers.CharField(source="source_service.name_ar", read_only=True)
    target_service_name = serializers.CharField(source="target_service.name_ar", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    relation_type_label = serializers.CharField(source="get_relation_type_display", read_only=True)
    relation_type_help = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRelation
        fields = (
            "id",
            "source_service",
            "source_service_id",
            "source_service_name",
            "target_service",
            "target_service_id",
            "target_service_name",
            "relation_type",
            "relation_type_label",
            "relation_type_help",
            "is_required",
            "message_to_customer",
            "is_active",
            "created_by",
            "created_by_name",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("created_by", "created_by_name", "created_at", "updated_at")

    def get_relation_type_help(self, obj):
        return RELATION_TYPE_HELP_TEXT.get(obj.relation_type, "")

    def validate(self, attrs):
        instance = self.instance or ServiceRelation()
        created_by = attrs.get("created_by") or getattr(instance, "created_by", None) or getattr(
            getattr(self.context.get("request"), "user", None),
            "pk",
            None,
        )

        if created_by and not isinstance(created_by, int):
            instance.created_by = created_by
        elif created_by:
            instance.created_by_id = created_by

        for field, value in attrs.items():
            setattr(instance, field, value)

        try:
            instance.full_clean()
        except DjangoValidationError as exc:
            if hasattr(exc, "message_dict"):
                raise serializers.ValidationError(exc.message_dict)
            raise serializers.ValidationError(exc.messages)
        return attrs


class CustomerServiceRelationSerializer(serializers.ModelSerializer):
    source_service = ServiceRelationServiceSerializer(read_only=True)
    target_service = ServiceRelationServiceSerializer(read_only=True)
    relation_type_label = serializers.CharField(source="get_relation_type_display", read_only=True)
    relation_type_help = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    completion_status = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRelation
        fields = (
            "id",
            "source_service",
            "target_service",
            "relation_type",
            "relation_type_label",
            "relation_type_help",
            "is_required",
            "message_to_customer",
            "is_completed",
            "completion_status",
        )

    def get_relation_type_help(self, obj):
        return RELATION_TYPE_HELP_TEXT.get(obj.relation_type, "")

    def get_is_completed(self, obj):
        completed_service_ids = self.context.get("completed_service_ids", set())
        return obj.source_service_id in completed_service_ids

    def get_completion_status(self, obj):
        return "completed" if self.get_is_completed(obj) else "missing"


class ServiceListSerializer(serializers.ModelSerializer):
    category = ServiceCategorySerializer(read_only=True)
    total_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    organization_id = serializers.IntegerField(read_only=True)
    scope = serializers.CharField(read_only=True)
    display_name = serializers.SerializerMethodField()
    effective_total_fee = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "category",
            "organization_id",
            "scope",
            "name_ar",
            "name_en",
            "display_name",
            "slug",
            "description_ar",
            "description_en",
            "estimated_duration",
            "base_price",
            "government_fee",
            "service_fee",
            "total_fee",
            "effective_total_fee",
            "is_featured",
            "is_active",
        )

    def get_display_name(self, obj):
        config = _matched_partner_config(obj)
        return config.custom_name or obj.name_ar if config else obj.name_ar

    def get_effective_total_fee(self, obj):
        config = _matched_partner_config(obj)
        if config and config.custom_price is not None:
            return config.custom_price
        return obj.total_fee


class AdminServiceRuleSerializer(serializers.ModelSerializer):
    slug = serializers.CharField(required=False, allow_blank=True)
    category = ServiceCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=ServiceCategory.objects.all(), write_only=True)
    category_name = serializers.CharField(source="category.name_ar", read_only=True)
    organization_id = serializers.PrimaryKeyRelatedField(source="organization", queryset=ServiceCategory.objects.none(), write_only=True, required=False, allow_null=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    duration_display = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from organizations.models import Organization

        self.fields["organization_id"].queryset = Organization.objects.filter(is_active=True)

    class Meta:
        model = Service
        fields = (
            "id",
            "category",
            "category_id",
            "category_name",
            "organization_id",
            "organization_name",
            "scope",
            "name_ar",
            "name_en",
            "slug",
            "short_description_ar",
            "short_description_en",
            "description_ar",
            "description_en",
            "required_information_schema",
            "base_price",
            "government_fee",
            "service_fee",
            "estimated_duration",
            "estimated_duration_unit",
            "price_type",
            "terms_ar",
            "terms_en",
            "provider_required",
            "requires_manual_review",
            "requires_appointment",
            "is_online",
            "is_featured",
            "is_active",
            "display_order",
            "duration_display",
        )
        read_only_fields = ("duration_display",)

    def get_duration_display(self, obj):
        return f"{obj.estimated_duration} {obj.get_estimated_duration_unit_display().lower()}"

    def create(self, validated_data):
        validated_data["slug"] = validated_data.get("slug") or _fallback_slug(
            validated_data.get("name_en"),
            validated_data.get("name_ar"),
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "slug" in validated_data:
            instance.slug = validated_data["slug"] or _fallback_slug(
                validated_data.get("name_en", instance.name_en),
                validated_data.get("name_ar", instance.name_ar),
            )
            validated_data.pop("slug", None)
        elif "name_ar" in validated_data or "name_en" in validated_data:
            instance.slug = _fallback_slug(
                validated_data.get("name_en", instance.name_en),
                validated_data.get("name_ar", instance.name_ar),
            )
        return super().update(instance, validated_data)


class ServiceRequiredDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequiredDocument
        fields = (
            "id",
            "service",
            "document_type",
            "name_ar",
            "name_en",
            "is_required",
            "allowed_extensions",
            "max_file_size",
            "requires_verification",
            "client_can_replace_file",
            "provider_can_view_file",
            "display_order",
            "is_active",
        )


class AdminRequiredDocumentRuleSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_ar", read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source="service", queryset=Service.objects.all())
    allowed_extension_options = serializers.SerializerMethodField()
    max_file_size_limit = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequiredDocument
        fields = (
            "id",
            "service_name",
            "service_id",
            "document_type",
            "name_ar",
            "name_en",
            "is_required",
            "allowed_extensions",
            "allowed_extension_options",
            "max_file_size",
            "max_file_size_limit",
            "requires_verification",
            "client_can_replace_file",
            "provider_can_view_file",
            "display_order",
            "is_active",
        )
        read_only_fields = ("allowed_extension_options", "max_file_size_limit")

    def get_allowed_extension_options(self, obj):
        return sorted(SAFE_ADMIN_DOCUMENT_EXTENSIONS)

    def get_max_file_size_limit(self, obj):
        return getattr(settings, "FILE_UPLOAD_MAX_SIZE", 0)

    def validate_allowed_extensions(self, value):
        normalized = []
        for item in value or []:
            extension = _normalize_extension(item)
            if not extension:
                continue
            if SAFE_ADMIN_DOCUMENT_EXTENSIONS and extension not in SAFE_ADMIN_DOCUMENT_EXTENSIONS:
                allowed = ", ".join(sorted(SAFE_ADMIN_DOCUMENT_EXTENSIONS))
                raise serializers.ValidationError(f"Allowed file types must be one of: {allowed}.")
            normalized.append(extension if extension.startswith(".") else f".{extension}")
        return sorted(set(normalized))

    def validate_max_file_size(self, value):
        max_allowed_size = getattr(settings, "FILE_UPLOAD_MAX_SIZE", value)
        if value <= 0:
            raise serializers.ValidationError("Maximum file size must be greater than zero.")
        if max_allowed_size and value > max_allowed_size:
            raise serializers.ValidationError(
                f"Maximum file size cannot exceed {max_allowed_size} bytes."
            )
        return value


class ServiceProviderAssignmentSerializer(PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = ServiceProviderAssignment
        fields = "__all__"


class AdminServiceProviderAssignmentSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_ar", read_only=True)
    provider_name = serializers.CharField(source="provider.user.full_name", read_only=True)
    provider_city = serializers.CharField(source="provider.city", read_only=True)
    provider_is_approved = serializers.BooleanField(source="provider.is_approved", read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source="service", queryset=Service.objects.all())
    provider_id = serializers.PrimaryKeyRelatedField(source="provider", queryset=ProviderProfile.objects.select_related("user"))

    class Meta:
        model = ServiceProviderAssignment
        fields = (
            "id",
            "service_name",
            "provider_name",
            "provider_city",
            "provider_is_approved",
            "service_id",
            "provider_id",
            "is_active",
            "created_at",
        )
        read_only_fields = ("created_at",)


class AddressAdminSerializer(PkAsIdMixin, serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"


class ServiceDetailSerializer(ServiceListSerializer):
    required_documents = ServiceRequiredDocumentSerializer(source="document_requirements", many=True, read_only=True)
    steps = serializers.SerializerMethodField()
    steps_en = serializers.SerializerMethodField()
    related_services = serializers.SerializerMethodField()
    prerequisite_services = serializers.SerializerMethodField()
    recommended_services = serializers.SerializerMethodField()

    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + (
            "short_description_ar",
            "short_description_en",
            "description_en",
            "required_information_schema",
            "price_type",
            "estimated_duration_unit",
            "steps_en",
            "terms_ar",
            "terms_en",
            "is_online",
            "requires_appointment",
            "requires_manual_review",
            "provider_required",
            "display_order",
            "required_documents",
            "steps",
            "prerequisite_services",
            "recommended_services",
            "related_services",
        )

    def get_steps(self, obj):
        return [
            "تأكيد الطلب والبيانات الأساسية",
            "رفع الوثائق المطلوبة",
            "مراجعة الطلب وتنفيذه",
            "تسليم النتيجة النهائية",
        ]

    def get_steps_en(self, obj):
        return [
            "Confirm the request and basic details",
            "Upload the required documents",
            "Review and process the request",
            "Deliver the final result",
        ]

    def get_related_services(self, obj):
        related = obj.category.services.filter(is_active=True).exclude(pk=obj.pk)[:4]
        return RelatedServiceSerializer(related, many=True).data

    def _completed_service_ids(self):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not getattr(user, "is_authenticated", False) or getattr(user, "role", "") != "customer":
            return set()
        return get_completed_service_ids_for_customer(user)

    def get_prerequisite_services(self, obj):
        request = self.context.get("request")
        organization = resolve_service_organization_from_request(request) if request else None
        visible_ids = set(visible_services_queryset(organization=organization).values_list("pk", flat=True))
        relations = obj.incoming_relations.filter(
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_active=True,
            source_service__is_active=True,
        ).select_related("source_service", "target_service")
        if organization is not None:
            relations = relations.filter(source_service_id__in=visible_ids)
        return CustomerServiceRelationSerializer(
            relations,
            many=True,
            context={"completed_service_ids": self._completed_service_ids()},
        ).data

    def get_recommended_services(self, obj):
        request = self.context.get("request")
        organization = resolve_service_organization_from_request(request) if request else None
        visible_ids = set(visible_services_queryset(organization=organization).values_list("pk", flat=True))
        relations = obj.outgoing_relations.filter(
            relation_type__in=[
                ServiceRelation.RelationType.RECOMMENDED_AFTER,
                ServiceRelation.RelationType.OPTIONAL_BUNDLE,
            ],
            is_active=True,
            target_service__is_active=True,
        ).select_related("source_service", "target_service")
        if organization is not None:
            relations = relations.filter(target_service_id__in=visible_ids)
        return CustomerServiceRelationSerializer(
            relations,
            many=True,
            context={"completed_service_ids": self._completed_service_ids()},
        ).data
