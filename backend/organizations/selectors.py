from django.core.exceptions import FieldDoesNotExist
from django.db.models import Q

from organizations.models import Branch, Organization, OrganizationMembership


PLATFORM_ADMIN_ROLES = {OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN}
PLATFORM_STAFF_ROLES = PLATFORM_ADMIN_ROLES | {OrganizationMembership.MembershipRole.PLATFORM_SUPPORT}
PARTNER_ADMIN_ROLES = {
    OrganizationMembership.MembershipRole.PARTNER_OWNER,
    OrganizationMembership.MembershipRole.PARTNER_ADMIN,
}
PARTNER_STAFF_ROLES = PARTNER_ADMIN_ROLES | {
    OrganizationMembership.MembershipRole.BRANCH_MANAGER,
    OrganizationMembership.MembershipRole.PARTNER_EMPLOYEE,
    OrganizationMembership.MembershipRole.FINANCE,
    OrganizationMembership.MembershipRole.AUDITOR,
}
PARTNER_OPERATIONAL_ROLES = PARTNER_ADMIN_ROLES | {
    OrganizationMembership.MembershipRole.BRANCH_MANAGER,
    OrganizationMembership.MembershipRole.PARTNER_EMPLOYEE,
}
PROVIDER_ROLES = {
    OrganizationMembership.MembershipRole.PROVIDER_ADMIN,
    OrganizationMembership.MembershipRole.PROVIDER_EMPLOYEE,
}


def active_memberships_for_user(user):
    if not user or not getattr(user, "is_authenticated", False):
        return OrganizationMembership.objects.none()
    return OrganizationMembership.objects.select_related("organization", "branch").filter(
        user=user,
        is_active=True,
        is_deleted=False,
        organization__is_active=True,
        organization__is_deleted=False,
    ).filter(Q(branch__isnull=True) | Q(branch__is_deleted=False))


def platform_memberships_for_user(user, roles):
    """Platform-role memberships count only on the platform organization itself."""
    return active_memberships_for_user(user).filter(
        role__in=roles,
        organization__organization_type=Organization.OrganizationType.PLATFORM,
    )


def can_administer_organization(user, organization):
    """True when the user may manage members and settings of this organization."""
    if organization is None:
        return False
    if is_platform_super_admin(user):
        return True
    return active_memberships_for_user(user).filter(organization=organization, role__in=PARTNER_ADMIN_ROLES).exists()


def membership_roles_for_user(user):
    return set(active_memberships_for_user(user).values_list("role", flat=True))


