from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from core.serializer_mixins import SoftDeleteFieldsReadOnlyMixin

from accounts.models import CustomUser
from organizations.models import Branch, Organization, OrganizationBranding, OrganizationMembership, PartnerServiceConfig
from organizations.selectors import can_administer_organization, is_platform_super_admin
from organizations.services import assert_can_assign_membership
from services.models import Service


def _request_user(serializer):
    return getattr(serializer.context.get("request"), "user", None)


class ActorOrganizationScopeMixin:
    """Writes may target only an organization the caller administers."""

    def validate_organization(self, organization):
        if not can_administer_organization(_request_user(self), organization):
            raise serializers.ValidationError("You can manage records only in an organization you administer.")
        if self.instance is not None and self.instance.organization_id != organization.pk and not is_platform_super_admin(_request_user(self)):
            raise serializers.ValidationError("A record cannot be moved to another organization.")
        return organization


class OrganizationSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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


class BranchSerializer(ActorOrganizationScopeMixin, SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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


class OrganizationMembershipSerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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

    def validate(self, attrs):
        instance = self.instance
        organization = attrs.get("organization", getattr(instance, "organization", None))
        role = attrs.get("role", getattr(instance, "role", None))
        branch = attrs.get("branch", getattr(instance, "branch", None))
        user = attrs.get("user", getattr(instance, "user", None))
        actor = _request_user(self)
        try:
            assert_can_assign_membership(actor=actor, organization=organization, role=role)
            if instance is not None and not is_platform_super_admin(actor):
                # The existing row must also be one the caller may manage.
                assert_can_assign_membership(actor=actor, organization=instance.organization, role=instance.role)
            OrganizationMembership(user=user, organization=organization, branch=branch, role=role).clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
        return attrs


class OrganizationBrandingSerializer(ActorOrganizationScopeMixin, SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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


class PartnerServiceConfigSerializer(ActorOrganizationScopeMixin, SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
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

    def validate_custom_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Custom price cannot be negative.")
        return value


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


class MembershipSummarySerializer(SoftDeleteFieldsReadOnlyMixin, serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)

    class Meta:
        model = OrganizationMembership
        fields = ("id", "organization", "branch", "role", "is_active", "created_at")
