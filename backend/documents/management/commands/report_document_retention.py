"""Report soft-deleted documents whose files are still stored. Read-only.

    python manage.py report_document_retention --older-than-days 0

Nothing is deleted: there is no approved retention policy yet (D06). The
report shows what a future purge would consider (documents/retention.py).
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.utils import timezone

from documents.retention import purge_candidates


class Command(BaseCommand):
    help = "Read-only report of soft-deleted documents whose stored files are kept."

    def add_arguments(self, parser):
        parser.add_argument("--older-than-days", type=int, default=0, help="Only documents deleted at least this many days ago.")

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=max(options["older_than_days"], 0))
        candidates = purge_candidates(deleted_before=cutoff)
        total = candidates.count()
        size = candidates.aggregate(total=Sum("file_size"))["total"] or 0
        self.stdout.write(f"Soft-deleted documents with a stored file (deleted before {cutoff:%Y-%m-%d %H:%M} UTC): {total}")
        self.stdout.write(f"Stored size: {size} bytes")
        for document in candidates[:50]:
            self.stdout.write(f"  document #{document.pk} order {document.order.order_number} deleted {document.deleted_at:%Y-%m-%d}")
        if total > 50:
            self.stdout.write(f"  ... and {total - 50} more")
        self.stdout.write("Nothing was deleted. Removal needs an approved retention policy (D06).")
