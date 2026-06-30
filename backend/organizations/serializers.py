from rest_framework import serializers

from accounts.models import CustomUser
from organizations.models import Branch, Organization, OrganizationBranding, OrganizationMembership, PartnerServiceConfig
from services.models import Service


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
            "slug",
            "organization_type",
            "legal_name",
            "tax_number",
            "commercial_registration_number",
            "email",
            "phone",
            "is_active",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "updated_at",
        )


class BranchSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = Branch
        fields = (
            "id",
            "organization",
            "organization_name",
            "name",
            "address",
            "phone",
            "is_active",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "updated_at",
        )


class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = (
            "id",
            "user",
            "user_name",
            "organization",
            "organization_name",
            "branch",
            "branch_name",
            "role",
            "is_active",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
        )


class OrganizationBrandingSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = OrganizationBranding
        fields = (
            "id",
            "organization",
            "organization_name",
            "logo",
            "primary_color",
            "secondary_color",
            "public_site_title",
            "public_site_description",
            "show_public_page",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "updated_at",
        )


class PartnerServiceConfigSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source="organization.name", read_only=True)
    service_name = serializers.CharField(source="service.name_ar", read_only=True)

    class Meta:
        model = PartnerServiceConfig
        fields = (
            "id",
            "organization",
            "organization_name",
            "service",
            "service_name",
            "is_enabled",
            "custom_name",
            "custom_price",
            "visible_to_customers",
            "is_deleted",
            "deleted_at",
            "delete_reason",
            "created_at",
            "updated_at",
        )


class PartnerOnboardingSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    slug = serializers.SlugField(max_length=255)
    legal_name = serializers.CharField(max_length=255, allow_blank=True, required=False)
    tax_number = serializers.CharField(max_length=100, allow_blank=True, required=False)
    commercial_registration_number = serializers.CharField(max_length=100, allow_blank=True, required=False)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    owner_user_id = serializers.PrimaryKeyRelatedField(source="owner_user", queryset=CustomUser.objects.all())
    branch_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    branch_address = serializers.CharField(required=False, allow_blank=True)
    branch_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def create(self, validated_data):
        raise NotImplementedError


class MembershipSummarySerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ("id", "organization", "branch", "role", "is_active", "created_at")
