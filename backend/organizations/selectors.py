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
    return not memberships.filter(role__in=PLATFORM_STAFF_ROLES).exists()


def is_platform_super_admin(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if (getattr(user, "role", "") or "").lower() == "admin":
        return True
    return active_memberships_for_user(user).filter(role__in=PLATFORM_ADMIN_ROLES).exists()


def is_platform_support(user):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if is_platform_super_admin(user):
        return True
    legacy_role = (getattr(user, "role", "") or "").lower()
    if legacy_role == "support":
        return True
    return active_memberships_for_user(user).filter(role__in=PLATFORM_STAFF_ROLES).exists()


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


def enforce_organization_scope(queryset, *, user, organization_field="organization", branch_field=None):
    if is_platform_super_admin(user):
        return queryset

    if is_provider_user(user):
        provider_org_ids = organizations_for_user(user, organization_type=Organization.OrganizationType.PROVIDER).values_list("pk", flat=True)
        if not provider_org_ids:
            return queryset
        provider_filters = Q(assigned_provider_organization__in=provider_org_ids)
        return queryset.filter(provider_filters).distinct()

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
    if legacy_role in {"employee", "support"} and not active_memberships_for_user(user).exists():
        return queryset

    return queryset.none()


def can_access_organization(user, organization):
    if organization is None:
        return False
    if is_platform_super_admin(user) or is_platform_support(user):
        return True
    return active_memberships_for_user(user).filter(organization=organization).exists()
