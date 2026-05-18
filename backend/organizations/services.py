from django.core.exceptions import ValidationError
from django.db import transaction

from audit.utils import create_audit_log
from organizations.models import Branch, Organization, OrganizationBranding, OrganizationMembership, PartnerServiceConfig
from organizations.selectors import customer_organization_for_user, resolve_organization_by_ref


@transaction.atomic
def onboard_partner_organization(*, actor, organization_data, owner_user, branch_data=None, request=None):
    organization = Organization.objects.create(**organization_data)
    branch = None
    if branch_data:
        branch = Branch.objects.create(organization=organization, **branch_data)
    OrganizationMembership.objects.create(
        user=owner_user,
        organization=organization,
        branch=branch,
        role=OrganizationMembership.MembershipRole.PARTNER_OWNER,
    )
    OrganizationBranding.objects.get_or_create(organization=organization)
    create_audit_log(
        request=request,
        user=actor,
        action="create_organization",
        entity_type="Organization",
        entity_id=organization.pk,
        new_value={"name": organization.name, "organization_type": organization.organization_type},
    )
    return organization


def configure_partner_service(*, actor, organization, service, is_enabled, visible_to_customers, custom_name="", custom_price=None, request=None):
    if organization.organization_type != Organization.OrganizationType.PARTNER:
        raise ValidationError({"organization": "Only partner organizations can configure services."})
    config, _ = PartnerServiceConfig.objects.get_or_create(
        organization=organization,
        service=service,
        defaults={
            "is_enabled": is_enabled,
            "visible_to_customers": visible_to_customers,
            "custom_name": custom_name,
            "custom_price": custom_price,
        },
    )
    old_value = {
        "is_enabled": config.is_enabled,
        "visible_to_customers": config.visible_to_customers,
        "custom_name": config.custom_name,
        "custom_price": str(config.custom_price) if config.custom_price is not None else None,
    }
    config.is_enabled = is_enabled
    config.visible_to_customers = visible_to_customers
    config.custom_name = custom_name
    config.custom_price = custom_price
    config.save()
    create_audit_log(
        request=request,
        user=actor,
        action="update_partner_service_config",
        entity_type="PartnerServiceConfig",
        entity_id=config.pk,
        old_value=old_value,
        new_value={
            "is_enabled": config.is_enabled,
            "visible_to_customers": config.visible_to_customers,
            "custom_name": config.custom_name,
            "custom_price": str(config.custom_price) if config.custom_price is not None else None,
        },
    )
    return config


def resolve_order_organization(*, customer=None, service=None, organization=None, organization_ref=None):
    if organization is not None:
        return organization

    if organization_ref:
        resolved = resolve_organization_by_ref(organization_ref)
        if not resolved:
            raise ValidationError({"organization": "Organization was not found."})
        return resolved

    customer_org = customer_organization_for_user(customer) if customer is not None else None
    if customer_org is not None:
        return customer_org

    if service is not None and service.organization_id:
        return service.organization

    if service is not None:
        configs = PartnerServiceConfig.objects.filter(
            service=service,
            organization__is_active=True,
            is_enabled=True,
        ).select_related("organization")
        if configs.count() == 1:
            return configs.first().organization

    partner_qs = Organization.objects.filter(
        organization_type=Organization.OrganizationType.PARTNER,
        is_active=True,
    )
    if partner_qs.count() == 1:
        return partner_qs.first()

    platform_qs = Organization.objects.filter(
        organization_type=Organization.OrganizationType.PLATFORM,
        is_active=True,
    )
    if platform_qs.count() == 1:
        return platform_qs.first()

    raise ValidationError({"organization": "A partner organization is required for this order."})
