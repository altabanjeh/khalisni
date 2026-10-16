"""Find (and, only on explicit request, repair) unusable missing-document requests.

A WAITING_CUSTOMER order needs an open ``MissingDocumentRequest`` naming at
least one configured requirement; otherwise the customer has nothing to upload
and the order cannot resume on its own (audit finding F02). Such orders are
typically older than request records.

Default mode is a read-only report. A repair changes one order at a time and
needs ``--apply``, ``--order``, ``--action``, ``--actor`` and ``--reason``.
Nothing guesses which document was meant:

* ``return-to-review`` moves the order back to UNDER_REVIEW through the audited
  staff recovery service. Rollback: staff send a new request from the review
  screen (UNDER_REVIEW -> WAITING_CUSTOMER) naming configured documents.
* ``recreate-request`` is allowed only when the order itself still records
  requested types that are all configured requirements. It opens a request for
  exactly those recorded types and leaves the status unchanged. Rollback: the
  created request id is printed and audited; resolve it or recover the order.
"""

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import CustomUser
from audit.utils import create_audit_log
from orders.models import MissingDocumentRequest, Order
from orders.readiness import order_requirements, unresolved_missing_request_types
from orders.services import recover_invalid_missing_document_request

OK = "ok"
NO_REQUEST_NO_TYPES = "no_request_no_recorded_types"
TYPES_WITHOUT_REQUEST = "recorded_types_without_request"
UNKNOWN_TYPES = "recorded_types_not_configured"
REQUEST_WITHOUT_TYPES = "request_without_types"

RECOMMENDATIONS = {
    OK: "none",
    NO_REQUEST_NO_TYPES: "return-to-review (staff decides what to request next)",
    TYPES_WITHOUT_REQUEST: "recreate-request (recorded types are configured) or return-to-review",
    UNKNOWN_TYPES: "return-to-review (recorded types are not configured requirements)",
    REQUEST_WITHOUT_TYPES: "return-to-review (staff decides what to request next)",
}


def _mask(value):
    value = str(value or "")
    if not value:
        return ""
    if "@" in value:
        name, _, domain = value.partition("@")
        return f"{name[:2]}***@{domain}"
    return f"***{value[-4:]}"


def classify(order):
    """Return a JSON-safe description of the order's current request state."""
    configured = {requirement.document_type for requirement in order_requirements(order)}
    open_request = order.missing_document_requests.filter(is_resolved=False).order_by("-requested_at").first()
    recorded = list(order.missing_document_types or [])
    valid = unresolved_missing_request_types(order) is not None
    if valid:
        classification = OK
    elif open_request is not None:
        classification = REQUEST_WITHOUT_TYPES
    elif not recorded:
        classification = NO_REQUEST_NO_TYPES
    elif set(recorded) <= configured:
        classification = TYPES_WITHOUT_REQUEST
    else:
        classification = UNKNOWN_TYPES
    return {
        "order_id": order.pk,
        "order_number": order.order_number,
        "status": order.status,
        "customer_id": order.customer_id,
        "customer_contact": _mask(getattr(order.customer, "phone", "") or getattr(order.customer, "email", "")),
        "open_request_id": open_request.pk if open_request else None,
        "open_request_types": list(open_request.document_types or []) if open_request else None,
        "missing_document_types": recorded,
        "recorded_types_configured": bool(recorded) and set(recorded) <= configured,
        "configured_requirements": sorted(configured),
        "valid_request": valid,
        "classification": classification,
        "recommendation": RECOMMENDATIONS[classification],
    }


class Command(BaseCommand):
    help = "Report waiting orders whose missing-document request cannot be answered (dry-run by default)."

    def add_arguments(self, parser):
        parser.add_argument("--json", action="store_true", help="Print the report as JSON.")
        parser.add_argument("--include-valid", action="store_true", help="Also list waiting orders that are fine.")
        parser.add_argument("--apply", action="store_true", help="Perform the selected repair on one order.")
        parser.add_argument("--order", help="Order number to repair (required with --apply).")
        parser.add_argument("--action", choices=["return-to-review", "recreate-request"])
        parser.add_argument("--actor", help="Email of the staff user the repair is recorded against.")
        parser.add_argument("--reason", help="Reason recorded in the audit trail.")

    def handle(self, *args, **options):
        if options["apply"]:
            return self._repair(options)
        if any(options[key] for key in ("order", "action", "actor", "reason")):
            self.stdout.write(self.style.WARNING("Repair options ignored without --apply (dry run)."))

        waiting = Order.objects.filter(status=Order.Status.WAITING_CUSTOMER).select_related("customer").order_by("pk")
        rows = [classify(order) for order in waiting]
        if not options["include_valid"]:
            rows = [row for row in rows if row["classification"] != OK]
        if options["json"]:
            self.stdout.write(json.dumps({"dry_run": True, "count": len(rows), "orders": rows}, ensure_ascii=False, indent=1))
            return
        attention = sum(1 for row in rows if row["classification"] != OK)
        self.stdout.write(f"DRY RUN: {attention} waiting order(s) need attention ({len(rows)} listed).")
        for row in rows:
            self.stdout.write(
                f"- {row['order_number']} (id {row['order_id']}, customer {row['customer_id']} {row['customer_contact']}): "
                f"{row['classification']}; recorded types={row['missing_document_types']}; "
                f"open request={row['open_request_id']} {row['open_request_types']}; "
                f"recommended: {row['recommendation']}"
            )

    def _repair(self, options):
        missing = [key for key in ("order", "action", "actor", "reason") if not (options[key] or "").strip()]
        if missing:
            raise CommandError(f"--apply requires: {', '.join('--' + key for key in missing)}.")
        try:
            order = Order.objects.select_related("customer").get(order_number=options["order"].strip())
        except Order.DoesNotExist as exc:
            raise CommandError("Order not found.") from exc
        actor = CustomUser.objects.filter(email=options["actor"].strip(), is_active=True).first()
        if actor is None or actor.role not in {CustomUser.Role.ADMIN, CustomUser.Role.EMPLOYEE, CustomUser.Role.SUPPORT}:
            raise CommandError("--actor must be an active staff user.")
        state = classify(order)
        if order.status != Order.Status.WAITING_CUSTOMER or state["valid_request"]:
            raise CommandError(f"{order.order_number} does not need repair ({state['classification']}).")

        reason = options["reason"].strip()
        if options["action"] == "return-to-review":
            recover_invalid_missing_document_request(order=order, actor=actor, reason=reason)
            self.stdout.write(self.style.SUCCESS(f"{order.order_number}: returned to UNDER_REVIEW (audited)."))
            return

        if state["classification"] != TYPES_WITHOUT_REQUEST:
            raise CommandError(
                "recreate-request needs recorded types that are all configured requirements; "
                f"this order is {state['classification']}. Use return-to-review."
            )
        with transaction.atomic():
            created = MissingDocumentRequest.objects.create(
                order=order,
                requested_by=actor,
                document_types=list(order.missing_document_types),
                reason=reason,
            )
            create_audit_log(
                user=actor,
                action="recreate_missing_document_request",
                entity_type="Order",
                entity_id=order.pk,
                old_value={"open_request_id": None, "missing_document_types": list(order.missing_document_types)},
                new_value={"open_request_id": created.pk, "reason": reason},
            )
        self.stdout.write(self.style.SUCCESS(
            f"{order.order_number}: request {created.pk} opened for {created.document_types} (status unchanged)."
        ))
