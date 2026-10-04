import json

from django.core.management.base import BaseCommand, CommandError

from services.catalog_locale_audit import audit_public_catalog_arabic


class Command(BaseCommand):
    help = "Read-only audit of Arabic text in the currently published service catalog."

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="Exit nonzero when catalog gaps exist.")

    def handle(self, *args, **options):
        findings = audit_public_catalog_arabic()
        self.stdout.write(json.dumps({"findings": findings, "count": len(findings)}, ensure_ascii=False))
        if findings and options["strict"]:
            raise CommandError(f"Published catalog has {len(findings)} Arabic localization gaps.")
