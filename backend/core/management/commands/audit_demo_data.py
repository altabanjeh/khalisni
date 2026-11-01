"""Find demo, debug and QA records before a release (owner decision B10-7 / B8).

    python manage.py audit_demo_data             # report only (read-only)
    python manage.py audit_demo_data --apply     # soft-deactivate what was found
    python manage.py audit_demo_data --strict    # exit 1 while anything is found (release gate)

Supersedes the account-only ``audit_demo_accounts`` check (which stays
available, read-only, for its password report): this command covers accounts,
services, categories, document definitions, advertisements, public-site
content and providers.

``--apply`` never deletes anything and never touches orders or their history:
users are deactivated (``is_active=False``), services and categories are
soft-deleted with a reason, advertisements and QA document definitions are
deactivated, providers are made unavailable. Every change writes an audit log
entry. Demo public-site content (CMS row, theme) is reported only: replacing
it needs the owner's content.

Guest-checkout customers («…@guest.khalisni.local») can be real people who
ordered without an account, so they are listed for review and are only
deactivated with ``--include-guests``.
"""

import re

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

DEBUG_NAMES = ("???", "????")
QA_PREFIX = "client-audit-qa-"
DEMO_USER_DOMAINS = ("@khalisni.local", "@example.com", "@example.org", "@example.net", "@example.test")
GUEST_DOMAIN = "@guest.khalisni.local"
SEED_SYSTEM_EMAIL = "seed-system@internal.local"
DEMO_TEXT = re.compile(r"(تجريبي|تجريبية|التجريبية|\bdemo\b|\btest(ing)?\b|\bdebug\b|\bsample\b|\bdummy\b)", re.IGNORECASE)
TESTER_PROVIDER_TYPES = ("tester", "test", "debug")
REASON = "Demo/debug/QA record deactivated by audit_demo_data --apply (owner decision B10-7)."


class Finding:
    def __init__(self, kind, model, record, label, reason, action, *, review_only=False):
        self.kind = kind
        self.model = model
        self.record = record
        self.label = label
        self.reason = reason
        self.action = action
        self.review_only = review_only

    @property
    def pk(self):
        return self.record.pk


def _demo_user_reason(user):
    email = (user.email or "").lower()
    if email == SEED_SYSTEM_EMAIL:
        return "seed system actor"
    if email.startswith(QA_PREFIX):
        return "QA seed account"
    if "debug" in email:
        return "debug account"
    for domain in DEMO_USER_DOMAINS:
        if email.endswith(domain):
            return f"demo/reserved domain {domain}"
    return None


