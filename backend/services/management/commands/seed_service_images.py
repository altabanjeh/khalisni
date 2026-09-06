"""Assign initial representative images to existing services.

These images are **seed / default content**, not application logic: every one of
them can be replaced, reset, or removed later by an administrator from the
service edit screen (``PATCH /api/admin/services/{id}/`` with an ``image`` /
``clear_image`` field) without any code change. Nothing in the request/response
path maps images by service id or name — the public UI simply renders whatever
``Service.image`` currently points at, or the Khalsni-branded placeholder when
it is empty.

Source & licence of every file: ``services/seed_assets/service_images/CREDITS.json``
(all Unsplash License — free for commercial use, no attribution required). Files
are stored inside the repository and copied into Khalsni's own media storage on
seed; they are never hot-linked.

Usage::

    python manage.py seed_service_images            # fill only services with no image
    python manage.py seed_service_images --force    # also overwrite existing images
    python manage.py seed_service_images --dry-run  # report, change nothing
"""
from __future__ import annotations

import json
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand

from services.models import Service

ASSET_DIR = Path(__file__).resolve().parents[2] / "seed_assets" / "service_images"

# Category-slug keyword -> fallback asset basename. Used for services whose slug
# is not individually mapped (e.g. future / renamed services on production).
CATEGORY_FALLBACKS = (
    ("land", "_fallback_land-and-survey"),
    ("survey", "_fallback_land-and-survey"),
    ("real-estate", "_fallback_land-and-survey"),
    ("property", "_fallback_land-and-survey"),
    ("عقار", "_fallback_land-and-survey"),
    ("أراض", "_fallback_land-and-survey"),
    ("business", "_fallback_business"),
    ("company", "_fallback_business"),
    ("أعمال", "_fallback_business"),
    ("شرك", "_fallback_business"),
    ("passport", "_fallback_civil-status"),
    ("civil", "_fallback_civil-status"),
    ("جواز", "_fallback_civil-status"),
    ("tax", "_fallback_tax"),
    ("ضريب", "_fallback_tax"),
    ("municipal", "_fallback_municipal"),
    ("بلدي", "_fallback_municipal"),
    ("labour", "_fallback_labour"),
    ("labor", "_fallback_labour"),
    ("عمل", "_fallback_labour"),
    ("quick", "_fallback_quick"),
)
DEFAULT_FALLBACK = "_fallback_default"


class Command(BaseCommand):
    help = "Assign initial representative images to services that do not have one."

    def add_arguments(self, parser):
        parser.add_argument("--force", action="store_true", help="Overwrite images that are already set.")
        parser.add_argument("--dry-run", action="store_true", help="Report only; do not write.")

    def _resolve_asset(self, service):
        exact = ASSET_DIR / f"{service.slug}.jpg"
        if exact.exists():
            return exact, "slug"
        category_slug = (getattr(service.category, "slug", "") or "").lower()
        category_name = f"{getattr(service.category, 'name_ar', '')} {getattr(service.category, 'name_en', '')}".lower()
        haystack = f"{category_slug} {category_name}"
        for keyword, basename in CATEGORY_FALLBACKS:
            if keyword in haystack:
                candidate = ASSET_DIR / f"{basename}.jpg"
                if candidate.exists():
                    return candidate, f"category:{keyword}"
        default = ASSET_DIR / f"{DEFAULT_FALLBACK}.jpg"
        return (default, "default") if default.exists() else (None, "none")

    def handle(self, *args, **options):
        force = options["force"]
        dry_run = options["dry_run"]
        verbosity = options.get("verbosity", 1)

        if not ASSET_DIR.exists():
            self.stderr.write(self.style.ERROR(f"Asset directory not found: {ASSET_DIR}"))
            return

        credits_path = ASSET_DIR / "CREDITS.json"
        credits = {}
        if credits_path.exists():
            credits = json.loads(credits_path.read_text(encoding="utf-8")).get("images", {})

        assigned = skipped = unresolved = 0
        services = Service.all_objects.all() if hasattr(Service, "all_objects") else Service.objects.all()
        for service in services.select_related("category").order_by("service_id"):
            has_image = bool(getattr(service, "image", None) and service.image.name)
            if has_image and not force:
                skipped += 1
                continue

            asset_path, source = self._resolve_asset(service)
            if asset_path is None:
                unresolved += 1
                self.stderr.write(self.style.WARNING(f"  ? {service.slug}: no asset resolved"))
                continue

            if verbosity >= 1:
                credit = credits.get(asset_path.name, {})
                note = f" [{credit.get('source_url', 'local asset')}]" if credit else ""
                self.stdout.write(f"  {'~' if dry_run else '+'} {service.slug} <- {asset_path.name} ({source}){note}")

            if not dry_run:
                with asset_path.open("rb") as handle:
                    service.image.save(f"{service.slug}.jpg", ContentFile(handle.read()), save=False)
                service.save(update_fields=["image", "updated_at"])
            assigned += 1

        summary = f"seed_service_images: assigned={assigned} skipped(existing)={skipped} unresolved={unresolved}"
        self.stdout.write(self.style.SUCCESS(("DRY RUN — " if dry_run else "") + summary))
