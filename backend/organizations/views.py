from django.db import transaction
from rest_framework import permissions, response, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView

from audit.utils import create_audit_log
from config.permissions import CanManageOrganizations, CanManagePartnerCatalog, CanManagePlatformOrganizations, CanViewScopedOrganizations
from core.delete_guard import AdminDeleteGuardMixin
from organizations.models import Branch, Organization, OrganizationBranding, OrganizationMembership, PartnerServiceConfig
from organizations.selectors import active_memberships_for_user, enforce_organization_scope, is_platform_super_admin
from organizations.serializers import (
    BranchSerializer,
    OrganizationBrandingSerializer,
    OrganizationMembershipSerializer,
    OrganizationSerializer,
    PartnerOnboardingSerializer,
    PartnerServiceConfigSerializer,
)
from organizations.services import onboard_partner_organization


class OrganizationViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewScopedOrganizations]
    queryset = Organization.objects.all()
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        if is_platform_super_admin(self.request.user):
            return queryset
        org_ids = active_memberships_for_user(self.request.user).values_list("organization_id", flat=True)
        return queryset.filter(pk__in=org_ids)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), CanViewScopedOrganizations()]
        return [permissions.IsAuthenticated(), CanManagePlatformOrganizations()]

    def perform_create(self, serializer):
        organization = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_organization",
            entity_type="Organization",
            entity_id=organization.pk,
            new_value={"name": organization.name, "organization_type": organization.organization_type},
        )

    def perform_update(self, serializer):
        organization = self.get_object()
        old_value = {"name": organization.name, "is_active": organization.is_active}
        organization = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_organization",
            entity_type="Organization",
            entity_id=organization.pk,
            old_value=old_value,
            new_value={"name": organization.name, "is_active": organization.is_active},
        )

    def destroy(self, request, *args, **kwargs):
        organization = self.get_object()
        old_value = {"name": organization.name, "is_active": organization.is_active, "is_deleted": organization.is_deleted}
        self.enforce_delete_guard(request, instance=organization, old_value=old_value)
        with transaction.atomic():
            organization.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_organization",
                entity_type="Organization",
                entity_id=organization.pk,
                entity_name=organization.name,
                old_value=old_value,
                new_value={"name": organization.name, "is_active": organization.is_active, "is_deleted": organization.is_deleted},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        organization = Organization.objects.get(pk=pk)
        old_value = {"name": organization.name, "is_active": organization.is_active, "is_deleted": organization.is_deleted}
        organization.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_organization",
            entity_type="Organization",
            entity_id=organization.pk,
            entity_name=organization.name,
            old_value=old_value,
            new_value={"name": organization.name, "is_active": organization.is_active, "is_deleted": organization.is_deleted},
        )
        return response.Response(self.get_serializer(organization).data)


class BranchViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewScopedOrganizations]
    queryset = Branch.objects.select_related("organization").all()
    pagination_class = None

    def get_queryset(self):
        return enforce_organization_scope(super().get_queryset(), user=self.request.user, organization_field="organization")

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), CanViewScopedOrganizations()]
        return [permissions.IsAuthenticated(), CanManageOrganizations()]

    def perform_create(self, serializer):
        branch = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="create_branch",
            entity_type="Branch",
            entity_id=branch.pk,
            new_value={"organization_id": branch.organization_id, "name": branch.name},
        )

    def perform_update(self, serializer):
        branch = self.get_object()
        old_value = {"name": branch.name, "is_active": branch.is_active}
        branch = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_branch",
            entity_type="Branch",
            entity_id=branch.pk,
            old_value=old_value,
            new_value={"name": branch.name, "is_active": branch.is_active},
        )

    def destroy(self, request, *args, **kwargs):
        branch = self.get_object()
        old_value = {"name": branch.name, "is_active": branch.is_active, "is_deleted": branch.is_deleted}
        self.enforce_delete_guard(request, instance=branch, old_value=old_value)
        with transaction.atomic():
            branch.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_branch",
                entity_type="Branch",
                entity_id=branch.pk,
                entity_name=branch.name,
                old_value=old_value,
                new_value={"name": branch.name, "is_active": branch.is_active, "is_deleted": branch.is_deleted},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        branch = Branch.objects.get(pk=pk)
        old_value = {"name": branch.name, "is_active": branch.is_active, "is_deleted": branch.is_deleted}
        branch.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_branch",
            entity_type="Branch",
            entity_id=branch.pk,
            entity_name=branch.name,
            old_value=old_value,
            new_value={"name": branch.name, "is_active": branch.is_active, "is_deleted": branch.is_deleted},
        )
        return response.Response(self.get_serializer(branch).data)


class OrganizationMembershipViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = OrganizationMembershipSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageOrganizations]
    queryset = OrganizationMembership.objects.select_related("user", "organization", "branch").all()
    pagination_class = None

    def get_queryset(self):
        if is_platform_super_admin(self.request.user):
            return super().get_queryset()
        org_ids = active_memberships_for_user(self.request.user).values_list("organization_id", flat=True)
        return super().get_queryset().filter(organization_id__in=org_ids)

    def perform_create(self, serializer):
        membership = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="invite_or_assign_user_membership",
            entity_type="OrganizationMembership",
            entity_id=membership.pk,
            new_value={"user_id": membership.user_id, "organization_id": membership.organization_id, "role": membership.role},
        )

    def perform_update(self, serializer):
        membership = self.get_object()
        old_value = {"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active}
        membership = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="change_user_membership_role",
            entity_type="OrganizationMembership",
            entity_id=membership.pk,
            old_value=old_value,
            new_value={"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active},
        )

    def destroy(self, request, *args, **kwargs):
        membership = self.get_object()
        old_value = {"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active, "is_deleted": membership.is_deleted}
        self.enforce_delete_guard(request, instance=membership, old_value=old_value)
        with transaction.atomic():
            membership.soft_delete(user=request.user)
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_membership",
                entity_type="OrganizationMembership",
                entity_id=membership.pk,
                entity_name=str(membership),
                old_value=old_value,
                new_value={"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active, "is_deleted": membership.is_deleted},
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        membership = OrganizationMembership.objects.get(pk=pk)
        old_value = {"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active, "is_deleted": membership.is_deleted}
        membership.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_membership",
            entity_type="OrganizationMembership",
            entity_id=membership.pk,
            entity_name=str(membership),
            old_value=old_value,
            new_value={"role": membership.role, "branch_id": membership.branch_id, "is_active": membership.is_active, "is_deleted": membership.is_deleted},
        )
        return response.Response(self.get_serializer(membership).data)


class OrganizationBrandingViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = OrganizationBrandingSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewScopedOrganizations]
    queryset = OrganizationBranding.objects.select_related("organization").all()
    pagination_class = None

    def get_queryset(self):
        return enforce_organization_scope(super().get_queryset(), user=self.request.user, organization_field="organization")

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), CanViewScopedOrganizations()]
        return [permissions.IsAuthenticated(), CanManageOrganizations()]

    def perform_update(self, serializer):
        branding = self.get_object()
        old_value = {"primary_color": branding.primary_color, "secondary_color": branding.secondary_color, "show_public_page": branding.show_public_page}
        branding = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_organization_branding",
            entity_type="OrganizationBranding",
            entity_id=branding.pk,
            old_value=old_value,
            new_value={"primary_color": branding.primary_color, "secondary_color": branding.secondary_color, "show_public_page": branding.show_public_page},
        )


