"""Read-only pre-release report on owner-supplied public content (audit D05, D06).

    python manage.py check_public_content            # report, exit 0
    python manage.py check_public_content --strict   # exit 1 while anything needs owner input

It never changes data and never suggests contact values or policy text: it
lists what the published content row and the published legal documents hold,
and what still needs an approved value from the owner or legal team.

The published content row (PublicPageContent) is the one source of the public
contact details (footer and /contact page).
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.reserved_domains import is_reserved_email
from public_site.contact_checks import CONTACT_FIELDS, contact_placeholder_findings
from public_site.models import LegalDocument
from public_site.selectors import get_active_public_page_content, get_published_legal_document

LEGAL_LABELS = {"privacy": "privacy policy", "terms": "terms of use"}


class Command(BaseCommand):
    help = "Report public contact data and legal document readiness. Read-only."

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="Exit 1 when any item needs owner input.")

    def handle(self, *args, **options):
        findings = []
        content = get_active_public_page_content()
        if content is None:
            findings.append("No published content row: the site shows built-in defaults (no contact data).")
        else:
            self.stdout.write(f"Published content row: {content.pk} ({content.version_name}), updated {content.updated_at:%Y-%m-%d %H:%M}")
            for field in CONTACT_FIELDS:
                value = (getattr(content, field) or "").strip()
                self.stdout.write(f"  {field}: {value or '(blank)'}")
                if not value:
                    findings.append(f"D05 {field} is blank (shown as not published).")
            if is_reserved_email(content.email):
                findings.append(f"D05 email {content.email} is on a reserved domain: it cannot receive mail and is hidden from the public site.")
            elif content.email:
                self.stdout.write("  email domain: deliverable form (ownership of the mailbox is not checked here)")
            for field, value, reason in contact_placeholder_findings(content):
                if field == "email" and is_reserved_email(value):
                    continue  # reported above
                findings.append(f"D05 {field} holds a placeholder value ({reason}): {value}")
            self.stdout.write("  phone, WhatsApp, address and hours cannot be verified automatically; the owner confirms them.")

        for kind in LegalDocument.Kind.values:
            label = LEGAL_LABELS[kind]
            document = get_published_legal_document(kind)
            if document is None:
                self.stdout.write(f"  legal {kind}: (none published)")
                findings.append(f"D06 approved {label} text is missing: no {label} version is published.")
                continue
            self.stdout.write(
                f"  legal {kind}: version {document.version}, effective {document.effective_date}, {document.approval_status}"
            )
            if document.is_draft:
                findings.append(
                    f"D06 approved {label} text is missing: the published version {document.version} is a draft "
                    "that requires owner/legal approval."
                )

        sender = getattr(settings, "DEFAULT_FROM_EMAIL", "")
        self.stdout.write(f"Sender (DEFAULT_FROM_EMAIL): {sender}")
        if is_reserved_email(sender):
            findings.append(f"Sender {sender} is on a reserved domain; set DJANGO_DEFAULT_FROM_EMAIL on the approved domain.")

        if findings:
            self.stdout.write("Needs owner/legal input:")
            for item in findings:
                self.stdout.write(f"  - {item}")
        else:
            self.stdout.write("No open items found by this check.")
        if options["strict"] and findings:
            raise CommandError(f"{len(findings)} public-content item(s) need owner input.")