def has_scoped_memberships(user):
    """
    Return True when the user has active non-platform memberships and should be
    treated as tenant-scoped for queryset filtering.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return False
    memberships = active_memberships_for_user(user)
    if not memberships.exists():
        return False
    return not platform_memberships_for_user(user, PLATFORM_STAFF_ROLES).exists()


def is_platform_super_admin(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if (getattr(user, "role", "") or "").lower() == "admin":
        return True
    return platform_memberships_for_user(user, PLATFORM_ADMIN_ROLES).exists()


def has_tenant_membership_history(user):
    """
    True when the user was ever attached to a non-platform organization.

    Such an account belongs to a tenant. Losing its membership (deactivated,
    removed, organization closed) must leave it with no access, never with the
    platform-wide access of an unscoped internal employee.
    """
    if not user or not getattr(user, "pk", None):
        return False
    return (
        OrganizationMembership.objects.filter(user=user)
        .exclude(organization__organization_type=Organization.OrganizationType.PLATFORM)
        .exists()
    )


def can_manage_user_account(actor, target):
    """
    May ``actor`` change the login identity, role or memberships of ``target``?

    A platform super admin may. An organization administrator may only for an
    account that lives entirely inside the organizations they administer: no
    platform authority, and no active membership anywhere else. Otherwise
    resetting a shared user's password would hand over that user's access to
    other tenants or to the platform.
    """
    if is_platform_super_admin(actor):
        return True
    if target is None or not getattr(target, "pk", None):
        return False
    if getattr(target, "is_superuser", False) or getattr(target, "is_staff", False):
        return False
    if (getattr(target, "role", "") or "").lower() in {"admin", "support"}:
        return False
    administered = set(
        active_memberships_for_user(actor)
        .filter(role__in=PARTNER_ADMIN_ROLES)
        .values_list("organization_id", flat=True)
    )
    if not administered:
        return False
    target_orgs = set(
        OrganizationMembership.objects.filter(user=target, is_active=True, is_deleted=False).values_list(
            "organization_id", flat=True
        )
    )
    return bool(target_orgs) and target_orgs <= administered


def is_platform_support(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if is_platform_super_admin(user):
        return True
    legacy_role = (getattr(user, "role", "") or "").lower()
    if legacy_role == "support" and not has_tenant_membership_history(user):
        return True
    return platform_memberships_for_user(user, PLATFORM_STAFF_ROLES).exists()


def is_partner_user(user):
    return active_memberships_for_user(user).filter(role__in=PARTNER_STAFF_ROLES).exists()


def is_partner_admin(user):
    return active_memberships_for_user(user).filter(role__in=PARTNER_ADMIN_ROLES).exists()


def is_partner_operational_user(user):
    return active_memberships_for_user(user).filter(role__in=PARTNER_OPERATIONAL_ROLES).exists()


def is_branch_manager(user):
    return active_memberships_for_user(user).filter(role=OrganizationMembership.MembershipRole.BRANCH_MANAGER).exists()


def is_provider_user(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    legacy_role = (getattr(user, "role", "") or "").lower()
    if legacy_role == "provider":
        return True
    return active_memberships_for_user(user).filter(role__in=PROVIDER_ROLES).exists()


def is_customer_user(user):
    return bool(user and getattr(user, "is_authenticated", False) and (getattr(user, "role", "") or "").lower() == "customer")


def organizations_for_user(user, *, organization_type=None):
    memberships = active_memberships_for_user(user)
    queryset = Organization.objects.filter(is_deleted=False, memberships__in=memberships).distinct()
    if organization_type:
        queryset = queryset.filter(organization_type=organization_type)
    return queryset


def branches_for_user(user, *, organization=None):
    memberships = active_memberships_for_user(user).exclude(branch=None)
    if organization is not None:
        memberships = memberships.filter(organization=organization)
    return Branch.objects.filter(is_deleted=False, memberships__in=memberships).distinct()


def primary_partner_for_user(user):
    return organizations_for_user(user, organization_type=Organization.OrganizationType.PARTNER).order_by("name").first()


def customer_organization_for_user(user):
    customer_profile = getattr(user, "customer_profile", None)
    if customer_profile and customer_profile.organization_id:
        return customer_profile.organization
    membership = active_memberships_for_user(user).filter(role=OrganizationMembership.MembershipRole.CUSTOMER).order_by("created_at").first()
    return getattr(membership, "organization", None)


def resolve_organization_by_ref(ref):
    if not ref:
        return None
    queryset = Organization.objects.filter(is_active=True, is_deleted=False)
    if str(ref).isdigit():
        return queryset.filter(pk=ref).first()
    return queryset.filter(slug=str(ref)).first()


def _has_model_field(queryset, name):
    try:
        queryset.model._meta.get_field(name)
    except FieldDoesNotExist:
        return False
    return True


def enforce_organization_scope(queryset, *, user, organization_field="organization", branch_field=None):
    if is_platform_super_admin(user):
        return queryset

    if is_provider_user(user):
        provider_org_ids = organizations_for_user(user, organization_type=Organization.OrganizationType.PROVIDER).values_list("pk", flat=True)
        if _has_model_field(queryset, "assigned_provider_organization"):
            # Work rows (orders): what is assigned to the provider, never the table.
            if provider_org_ids:
                return queryset.filter(assigned_provider_organization__in=provider_org_ids).distinct()
            if not is_partner_user(user):
                return queryset.filter(assigned_provider__user=user).distinct()
        elif not is_partner_user(user):
            # Organization-owned rows: only the provider's own organizations.
            if not organization_field:
                return queryset.none()
            return queryset.filter(**{f"{organization_field}__in": provider_org_ids}).distinct()
        # A provider-role account that is also partner staff is scoped as partner staff below.

    if is_partner_user(user):
        org_ids = organizations_for_user(user, organization_type=Organization.OrganizationType.PARTNER).values_list("pk", flat=True)
        queryset = queryset.filter(**{f"{organization_field}__in": org_ids})
        branch_qs = branches_for_user(user)
        branch_ids = list(branch_qs.values_list("pk", flat=True))
        if branch_field and is_branch_manager(user):
            queryset = queryset.filter(**{f"{branch_field}__in": branch_ids})
        return queryset.distinct()

    if is_customer_user(user):
        customer_org = customer_organization_for_user(user)
        if customer_org and organization_field:
            return queryset.filter(**{organization_field: customer_org}).distinct()
        return queryset.none()

    if is_platform_support(user):
        return queryset

    legacy_role = (getattr(user, "role", "") or "").lower()
    # Unscoped internal staff: an employee account that was never part of a
    # tenant. A tenant employee whose membership ended falls through to none().
    if legacy_role in {"employee", "support"} and not has_tenant_membership_history(user):
        return queryset

    return queryset.none()


def can_access_organization(user, organization):
    if organization is None:
        return False
    if is_platform_super_admin(user) or is_platform_support(user):
        return True
    return active_memberships_for_user(user).filter(organization=organization).exists()
