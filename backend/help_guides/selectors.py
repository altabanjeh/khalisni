from collections import defaultdict

from django.db.models import Q

from help_guides.fallbacks import (
    build_searchable_fallback_rows,
    build_service_fallback,
    build_workflow_fallbacks,
    get_fallback_action_guides,
    get_fallback_field_guides,
)
from help_guides.models import HelpGuide, HelpGuideAction, HelpGuideField, HelpGuideService, HelpGuideWorkflow
from organizations.selectors import (
    active_memberships_for_user,
    is_customer_user,
    is_partner_admin,
    is_partner_user,
    is_platform_super_admin,
    is_platform_support,
    is_provider_user,
)
from services.models import Service


def _guide_queryset():
    return HelpGuide.objects.filter(is_deleted=False).prefetch_related(
        "screenshots",
        "related_guides",
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

    audience_codes.add(HelpGuide.Audience.ALL_USERS)
    return audience_codes


def get_preview_audience_codes(preview_role: str) -> set[str]:
    preview_role = str(preview_role or "").strip().lower()
    if not preview_role:
        return set()
    return {preview_role, HelpGuide.Audience.ALL_USERS}


def _permission_codes(user) -> set[str]:
    return set(user.get_all_permissions()) if getattr(user, "is_authenticated", False) else set()


def _apply_visibility_filters(queryset, *, user, preview_role: str = "", include_permission_restricted: bool = False):
    audience_codes = get_preview_audience_codes(preview_role) or get_user_audience_codes(user)
    permission_codes = _permission_codes(user)
    queryset = queryset.filter(is_active=True).filter(Q(role__in=audience_codes) | Q(role=HelpGuide.Audience.ALL_USERS))

    if include_permission_restricted:
        return queryset

    if permission_codes:
        return queryset.filter(Q(permission_key="") | Q(permission_key__in=permission_codes))
    return queryset.filter(permission_key="")


def get_readable_help_guides_queryset(user, *, preview_role: str = "", include_permission_restricted: bool = False):
    return _apply_visibility_filters(
        _guide_queryset(),
        user=user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    )


def get_readable_entity_queryset(model, user, *, preview_role: str = "", include_permission_restricted: bool = False):
    return _apply_visibility_filters(
        model.objects.filter(is_deleted=False),
        user=user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    )


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


def get_screen_guides_for_context(user, *, screen_key: str, workflow_status: str = "", preview_role: str = "", include_permission_restricted: bool = False):
    candidates = []
    queryset = get_readable_help_guides_queryset(
        user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    ).order_by("display_order", "title", "help_guide_id")

    for guide in queryset:
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


def _dedupe_rows(rows, key_name):
    deduped = {}
    for row in rows:
        key = row.get(key_name) if isinstance(row, dict) else getattr(row, key_name, None)
        deduped.setdefault(key, row)
    return list(deduped.values())


def get_field_guides_for_context(user, *, screen_key: str, preview_role: str = "", include_permission_restricted: bool = False):
    database_rows = list(
        get_readable_entity_queryset(
            HelpGuideField,
            user,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        .filter(screen_key=screen_key)
        .order_by("display_order", "field_label", "id")
    )

    existing_keys = {row.field_key for row in database_rows}
    fallback_rows = [
        {"screen_key": screen_key, "role": HelpGuide.Audience.ALL_USERS, "source": "registry", **row}
        for row in get_fallback_field_guides(screen_key)
        if row.get("field_key") not in existing_keys
    ]
    return database_rows + fallback_rows


def get_action_guides_for_context(user, *, screen_key: str, workflow_status: str = "", preview_role: str = "", include_permission_restricted: bool = False):
    queryset = get_readable_entity_queryset(
        HelpGuideAction,
        user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    ).filter(screen_key=screen_key)
    if workflow_status:
        queryset = queryset.filter(Q(status_before="") | Q(status_before=workflow_status))
    database_rows = list(queryset.order_by("display_order", "button_label", "id"))
    existing_keys = {row.button_key for row in database_rows}

    fallback_rows = []
    for row in get_fallback_action_guides(screen_key):
        if row.get("button_key") in existing_keys:
            continue
        status_before = row.get("status_before", "")
        if workflow_status and status_before and status_before != workflow_status:
            continue
        fallback_rows.append({"screen_key": screen_key, "source": "registry", **row})
    return database_rows + fallback_rows


def get_workflow_guides_for_context(user, *, screen_key: str, current_status: str = "", preview_role: str = "", include_permission_restricted: bool = False):
    queryset = get_readable_entity_queryset(
        HelpGuideWorkflow,
        user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    ).filter(Q(screen_key=screen_key) | Q(screen_key=""))
    if current_status:
        queryset = queryset.filter(Q(current_status="") | Q(current_status=current_status))
    database_rows = list(queryset.order_by("display_order", "workflow_key", "id"))
    existing_keys = {(row.current_status, row.action_key, row.next_status) for row in database_rows}

    fallback_rows = []
    for row in build_workflow_fallbacks(screen_key, current_status):
        compound_key = (row.get("current_status"), row.get("action_key"), row.get("next_status"))
        if compound_key not in existing_keys:
            fallback_rows.append(row)

    return database_rows + fallback_rows


def get_service_guide_for_context(user, *, service_id, screen_key: str = "", preview_role: str = "", include_permission_restricted: bool = False):
    if not service_id:
        return None

    queryset = (
        get_readable_entity_queryset(
            HelpGuideService,
            user,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        .filter(service_id=service_id)
        .select_related("service", "service__category")
        .order_by("display_order", "id")
    )
    service_guide = queryset.first()
    if service_guide:
        return service_guide

    try:
        service = (
            Service.objects.select_related("category")
            .filter(is_deleted=False, category__is_deleted=False)
            .prefetch_related("document_requirements", "incoming_relations__source_service", "outgoing_relations__target_service")
            .get(pk=service_id)
        )
    except Service.DoesNotExist:
        return None

    fallback = build_service_fallback(service)
    fallback["screen_key"] = screen_key
    return fallback


def build_contextual_help_payload(user, *, screen_key: str, workflow_status: str = "", service_id=None, preview_role: str = "", include_permission_restricted: bool = False):
    screen_guides, fallback_priority = get_screen_guides_for_context(
        user,
        screen_key=screen_key,
        workflow_status=workflow_status,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    )
    return {
        "screen_guides": screen_guides,
        "actions": get_action_guides_for_context(
            user,
            screen_key=screen_key,
            workflow_status=workflow_status,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        ),
        "fields": get_field_guides_for_context(
            user,
            screen_key=screen_key,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        ),
        "workflows": get_workflow_guides_for_context(
            user,
            screen_key=screen_key,
            current_status=workflow_status,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        ),
        "service": get_service_guide_for_context(
            user,
            service_id=service_id,
            screen_key=screen_key,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        ),
        "fallback_priority": fallback_priority,
    }


def get_manual_index_guides(
    user,
    *,
    category: str = "",
    search: str = "",
    slug: str = "",
    preview_role: str = "",
    include_permission_restricted: bool = False,
):
    queryset = get_readable_help_guides_queryset(
        user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    ).order_by("category", "display_order", "title", "help_guide_id")

    if category:
        queryset = queryset.filter(category=category)
    if slug:
        queryset = queryset.filter(slug=slug)
    if search:
        normalized_search = str(search).strip()
        queryset = queryset.filter(
            Q(title__icontains=normalized_search)
            | Q(short_description__icontains=normalized_search)
            | Q(purpose__icontains=normalized_search)
            | Q(before_you_start__icontains=normalized_search)
            | Q(step_by_step_guide__icontains=normalized_search)
            | Q(expected_result__icontains=normalized_search)
            | Q(common_errors__icontains=normalized_search)
            | Q(troubleshooting__icontains=normalized_search)
            | Q(search_keywords__icontains=normalized_search)
            | Q(slug__icontains=normalized_search)
            | Q(screen_key__icontains=normalized_search)
        )
    return list(queryset)


def get_manual_quick_links(
    user,
    *,
    preview_role: str = "",
    include_permission_restricted: bool = False,
):
    return list(
        get_readable_help_guides_queryset(
            user,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        .filter(is_quick_link=True)
        .order_by("display_order", "title", "help_guide_id")
    )


def _search_matches(row, query: str, keys: list[str]) -> bool:
    haystack = " ".join(str(row.get(key, "")) for key in keys).lower()
    return query in haystack


def search_help_content(user, *, query: str, preview_role: str = "", include_permission_restricted: bool = False):
    normalized_query = str(query or "").strip().lower()
    if not normalized_query:
        return {"screens": [], "actions": [], "fields": [], "services": [], "workflows": []}

    results = defaultdict(list)

    for guide in get_readable_help_guides_queryset(
        user,
        preview_role=preview_role,
        include_permission_restricted=include_permission_restricted,
    ):
        row = {
            "id": guide.pk,
            "screen_key": guide.screen_key,
            "slug": guide.slug,
            "category": guide.category,
            "title": guide.title,
            "short_description": guide.short_description,
            "purpose": guide.purpose,
            "troubleshooting": guide.troubleshooting,
            "search_keywords": guide.search_keywords,
            "role": guide.role,
        }
        if _search_matches(row, normalized_query, ["screen_key", "slug", "category", "title", "short_description", "purpose", "troubleshooting", "search_keywords"]):
            results["screens"].append(guide)

    for model, bucket, keys in (
        (HelpGuideAction, "actions", ["screen_key", "button_key", "button_label", "purpose", "when_to_use", "search_keywords"]),
        (HelpGuideField, "fields", ["screen_key", "field_key", "field_label", "purpose", "validation_rule", "search_keywords"]),
        (HelpGuideService, "services", ["screen_key", "description", "who_can_use", "workflow_summary", "search_keywords"]),
        (HelpGuideWorkflow, "workflows", ["screen_key", "workflow_key", "action_key", "action_label", "system_effect", "search_keywords"]),
    ):
        queryset = get_readable_entity_queryset(
            model,
            user,
            preview_role=preview_role,
            include_permission_restricted=include_permission_restricted,
        )
        for item in queryset:
            row = {key: getattr(item, key, "") for key in keys}
            if _search_matches(row, normalized_query, keys):
                results[bucket].append(item)

    fallback_rows = build_searchable_fallback_rows()
    for bucket, rows in fallback_rows.items():
        for row in rows:
            if preview_role and row.get("role") not in {preview_role, HelpGuide.Audience.ALL_USERS}:
                continue
            searchable_keys = {
                "actions": ["screen_key", "button_key", "button_label", "purpose", "when_to_use"],
                "fields": ["screen_key", "field_key", "field_label", "purpose", "validation_rule"],
                "workflows": ["screen_key", "workflow_key", "action_key", "action_label", "system_effect"],
            }.get(bucket, [])
            if _search_matches(row, normalized_query, searchable_keys):
                results[bucket].append(row)

    deduped = {
        "screens": list(results["screens"]),
        "actions": _dedupe_rows(results["actions"], "button_key"),
        "fields": _dedupe_rows(results["fields"], "field_key"),
        "services": list(results["services"]),
        "workflows": _dedupe_rows(results["workflows"], "workflow_key"),
    }
    return deduped
