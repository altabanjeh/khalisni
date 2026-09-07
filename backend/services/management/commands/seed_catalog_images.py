"""Populate representative catalog imagery for the real Khalsni catalog.

This attaches **seed / default content** to ``Service.image`` and
``ServiceCategory.image`` for the catalog that is actually deployed (not the
demo seed). Every attached image is ordinary media: an administrator can
replace, reset or remove it from the admin screens
(``PATCH /api/admin/services/{id}/`` / ``/api/admin/service-categories/{id}/``
with ``image`` / ``clear_image``) without any code change. Nothing in the
request/response path maps images by id or name — the public UI renders
whatever ``image`` currently points at, and only falls back to the
Khalsni illustration engine when it is empty.

Source assets live in the repository under
``services/seed_assets/service_images/`` (per-service photos, Unsplash License —
see ``CREDITS.json``) and ``services/seed_assets/catalog_categories/``
(per-category covers). On seed they are copied into Khalsni's own configured
storage via the model ``ImageField`` — exactly like an admin upload — never
hot-linked and never referenced from ``/static`` or the frontend ``/public``
tree.

Usage::

    python manage.py seed_catalog_images --dry-run           # report, change nothing
    python manage.py seed_catalog_images                     # fill only empty image fields (idempotent)
    python manage.py seed_catalog_images --only categories   # restrict to one kind
    python manage.py seed_catalog_images --replace-system-seeded
                                                            # also re-attach where the CURRENT file
                                                            # is one we seeded before (never touches a
                                                            # file whose name does not look system-seeded,
                                                            # i.e. an admin upload is always kept)
"""
from __future__ import annotations

import re
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from services.models import Service, ServiceCategory

SEED_ROOT = Path(__file__).resolve().parents[2] / "seed_assets"
SERVICE_DIR = SEED_ROOT / "service_images"
CATEGORY_DIR = SEED_ROOT / "catalog_categories"

_EXTS = (".jpg", ".jpeg", ".png", ".webp")
_DJANGO_SUFFIX = re.compile(r"_[A-Za-z0-9]{7}$")  # storage de-dup suffix, e.g. photo_a1B2c3D.jpg

# service slug keyword -> category cover basename, for services whose slug is not
# individually mapped (future / renamed rows on production).
CATEGORY_KEYWORDS = (
    ("land", "land-and-survey"),
    ("survey", "land-and-survey"),
    ("cadastr", "land-and-survey"),
    ("property", "land-and-survey"),
    ("zoning", "land-and-survey"),
    ("mortgage", "land-and-survey"),
    ("building-permit", "land-and-survey"),
    ("عقار", "land-and-survey"),
    ("أراض", "land-and-survey"),
    ("business", "business_services"),
    ("company", "business_services"),
    ("commercial", "business_services"),
    ("trade", "business_services"),
    ("trademark", "business_services"),
    ("أعمال", "business_services"),
    ("شرك", "business_services"),
    ("تجار", "business_services"),
    ("passport", "civil-status-and-passports"),
    ("civil", "civil-status-and-passports"),
    ("criminal", "ministry-of-labour"),
    ("جواز", "civil-status-and-passports"),
    ("tax", "tax"),
    ("ضريب", "tax"),
    ("municipal", "municipal-services"),
    ("license", "municipal-services"),
    ("بلدي", "municipal-services"),
    ("labour", "ministry-of-labour"),
    ("labor", "ministry-of-labour"),
    ("عمل", "ministry-of-labour"),
    ("traffic", "quick-public-services"),
    ("quick", "quick-public-services"),
)


def _find(directory: Path, stem: str) -> Path | None:
    for ext in _EXTS:
        candidate = directory / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    return None


def _looks_system_seeded(image_field, valid_stems: set[str]) -> bool:
    """True when the CURRENT stored file is one this command produced before.

    An administrator upload keeps its original filename stem, which will not be
    a slug / known cover name, so it is never matched here.
    """
    name = getattr(image_field, "name", "") or ""
    if not name:
        return False
    stem = Path(name).stem
    stem = _DJANGO_SUFFIX.sub("", stem)
    return stem in valid_stems


