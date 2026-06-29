from django.db.models import Prefetch, Q

from organizations.models import Organization, PartnerServiceConfig
from organizations.selectors import customer_organization_for_user, primary_partner_for_user, resolve_organization_by_ref
from services.models import Service, ServiceCategory


def resolve_service_organization_from_request(request):
    params = getattr(request, "query_params", {})
    org_ref = params.get("organization") or params.get("organization_slug") or request.headers.get("X-Organization")
    organization = resolve_organization_by_ref(org_ref)
    if organization is not None:
        return organization
    user = getattr(request, "user", None)
    if getattr(user, "is_authenticated", False):
        return customer_organization_for_user(user) or primary_partner_for_user(user)
    return None


def visible_services_queryset(*, organization=None):
    base_queryset = Service.objects.filter(
        is_active=True,
        is_deleted=False,
        show_on_public_site=True,
        category__is_active=True,
        category__is_deleted=False,
        category__show_on_public_site=True,
    ).select_related("category", "organization")

    if organization is None:
        return base_queryset.filter(scope=Service.Scope.GLOBAL)

    config_qs = PartnerServiceConfig.objects.filter(
        organization=organization,
        is_enabled=True,
    ).only("service_id", "visible_to_customers", "custom_name", "custom_price")

    configured_service_ids = list(config_qs.filter(visible_to_customers=True).values_list("service_id", flat=True))
    return base_queryset.filter(
        Q(scope=Service.Scope.GLOBAL, pk__in=configured_service_ids)
        | Q(organization=organization, scope__in=[Service.Scope.PARTNER_PRIVATE, Service.Scope.PARTNER_CUSTOMIZED])
    ).prefetch_related(Prefetch("partner_configs", queryset=config_qs, to_attr="_matched_partner_configs"))


def visible_service_categories_queryset(*, organization=None):
    services = visible_services_queryset(organization=organization)
    return ServiceCategory.objects.filter(
        is_active=True,
        is_deleted=False,
        show_on_public_site=True,
        services__in=services,
    ).select_related("parent").prefetch_related("children").distinct().order_by("sort_order", "display_order", "name_ar")