class PartnerServiceConfigViewSet(AdminDeleteGuardMixin, viewsets.ModelViewSet):
    serializer_class = PartnerServiceConfigSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePartnerCatalog]
    queryset = PartnerServiceConfig.objects.select_related("organization", "service", "service__category").all()
    pagination_class = None

    def get_queryset(self):
        return enforce_organization_scope(super().get_queryset(), user=self.request.user, organization_field="organization")

    def perform_create(self, serializer):
        config = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="enable_partner_service",
            entity_type="PartnerServiceConfig",
            entity_id=config.pk,
            new_value={"organization_id": config.organization_id, "service_id": config.service_id, "custom_price": str(config.custom_price) if config.custom_price is not None else None},
        )

    def perform_update(self, serializer):
        config = self.get_object()
        old_value = {"is_enabled": config.is_enabled, "visible_to_customers": config.visible_to_customers, "custom_price": str(config.custom_price) if config.custom_price is not None else None}
        config = serializer.save()
        create_audit_log(
            request=self.request,
            user=self.request.user,
            action="update_partner_service_pricing",
            entity_type="PartnerServiceConfig",
            entity_id=config.pk,
            old_value=old_value,
            new_value={"is_enabled": config.is_enabled, "visible_to_customers": config.visible_to_customers, "custom_price": str(config.custom_price) if config.custom_price is not None else None},
        )

    def destroy(self, request, *args, **kwargs):
        config = self.get_object()
        old_value = {
            "is_enabled": config.is_enabled,
            "visible_to_customers": config.visible_to_customers,
            "custom_price": str(config.custom_price) if config.custom_price is not None else None,
            "is_deleted": config.is_deleted,
        }
        self.enforce_delete_guard(request, instance=config, old_value=old_value)
        with transaction.atomic():
            config.soft_delete(user=request.user)
            config.visible_to_customers = False
            config.save(update_fields=["visible_to_customers", "updated_at"])
            create_audit_log(
                request=request,
                user=request.user,
                action="delete_partner_service_config",
                entity_type="PartnerServiceConfig",
                entity_id=config.pk,
                entity_name=str(config),
                old_value=old_value,
                new_value={
                    "is_enabled": config.is_enabled,
                    "visible_to_customers": config.visible_to_customers,
                    "custom_price": str(config.custom_price) if config.custom_price is not None else None,
                    "is_deleted": config.is_deleted,
                },
            )
        return response.Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        config = PartnerServiceConfig.objects.get(pk=pk)
        old_value = {
            "is_enabled": config.is_enabled,
            "visible_to_customers": config.visible_to_customers,
            "custom_price": str(config.custom_price) if config.custom_price is not None else None,
            "is_deleted": config.is_deleted,
        }
        config.restore()
        create_audit_log(
            request=request,
            user=request.user,
            action="restore_partner_service_config",
            entity_type="PartnerServiceConfig",
            entity_id=config.pk,
            entity_name=str(config),
            old_value=old_value,
            new_value={
                "is_enabled": config.is_enabled,
                "visible_to_customers": config.visible_to_customers,
                "custom_price": str(config.custom_price) if config.custom_price is not None else None,
                "is_deleted": config.is_deleted,
            },
        )
        return response.Response(self.get_serializer(config).data)


class PartnerOnboardingAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanManagePlatformOrganizations]

    def post(self, request):
        serializer = PartnerOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        organization = onboard_partner_organization(
            actor=request.user,
            organization_data={
                "name": validated["name"],
                "slug": validated["slug"],
                "organization_type": Organization.OrganizationType.PARTNER,
                "legal_name": validated.get("legal_name", ""),
                "tax_number": validated.get("tax_number", ""),
                "commercial_registration_number": validated.get("commercial_registration_number", ""),
                "email": validated.get("email", ""),
                "phone": validated.get("phone", ""),
            },
            owner_user=validated["owner_user"],
            branch_data={
                "name": validated.get("branch_name") or "Main Branch",
                "address": validated.get("branch_address", ""),
                "phone": validated.get("branch_phone", ""),
            },
            request=request,
        )
        return response.Response(OrganizationSerializer(organization).data, status=status.HTTP_201_CREATED)


class MyMembershipsAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        memberships = active_memberships_for_user(request.user)
        return response.Response(OrganizationMembershipSerializer(memberships, many=True).data)
