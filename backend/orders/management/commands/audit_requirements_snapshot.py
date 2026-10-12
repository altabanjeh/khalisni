import json

from django.core.management.base import BaseCommand
from django.db.models import Count

from orders.models import Order
from orders.readiness import evaluate_order_requirements

POST_INTAKE = (
    Order.Status.ASSIGNED,
    Order.Status.IN_PROGRESS,
    Order.Status.WAITING_GOVERNMENT,
    Order.Status.READY_FOR_DELIVERY,
    Order.Status.COMPLETED,
)


class Command(BaseCommand):
    help = (
        "Read-only report on Order.requirements_snapshot after migration orders.0016. "
        "Lists orders without a snapshot and orders whose frozen requirements disagree with "
        "their own documents, which is the visible trace of a catalog change made after the order was created."
    )

    def add_arguments(self, parser):
        parser.add_argument("--strict", action="store_true", help="Exit non-zero when any order has no snapshot.")
        parser.add_argument("--limit", type=int, default=50, help="Maximum order numbers listed per section.")

    def handle(self, *args, **options):
        limit = options["limit"]
        total = Order.objects.count()
        missing = Order.objects.filter(requirements_snapshot__isnull=True)
        report = {
            "orders_total": total,
            "orders_without_snapshot": missing.count(),
            "orders_by_status": {
                row["status"]: row["total"]
                for row in Order.objects.values("status").annotate(total=Count("pk")).order_by("status")
            },
            "orders_without_snapshot_numbers": list(missing.order_by("pk").values_list("order_number", flat=True)[:limit]),
        }

        # An order that already passed intake but whose frozen snapshot still
        # lists a required document it never received: the rule was most
        # likely added to the catalog after the order was created. The backfill
        # cannot know; these are listed for a human decision.
        unmet_after_intake = []
        # Uploaded customer documents whose type is not in the snapshot: the
        # rule existed when the order was created and was removed later.
        uploads_outside_snapshot = []
        unreadable = []
        candidates = (
            Order.objects.filter(requirements_snapshot__isnull=False)
            .prefetch_related("documents")
            .order_by("pk")
        )
        for order in candidates.iterator(chunk_size=500):
            try:
                snapshot_types = {row.get("document_type") for row in order.requirements_snapshot or []}
                uploaded_types = {
                    document.document_type
                    for document in order.documents.all()
                    if not document.is_deleted and not document.is_final_document
                }
                if snapshot_types and uploaded_types - snapshot_types and len(uploads_outside_snapshot) < limit:
                    uploads_outside_snapshot.append(
                        {"order": order.order_number, "document_types": sorted(uploaded_types - snapshot_types)}
                    )
                if order.status in POST_INTAKE:
                    readiness = evaluate_order_requirements(order)
                    never_uploaded = [
                        reason["document_type"]
                        for reason in readiness["blocking_reasons"]
                        if reason["code"] == "not_uploaded"
                    ]
                    if never_uploaded and len(unmet_after_intake) < limit:
                        unmet_after_intake.append(
                            {"order": order.order_number, "status": order.status, "document_types": never_uploaded}
                        )
            except Exception as error:  # report, never hide, an order whose readiness cannot be computed
                unreadable.append({"order": order.order_number, "error": str(error)})

        report["post_intake_orders_with_never_uploaded_required_documents"] = unmet_after_intake
        report["orders_with_uploads_outside_snapshot"] = uploads_outside_snapshot
        report["orders_whose_readiness_could_not_be_computed"] = unreadable
        self.stdout.write(json.dumps(report, ensure_ascii=False, indent=2))

        if unreadable or (options["strict"] and report["orders_without_snapshot"]):
            raise SystemExit(1)
