from django.db.models import Q

from help_guides.models import HelpGuide
from organizations.selectors import (
    active_memberships_for_user,
    is_customer_user,
    is_partner_admin,
    is_partner_user,
    is_platform_super_admin,
    is_platform_support,
    is_provider_user,
)


def get_user_audience_codes(user) -> set[str]:
    audience_codes: set[str] = set()
    if not user or not getattr(user, "is_authenticated", False):
        return audience_codes

    legacy_role = (getattr(user, "role", "") or "").lower()
    if legacy_role:
        audience_codes.add(legacy_role)

    membership_roles = active_memberships_for_user(user).values_list("role", flat=True)
    audience_codes.update(str(role) for role in membership_roles)

    if is_platform_super_admin(user):
        audience_codes.update({"admin", "employee", "support", "platform_super_admin"})
    if is_platform_support(user):
        audience_codes.update({"support", "employee", "platform_support"})
    if is_partner_user(user):
        audience_codes.add("employee")
    if is_partner_admin(user):
        audience_codes.add("partner_admin")
    if is_provider_user(user):
        audience_codes.add("provider")
    if is_customer_user(user):
        audience_codes.add("customer")

    return audience_codes


def get_readable_help_guides_queryset(user):
    audience_codes = get_user_audience_codes(user)
    permission_codes = set(user.get_all_permissions()) if getattr(user, "is_authenticated", False) else set()

    queryset = HelpGuide.objects.filter(is_active=True).filter(
        Q(role__in=audience_codes) | Q(role=HelpGuide.Audience.ALL_USERS)
    )
    if permission_codes:
        queryset = queryset.filter(Q(permission_key="") | Q(permission_key__in=permission_codes))
    else:
        queryset = queryset.filter(permission_key="")
    return queryset


def _guide_priority(guide: HelpGuide, *, screen_key: str, workflow_status: str) -> int | None:
    screen_matches = guide.screen_key == screen_key
    general_screen = guide.screen_key == ""
    if not screen_matches and not general_screen:
        return None

    workflow_matches = not guide.workflow_status or guide.workflow_status == workflow_status
    if not workflow_matches:
        return None

    role_specific = guide.role != HelpGuide.Audience.ALL_USERS
    has_permission = bool(guide.permission_key)
    has_workflow = bool(guide.workflow_status)

    if screen_matches and role_specific and has_permission and has_workflow:
        return 10
    if screen_matches and role_specific and has_permission:
        return 20
    if screen_matches and role_specific and has_workflow:
        return 25
    if screen_matches and role_specific:
        return 30
    if screen_matches and has_workflow:
        return 35
    if screen_matches:
        return 40
    if general_screen and role_specific and has_permission and has_workflow:
        return 45
    if general_screen and role_specific and has_permission:
        return 48
    if general_screen and role_specific and has_workflow:
        return 49
    if general_screen and role_specific:
        return 50
    if general_screen:
        return 60
    return None


def get_help_guides_for_screen(user, *, screen_key: str, workflow_status: str = ""):
    candidates = []
    for guide in get_readable_help_guides_queryset(user).order_by("display_order", "title", "help_guide_id"):
        priority = _guide_priority(guide, screen_key=screen_key, workflow_status=workflow_status or "")
        if priority is None:
            continue
        candidates.append((priority, guide))

    if not candidates:
        return [], None

    best_priority = min(priority for priority, _guide in candidates)
    guides = [guide for priority, guide in candidates if priority == best_priority]
    guides.sort(key=lambda item: (item.display_order, item.title, item.pk))
    return guides, best_priority

