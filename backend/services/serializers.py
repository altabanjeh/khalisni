from django.conf import settings
from django.utils.text import slugify
from rest_framework import serializers

from providers.models import ProviderProfile
from services.models import Address, Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument


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


class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategory
        fields = "__all__"


class AdminCategoryRuleSerializer(serializers.ModelSerializer):
    help_text = serializers.SerializerMethodField()

    class Meta:
        model = ServiceCategory
        fields = ("id", "name_ar", "name_en", "description_ar", "description_en", "display_order", "is_active", "help_text")
        read_only_fields = ("help_text",)

    def get_help_text(self, obj):
        return "Use categories to group services for the public catalog and internal operations."

    def create(self, validated_data):
        validated_data["slug"] = _fallback_slug(validated_data.get("name_en"), validated_data.get("name_ar"))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name_ar" in validated_data or "name_en" in validated_data:
            instance.slug = _fallback_slug(validated_data.get("name_en", instance.name_en), validated_data.get("name_ar", instance.name_ar))
        return super().update(instance, validated_data)


class RelatedServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name_ar", "slug", "estimated_duration", "service_fee", "government_fee")


class ServiceListSerializer(serializers.ModelSerializer):
    category = ServiceCategorySerializer(read_only=True)
    total_fee = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Service
        fields = (
            "id",
            "category",
            "name_ar",
            "name_en",
            "slug",
            "description_ar",
            "estimated_duration",
            "base_price",
            "government_fee",
            "service_fee",
            "total_fee",
            "is_featured",
            "is_active",
        )


class AdminServiceRuleSerializer(serializers.ModelSerializer):
    category = ServiceCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=ServiceCategory.objects.all(), write_only=True)
    category_name = serializers.CharField(source="category.name_ar", read_only=True)
    duration_display = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = (
            "id",
            "category",
            "category_id",
            "category_name",
            "name_ar",
            "name_en",
            "short_description_ar",
            "short_description_en",
            "description_ar",
            "description_en",
            "base_price",
            "government_fee",
            "service_fee",
            "estimated_duration",
            "estimated_duration_unit",
            "price_type",
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
        validated_data["slug"] = _fallback_slug(validated_data.get("name_en"), validated_data.get("name_ar"))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "name_ar" in validated_data or "name_en" in validated_data:
            instance.slug = _fallback_slug(validated_data.get("name_en", instance.name_en), validated_data.get("name_ar", instance.name_ar))
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
    service_id = serializers.PrimaryKeyRelatedField(source="service", queryset=Service.objects.all(), write_only=True)
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


class ServiceProviderAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProviderAssignment
        fields = "__all__"


class AdminServiceProviderAssignmentSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name_ar", read_only=True)
    provider_name = serializers.CharField(source="provider.user.full_name", read_only=True)
    provider_city = serializers.CharField(source="provider.city", read_only=True)
    provider_is_approved = serializers.BooleanField(source="provider.is_approved", read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(source="service", queryset=Service.objects.all(), write_only=True)
    provider_id = serializers.PrimaryKeyRelatedField(source="provider", queryset=ProviderProfile.objects.select_related("user"), write_only=True)

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


class AddressAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = "__all__"


class ServiceDetailSerializer(ServiceListSerializer):
    required_documents = ServiceRequiredDocumentSerializer(source="document_requirements", many=True, read_only=True)
    steps = serializers.SerializerMethodField()
    related_services = serializers.SerializerMethodField()

    class Meta(ServiceListSerializer.Meta):
        fields = ServiceListSerializer.Meta.fields + (
            "short_description_ar",
            "short_description_en",
            "description_en",
            "required_information_schema",
            "price_type",
            "estimated_duration_unit",
            "terms_ar",
            "terms_en",
            "is_online",
            "requires_appointment",
            "requires_manual_review",
            "provider_required",
            "display_order",
            "required_documents",
            "steps",
            "related_services",
        )

    def get_steps(self, obj):
        return [
            "تأكيد الطلب والبيانات الأساسية",
            "رفع الوثائق المطلوبة",
            "مراجعة الطلب وتنفيذه",
            "تسليم النتيجة النهائية",
        ]

    def get_related_services(self, obj):
        related = obj.category.services.filter(is_active=True).exclude(pk=obj.pk)[:4]
        return RelatedServiceSerializer(related, many=True).data
