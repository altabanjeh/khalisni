import json

from django.core.management.base import BaseCommand
from django.db import transaction

from orders.models import Order
from services.document_merges import format_log, normalize_document_definitions
from services.models import RequiredDocumentDefinition, ServiceRequiredDocument


class Command(BaseCommand):
    help = (
        "Merge the approved near-duplicate document definitions (owner decision B10-9) and make "
        "«تفويض إن وجد» optional. Prints every merge. --dry-run (default) changes nothing; --apply "
        "writes the changes. Orders keep their frozen requirements."
    )

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument("--dry-run", action="store_true", help="List the merges without changing anything (default).")
        mode.add_argument("--apply", action="store_true", help="Apply the merges.")
        parser.add_argument("--json", action="store_true", help="Print the merge log as JSON.")

    def handle(self, *args, **options):
        apply = bool(options["apply"])
        if apply:
            with transaction.atomic():
                rows = normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order, apply=True)
        else:
            rows = normalize_document_definitions(RequiredDocumentDefinition, ServiceRequiredDocument, Order, apply=False)
        if options["json"]:
            self.stdout.write(json.dumps({"applied": apply, "rows": rows}, ensure_ascii=False, indent=1))
            return
        self.stdout.write(f"Document definition normalization ({'APPLIED' if apply else 'DRY RUN: nothing changed'})")
        for line in format_log(rows):
            self.stdout.write(f"- {line}")
        self.stdout.write(f"{len(rows)} change(s){'' if apply else ' would be made'}.")
        if not rows and apply:
            self.stdout.write("Nothing to do: the catalogue is already normalized.")