class Command(BaseCommand):
    help = (
        "Report demo/debug/QA records (users, services, categories, ads, CMS markers, Tester providers). "
        "--apply soft-deactivates them (never deletes; orders untouched); --strict exits 1 when any are found."
    )

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Soft-deactivate the records found (with an audit log entry).")
        parser.add_argument("--strict", action="store_true", help="Exit with status 1 while any record is found (release gate).")
        parser.add_argument(
            "--include-guests", action="store_true",
            help="Also treat guest-checkout customers (@guest.khalisni.local) as demo accounts.",
        )

    # ------------------------------------------------------------------ detect
    def collect(self, *, include_guests=False):
        from accounts.models import CustomUser
        from providers.models import ProviderProfile
        from public_site.defaults import DEFAULT_SAMPLE_ADVERTISEMENT
        from public_site.models import Advertisement, PublicPageContent, SiteTheme
        from services.models import RequiredDocumentDefinition, Service, ServiceCategory

        findings = []

        for user in CustomUser._base_manager.filter(is_active=True, is_deleted=False).order_by("pk"):
            reason = _demo_user_reason(user)
            email = (user.email or "").lower()
            if reason is None and email.endswith(GUEST_DOMAIN):
                findings.append(Finding(
                    "user", "CustomUser", user, user.email,
                    "guest-checkout customer (may be a real person)",
                    "deactivate" if include_guests else "review (use --include-guests to deactivate)",
                    review_only=not include_guests,
                ))
                continue
            if reason is None:
                continue
            if user.is_superuser:
                reason += "; SUPERUSER"
            findings.append(Finding("user", "CustomUser", user, user.email, reason, "deactivate"))

        debug_service = Q(name_ar__in=DEBUG_NAMES) | Q(slug__icontains="debug") | Q(slug__startswith=QA_PREFIX)
        for service in Service._base_manager.filter(debug_service, is_deleted=False).order_by("pk"):
            reason = "QA-namespaced service" if service.slug.startswith(QA_PREFIX) else "debug service"
            findings.append(Finding("service", "Service", service, f"{service.slug} «{service.name_ar}»", reason, "soft-delete"))

        debug_category = Q(name_ar__in=DEBUG_NAMES) | Q(slug__icontains="debug") | Q(slug__startswith=QA_PREFIX)
        for category in ServiceCategory._base_manager.filter(debug_category, is_deleted=False).order_by("pk"):
            reason = "QA-namespaced category" if category.slug.startswith(QA_PREFIX) else "debug category"
            findings.append(Finding("category", "ServiceCategory", category, f"{category.slug} «{category.name_ar}»", reason, "soft-delete"))

        for definition in RequiredDocumentDefinition._base_manager.filter(
            code__startswith=QA_PREFIX, is_deleted=False, is_active=True
        ).order_by("pk"):
            findings.append(Finding("document definition", "RequiredDocumentDefinition", definition, definition.code,
                                    "QA-namespaced document definition", "deactivate"))

        for advertisement in Advertisement._base_manager.filter(is_deleted=False, is_active=True).order_by("pk"):
            text = " ".join(
                str(getattr(advertisement, name, "") or "")
                for name in ("title_ar", "title_en", "description_ar", "description_en")
            )
            if advertisement.title_ar == DEFAULT_SAMPLE_ADVERTISEMENT["title_ar"]:
                reason = "seeded sample advertisement"
            elif DEMO_TEXT.search(text):
                reason = f"demo marker «{DEMO_TEXT.search(text).group(0)}»"
            else:
                continue
            findings.append(Finding("advertisement", "Advertisement", advertisement,
                                    f"{advertisement.pk} «{advertisement.title_ar}»", reason, "deactivate"))

        for content in PublicPageContent.objects.filter(active_content=True).order_by("pk"):
            if DEMO_TEXT.search(content.version_name or ""):
                findings.append(Finding("public content", "PublicPageContent", content, content.version_name,
                                        "published homepage content row is named as demo content",
                                        "manual: publish owner-approved content (not changed automatically)"))
        for theme in SiteTheme.objects.filter(active_theme=True).order_by("pk"):
            if DEMO_TEXT.search(theme.name or ""):
                findings.append(Finding("public theme", "SiteTheme", theme, theme.name, "theme named as demo",
                                        "manual: review the theme (not changed automatically)"))

        provider_filter = Q()
        for value in TESTER_PROVIDER_TYPES:
            provider_filter |= Q(provider_type__iexact=value)
        for provider in ProviderProfile._base_manager.filter(provider_filter, is_available=True).select_related("user").order_by("pk"):
            findings.append(Finding("provider", "ProviderProfile", provider,
                                    f"{provider.pk} ({getattr(provider.user, 'email', '')})",
                                    f"provider type «{provider.provider_type}»", "make unavailable"))
        return findings

    # ------------------------------------------------------------------- apply
    def _apply(self, finding):
        from audit.models import AuditLog
        from audit.utils import create_audit_log

        record = finding.record
        model = type(record)
        now = timezone.now()
        if finding.kind == "user":
            old, new = {"is_active": True}, {"is_active": False}
            model._base_manager.filter(pk=record.pk).update(is_active=False)
        elif finding.kind in ("service", "category"):
            old = {"is_deleted": False, "is_active": record.is_active, "show_on_public_site": record.show_on_public_site}
            new = {"is_deleted": True, "is_active": False, "show_on_public_site": False}
            model._base_manager.filter(pk=record.pk).update(deleted_at=now, delete_reason=REASON, **new)
        elif finding.kind in ("advertisement", "document definition"):
            old, new = {"is_active": True}, {"is_active": False}
            model._base_manager.filter(pk=record.pk).update(is_active=False)
        elif finding.kind == "provider":
            old, new = {"is_available": True}, {"is_available": False}
            model._base_manager.filter(pk=record.pk).update(is_available=False)
        else:
            return False
        create_audit_log(
            action=AuditLog.Action.UPDATE,
            entity_type=finding.model,
            entity_id=record.pk,
            entity_name=finding.label[:250],
            old_value=old,
            new_value=new,
            message=f"audit_demo_data --apply: {finding.reason}",
        )
        return True

    def handle(self, *args, **options):
        findings = self.collect(include_guests=options["include_guests"])
        actionable = [item for item in findings if not item.review_only]
        mode = "APPLY" if options["apply"] else "REPORT (read-only; nothing was changed)"
        self.stdout.write(f"Demo / debug / QA data audit: {mode}")
        for item in findings:
            self.stdout.write(f"- [{item.kind}] {item.label}: {item.reason} -> {item.action}")

        applied = 0
        if options["apply"]:
            with transaction.atomic():
                for item in actionable:
                    applied += int(self._apply(item))
            self.stdout.write(f"Applied: {applied} record(s) deactivated or soft-deleted. Orders and history were not touched.")

        manual = [item for item in actionable if item.action.startswith("manual")]
        remaining = manual if options["apply"] else actionable
        review = [item for item in findings if item.review_only]
        self.stdout.write(
            f"Summary: {len(actionable)} demo/debug/QA record(s) found, {len(review)} for review, "
            f"{len(remaining)} still open{' (manual)' if options['apply'] else ''}."
        )
        if options["strict"] and remaining:
            raise CommandError(f"{len(remaining)} demo/debug/QA record(s) remain; see the report above.")
