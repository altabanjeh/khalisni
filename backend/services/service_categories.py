from django.core.exceptions import ValidationError


def ensure_category_parent_not_circular(*, category):
    parent = category.parent
    visited = {category.pk} if category.pk else set()

    while parent is not None:
        if parent.pk in visited:
            raise ValidationError({"parent": "Circular category hierarchy is not allowed."})
        visited.add(parent.pk)
        parent = parent.parent


def category_snapshot(category):
    return {
        "name_ar": category.name_ar,
        "name_en": category.name_en,
        "slug": category.slug,
        "parent_id": category.parent_id,
        "color": category.color,
        "sort_order": category.sort_order,
        "is_active": category.is_active,
        "show_on_public_site": category.show_on_public_site,
    }
