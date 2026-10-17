"""Move stored phone numbers to the canonical E.164 identity (owner phone policy).

Dry run by default: nothing is written.

    python manage.py normalize_phones                       # report, masked
    python manage.py normalize_phones --unmasked            # report with full numbers
    python manage.py normalize_phones --apply --confirm NORMALIZE --report phones.json
    python manage.py normalize_phones --rollback phones.json --confirm RESTORE

What the report shows for every stored phone:

* ``unchanged``  already canonical;
* ``normalize``  will be rewritten, e.g. ``0791234567`` -> ``+962791234567``;
* ``invalid``    cannot be read as a phone number; left as it is for a person to fix;
* ``collision``  two or more accounts become the same number. None of them is
                 changed and accounts are never merged: an operator decides.

For each account the number of orders and whether it is an automatically
created guest account are listed, so the operator sees what a collision affects.

Apply mode rewrites only ``normalize`` rows, inside one transaction, and first
writes the original values to the ``--report`` file. ``--rollback`` puts those
originals back for every row whose value is still the one this command wrote.
"""

import json
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import CustomUser
from accounts.validators import normalize_phone, phone_identity
from orders.models import Order
from public_site.models import ContactInquiry, MissingServiceRequest

GUEST_EMAIL_SUFFIX = "@guest.khalisni.local"

# (label, model, primary-key attribute, phone field). Accounts come first: only
# they carry a uniqueness rule, so only they can collide.
TARGETS = (
    ("user", CustomUser, "pk", "phone"),
    ("contact_inquiry", ContactInquiry, "pk", "phone"),
    ("missing_service_request", MissingServiceRequest, "pk", "requester_phone"),
)


def _mask(value):
    value = str(value or "")
    if len(value) <= 6:
        return "*" * len(value)
    return f"{value[:4]}{'*' * (len(value) - 6)}{value[-2:]}"


def _manager(model):
    # Soft-deleted rows still own their numbers.
    return getattr(model, "_base_manager", model.objects)


class Command(BaseCommand):
    help = "Report (default) or apply the canonical E.164 normalization of stored phone numbers."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Rewrite the 'normalize' rows. Needs --confirm NORMALIZE and --report.")
        parser.add_argument("--confirm", default="", help="NORMALIZE for --apply, RESTORE for --rollback.")
        parser.add_argument("--report", default="", help="JSON file that receives every row and its original value.")
        parser.add_argument("--rollback", default="", help="Restore the original values recorded in this report file.")
        parser.add_argument("--unmasked", action="store_true", help="Print full phone numbers instead of masked ones.")

    def handle(self, *args, **options):
        if options["rollback"]:
            return self._rollback(options)
        if options["apply"]:
            if options["confirm"] != "NORMALIZE":
                raise CommandError("Apply mode changes data. Re-run with --confirm NORMALIZE after reviewing the dry run.")
            if not options["report"]:
                raise CommandError("Apply mode needs --report <file> so the original values can be restored.")

        rows = self._scan()
        self._print(rows, unmasked=options["unmasked"])
        if options["report"]:
            with open(options["report"], "w", encoding="utf-8") as handle:
                json.dump({"rows": rows}, handle, ensure_ascii=False, indent=2)
            self.stdout.write(f"Report written to {options['report']} (contains full phone numbers; keep it private).")
        if not options["apply"]:
            self.stdout.write("Dry run: nothing was changed.")
            return

        changed = self._apply(rows)
        self.stdout.write(self.style.SUCCESS(f"Applied: {changed} phone value(s) rewritten. Collisions and invalid values were not touched."))

    def _scan(self):
        rows = []
        for label, model, _pk, field in TARGETS:
            for pk, original in _manager(model).exclude(**{field: ""}).values_list("pk", field).order_by("pk"):
                canonical = normalize_phone(original)
                if canonical is None:
                    status = "invalid"
                elif canonical == original:
                    status = "unchanged"
                else:
                    status = "normalize"
                rows.append({"table": label, "pk": pk, "field": field, "original": original, "canonical": canonical, "status": status})

        users = [row for row in rows if row["table"] == "user"]
        groups = defaultdict(list)
        for row in users:
            groups[phone_identity(row["original"])].append(row)
        order_counts = defaultdict(int)
        for customer_id in Order.objects.filter(customer_id__in=[row["pk"] for row in users]).values_list("customer_id", flat=True):
            order_counts[customer_id] += 1
        emails = dict(_manager(CustomUser).filter(pk__in=[row["pk"] for row in users]).values_list("pk", "email"))
        for key, members in groups.items():
            for row in members:
                row["orders"] = order_counts[row["pk"]]
                row["guest_account"] = str(emails.get(row["pk"], "")).endswith(GUEST_EMAIL_SUFFIX)
                if len(members) > 1:
                    row["status"] = "collision"
                    row["collides_with"] = [other["pk"] for other in members if other is not row]
        return rows

    def _print(self, rows, *, unmasked):
        show = (lambda value: value or "") if unmasked else _mask
        counts = defaultdict(int)
        for row in rows:
            counts[(row["table"], row["status"])] += 1
            if row["status"] == "unchanged":
                continue
            extra = ""
            if row["table"] == "user":
                extra = f" orders={row['orders']} guest={'yes' if row['guest_account'] else 'no'}"
                if row.get("collides_with"):
                    extra += f" collides_with={row['collides_with']}"
            self.stdout.write(
                f"{row['status']:<10} {row['table']}#{row['pk']}: {show(row['original'])} -> {show(row['canonical']) or '-'}{extra}"
            )
        self.stdout.write("Summary:")
        for (table, status), number in sorted(counts.items()):
            self.stdout.write(f"  {table:<24} {status:<10} {number}")

    def _apply(self, rows):
        models = {label: (model, field) for label, model, _pk, field in TARGETS}
        changed = 0
        with transaction.atomic():
            for row in rows:
                if row["status"] != "normalize":
                    continue
                model, field = models[row["table"]]
                # update() only rewrites rows that still hold the scanned value.
                changed += _manager(model).filter(pk=row["pk"], **{field: row["original"]}).update(**{field: row["canonical"]})
        return changed

    def _rollback(self, options):
        if options["confirm"] != "RESTORE":
            raise CommandError("Rollback changes data. Re-run with --confirm RESTORE.")
        with open(options["rollback"], encoding="utf-8") as handle:
            rows = json.load(handle)["rows"]
        models = {label: (model, field) for label, model, _pk, field in TARGETS}
        restored = 0
        with transaction.atomic():
            for row in rows:
                if row["status"] != "normalize":
                    continue
                model, field = models[row["table"]]
                # Only values this command wrote and nobody changed since.
                restored += _manager(model).filter(pk=row["pk"], **{field: row["canonical"]}).update(**{field: row["original"]})
        self.stdout.write(self.style.SUCCESS(f"Restored {restored} phone value(s) from {options['rollback']}."))
