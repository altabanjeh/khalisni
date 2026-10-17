"""Read-only pre-release report on owner-supplied public content (audit D05, D06).

    python manage.py check_public_content            # report, exit 0
    python manage.py check_public_content --strict   # exit 1 while anything needs owner input

It never changes data and never suggests contact values or policy text: it
lists what the published content row holds and what still needs an approved
value from the owner or legal team.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from core.reserved_domains import is_reserved_email
from public_site.selectors import get_active_public_page_content

CONTACT_FIELDS = ("contact_phone", "whatsapp_number", "email", "office_address", "office_address_en")


class Command(BaseCommand):
    help = "Report public contact data and privacy policy readiness. Read-only."

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="Exit 1 when any item needs owner input.")

    def handle(self, *args, **options):
        findings = []
        content = get_active_public_page_content()
        if content is None:
            findings.append("No published content row: the site shows built-in defaults (no contact data, generic privacy text).")
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
            self.stdout.write("  phone, WhatsApp and address cannot be verified automatically; the owner confirms them.")
            has_ar = bool((content.privacy_policy_ar or "").strip())
            has_en = bool((content.privacy_policy_en or "").strip())
            self.stdout.write(f"  privacy_policy_ar: {'present' if has_ar else '(blank)'}; privacy_policy_en: {'present' if has_en else '(blank)'}")
            if not (has_ar and has_en):
                findings.append("D06 approved privacy policy text is missing (the page shows the generic built-in principles).")
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