class Command(BaseCommand):
    help = "Attach representative catalog images to services and categories that do not have one."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report only; write nothing.")
        parser.add_argument(
            "--replace-system-seeded",
            action="store_true",
            help="Also re-attach rows whose current image is one we seeded before "
            "(an admin-uploaded image is always kept).",
        )
        parser.add_argument(
            "--only",
            choices=("categories", "services"),
            default=None,
            help="Restrict to one kind.",
        )

    # ------------------------------------------------------------------ helpers
    def _category_manager(self):
        return getattr(ServiceCategory, "all_objects", ServiceCategory.objects)

    def _service_manager(self):
        return getattr(Service, "all_objects", Service.objects)

    def _resolve_category_asset(self, category) -> tuple[Path | None, str]:
        exact = _find(CATEGORY_DIR, category.slug or "")
        if exact:
            return exact, "slug"
        return None, "none"

    def _resolve_service_asset(self, service) -> tuple[Path | None, str]:
        exact = _find(SERVICE_DIR, service.slug or "")
        if exact:
            return exact, "slug"
        haystack = " ".join(
            str(x).lower()
            for x in (
                service.slug,
                getattr(service.category, "slug", ""),
                getattr(service.category, "name_ar", ""),
                getattr(service.category, "name_en", ""),
            )
        )
        for keyword, cover in CATEGORY_KEYWORDS:
            if keyword in haystack:
                candidate = _find(CATEGORY_DIR, cover) or _find(SERVICE_DIR, f"_fallback_{cover}")
                if candidate:
                    return candidate, f"category:{keyword}"
        default = _find(SERVICE_DIR, "_fallback_default")
        return (default, "default") if default else (None, "none")

    # ------------------------------------------------------------------- runner
    def _run_kind(self, *, label, rows, resolve, valid_stems, options, manager):
        dry = options["dry_run"]
        replace = options["replace_system_seeded"]
        discovered = with_image = seeded = unresolved = 0

        for row in rows:
            discovered += 1
            field = getattr(row, "image", None)
            has_image = bool(field and field.name)

            if has_image:
                with_image += 1
                if not (replace and _looks_system_seeded(field, valid_stems)):
                    continue

            asset, source = resolve(row)
            if asset is None:
                unresolved += 1
                self.stderr.write(self.style.WARNING(f"  ? {label} {row.slug!r}: no asset resolved"))
                continue

            published = (
                getattr(row, "is_active", True)
                and not getattr(row, "is_deleted", False)
                and getattr(row, "show_on_public_site", True)
            )
            mark = "~" if dry else ("*" if has_image else "+")
            self.stdout.write(
                f"  {mark} {label} {row.slug!r} <- {asset.name} ({source})"
                f"{'' if published else '  [not public]'}"
            )

            if not dry:
                # Save the file into configured storage, then write only the
                # image column with a bare UPDATE. We deliberately bypass
                # Model.save()/full_clean() here: it re-validates unrelated
                # fields (e.g. a pre-existing duplicate name_ar between a
                # published category and an old unpublished one), which is not
                # this command's concern.
                with asset.open("rb") as handle:
                    row.image.save(f"{row.slug}{asset.suffix.lower()}", ContentFile(handle.read()), save=False)
                manager.filter(pk=row.pk).update(image=row.image.name)
            seeded += 1

        return {
            "label": label,
            "discovered": discovered,
            "with_image": with_image,
            "seeded": seeded,
            "unresolved": unresolved,
        }

    def handle(self, *args, **options):
        dry = options["dry_run"]
        only = options["only"]
        results = []

        if not SERVICE_DIR.exists() or not CATEGORY_DIR.exists():
            self.stderr.write(self.style.ERROR(f"Seed asset dirs missing under {SEED_ROOT}"))
            return

        category_stems = {p.stem for p in CATEGORY_DIR.iterdir() if p.suffix.lower() in _EXTS}
        service_stems = {p.stem for p in SERVICE_DIR.iterdir() if p.suffix.lower() in _EXTS}
        category_stems |= {slug for slug in category_stems}

        if only in (None, "categories"):
            manager = self._category_manager()
            results.append(
                self._run_kind(
                    label="category",
                    rows=manager.all().order_by("category_id"),
                    resolve=self._resolve_category_asset,
                    valid_stems=category_stems,
                    options=options,
                    manager=manager,
                )
            )

        if only in (None, "services"):
            manager = self._service_manager()
            results.append(
                self._run_kind(
                    label="service",
                    rows=manager.select_related("category").all().order_by("service_id"),
                    resolve=self._resolve_service_asset,
                    valid_stems=service_stems | category_stems,
                    options=options,
                    manager=manager,
                )
            )

        self.stdout.write("")
        prefix = "DRY RUN — " if dry else ""
        for r in results:
            self.stdout.write(
                self.style.SUCCESS(
                    f"{prefix}{r['label']}s: discovered={r['discovered']} "
                    f"already-with-image={r['with_image']} seeded={r['seeded']} "
                    f"unresolved={r['unresolved']}"
                )
            )
