"""The client's eight public category "worlds" (owner decision CN-ACT-04).

Client note (Khalsni_Developer_Final_Action_Notes_AR_v2.docx §4):
«حافظ على التصنيفات: العقارات والأراضي، خدمات الأعمال، الضرائب والرسوم، المركبات والنقل،
العمالة والإقامة، الوثائق والتصديقات، الخدمات الدولية، وطلب خاص.»

``apply_client_categories`` maps the real catalogue onto these eight
categories. It is used by migration ``services.0017`` with historical models
and can be re-run safely:

* existing categories keep their id and slug (public URLs keep working); a name,
  description or sort order is only changed while it still holds the known
  pre-decision value, so a later admin edit is never overwritten;
* the two categories that do not exist yet are created (published, empty);
* a service is only moved while it is still in its known previous category;
* retired categories are hidden from the public site, never deleted; the three
  "???" debug categories and their "????" services are soft-deleted;
* nothing runs on a database without the real catalogue (no mapped category
  exists), so fresh installs and test databases are untouched;
* orders are not touched (they keep ``service_category_name_snapshot``).
"""

from django.utils import timezone

# Display order is the order of the client note.
PUBLIC_CATEGORY_WORLDS = (
    {
        "slug": "land-and-survey",
        "name_ar": "العقارات والأراضي",
        "name_en": "Real Estate and Land",
        "previous_names_ar": ("العقارات والأراضي",),
        "previous_names_en": ("Land and Survey",),
        "previous_sort_orders": (1,),
        "sort_order": 1,
    },
    {
        "slug": "business_services",
        "name_ar": "خدمات الأعمال",
        "name_en": "Business Services",
        "previous_names_ar": ("خدمات الأعمال والشركات",),
        "previous_names_en": ("Business Services",),
        "previous_sort_orders": (2,),
        "sort_order": 2,
    },
    {
        "slug": "tax",
        "name_ar": "الضرائب والرسوم",
        "name_en": "Taxes and Fees",
        "previous_names_ar": ("ضريبة الدخل والمبيعات",),
        "previous_names_en": ("Tax",),
        "previous_sort_orders": (3,),
        "sort_order": 3,
    },
    {
        "slug": "quick-public-services",
        "name_ar": "المركبات والنقل",
        "name_en": "Vehicles and Transport",
        "previous_names_ar": ("خدمات عامة سريعة",),
        "previous_names_en": ("Quick Public Services",),
        "previous_sort_orders": (2,),
        "sort_order": 4,
        # The old description ("fast public requests") no longer describes the category.
        "previous_descriptions": (
            ("معاملات يمكن البدء بها بسرعة ومتابعتها إلكترونياً.", "Fast public requests that can be started and tracked online."),
        ),
        "description_ar": "خدمات المركبات والنقل.",
        "description_en": "Vehicle and transport services.",
    },
    {
        "slug": "ministry-of-labour",
        "name_ar": "العمالة والإقامة",
        "name_en": "Labour and Residency",
        "previous_names_ar": ("وزارة العمل",),
        "previous_names_en": ("Ministry of Labour",),
        "previous_sort_orders": (5,),
        "sort_order": 5,
    },
    {
        "slug": "civil-status-and-passports",
        "name_ar": "الوثائق والتصديقات",
        "name_en": "Documents and Attestations",
        "previous_names_ar": ("الأحوال المدنية والجوازات",),
        "previous_names_en": ("Civil Status and Passports",),
        "previous_sort_orders": (1,),
        "sort_order": 6,
    },
    {
        "slug": "international-services",
        "name_ar": "الخدمات الدولية",
        "name_en": "International Services",
        "create": True,
        "icon": "globe",
        "sort_order": 7,
    },
    {
        "slug": "special-request",
        "name_ar": "طلب خاص",
        "name_en": "Special Request",
        "create": True,
        "icon": "clipboard-list",
        "sort_order": 8,
    },
)

PUBLIC_CATEGORY_SLUGS = tuple(world["slug"] for world in PUBLIC_CATEGORY_WORLDS)
# Rendered by the web/mobile clients as a link to the special-request form.
SPECIAL_REQUEST_CATEGORY_SLUG = "special-request"

# service slug -> (category slug it must still be in, target category slug)
SERVICE_MOVES = {
    "business-license-renewal": ("municipal-services", "business_services"),
    "no-criminal-record-certificate": ("ministry-of-labour", "civil-status-and-passports"),
    "no-criminal-record": ("civil-status", "civil-status-and-passports"),
    "passport-renewal": ("civil-status", "civil-status-and-passports"),
}

# Hidden from the public site (kept, with their history).
RETIRED_CATEGORY_SLUGS = ("municipal-services", "social-security", "civil-status", "general")

DEBUG_CATEGORY_SLUGS = ("category-debug", "category-debug-2", "category-debug-3")
DEBUG_SERVICE_SLUGS = ("service-debug", "service-debug-2", "service-debug-3")
DEBUG_NAMES = ("???", "????")
DEBUG_DELETE_REASON = "Debug record from development data; soft-deleted by owner decision B10-7/CN-ACT-04 (total-closure pass)."

# Only the real catalogue has these: their presence is the signal to run.
_SIGNAL_SLUGS = tuple(world["slug"] for world in PUBLIC_CATEGORY_WORLDS if not world.get("create")) + RETIRED_CATEGORY_SLUGS


def apply_client_categories(ServiceCategory, Service, *, log=None):
    """Apply the plan. Returns the list of human-readable changes (empty when nothing changed)."""
    changes = [] if log is None else log
    categories = ServiceCategory._base_manager
    services = Service._base_manager
    if not categories.filter(slug__in=_SIGNAL_SLUGS, is_deleted=False).exists():
        return changes
    now = timezone.now()

    by_slug = {}
    for world in PUBLIC_CATEGORY_WORLDS:
        category = categories.filter(slug=world["slug"]).first()
        if category is None:
            if not world.get("create"):
                continue
            category = categories.create(
                slug=world["slug"],
                name_ar=world["name_ar"],
                name_en=world["name_en"],
                icon=world.get("icon", ""),
                sort_order=world["sort_order"],
                display_order=world["sort_order"],
                is_active=True,
                show_on_public_site=True,
            )
            changes.append(f"category {category.pk} {world['slug']}: created «{world['name_ar']}» / {world['name_en']}")
            by_slug[world["slug"]] = category
            continue
        by_slug[world["slug"]] = category
        updates = {}
        if category.name_ar != world["name_ar"] and category.name_ar in world.get("previous_names_ar", ()):
            updates["name_ar"] = world["name_ar"]
        if category.name_en != world["name_en"] and category.name_en in world.get("previous_names_en", ()):
            updates["name_en"] = world["name_en"]
        if category.sort_order != world["sort_order"] and category.sort_order in world.get("previous_sort_orders", ()):
            updates["sort_order"] = world["sort_order"]
            updates["display_order"] = world["sort_order"]
        if (category.description_ar, category.description_en) in world.get("previous_descriptions", ()):
            updates["description_ar"] = world["description_ar"]
            updates["description_en"] = world["description_en"]
        if updates:
            categories.filter(pk=category.pk).update(updated_at=now, **updates)
            changes.append(f"category {category.pk} {world['slug']}: " + ", ".join(f"{name} -> {value!r}" for name, value in sorted(updates.items())))

    for service_slug, (from_slug, to_slug) in SERVICE_MOVES.items():
        target = by_slug.get(to_slug)
        if target is None:
            continue
        moved = services.filter(slug=service_slug, category__slug=from_slug).update(category=target, updated_at=now)
        if moved:
            changes.append(f"service {service_slug}: moved from {from_slug} to {to_slug}")

    retired = categories.filter(slug__in=RETIRED_CATEGORY_SLUGS, show_on_public_site=True, is_deleted=False)
    for category in retired:
        changes.append(f"category {category.pk} {category.slug}: hidden from the public site (kept)")
    retired.update(show_on_public_site=False, updated_at=now)

    for service in services.filter(slug__in=DEBUG_SERVICE_SLUGS, name_ar__in=DEBUG_NAMES, is_deleted=False):
        services.filter(pk=service.pk).update(
            is_deleted=True, is_active=False, show_on_public_site=False, deleted_at=now,
            delete_reason=DEBUG_DELETE_REASON, updated_at=now,
        )
        changes.append(f"service {service.pk} {service.slug}: soft-deleted (debug record)")
    for category in categories.filter(slug__in=DEBUG_CATEGORY_SLUGS, name_ar__in=DEBUG_NAMES, is_deleted=False):
        categories.filter(pk=category.pk).update(
            is_deleted=True, is_active=False, show_on_public_site=False, deleted_at=now,
            delete_reason=DEBUG_DELETE_REASON, updated_at=now,
        )
        changes.append(f"category {category.pk} {category.slug}: soft-deleted (debug record)")
    return changes
