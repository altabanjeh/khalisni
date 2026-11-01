"""Owner decision B10-9: merge the approved near-duplicate document definitions.

Same function as ``manage.py normalize_document_definitions --apply``
(``services/document_merges.py``); the merge table is in
docs/audit/evidence/khalsni-total-closure-2026-11-01/catalogue/document_merges.md.
Also makes «تفويض إن وجد» ("authorization, if any") optional.

Idempotent. Duplicate definitions are deactivated, never deleted. Orders keep
their frozen ``requirements_snapshot`` and their uploaded documents' codes.
Reverse is a no-op.
"""

from django.db import migrations

from services.document_merges import normalize_document_definitions


def forwards(apps, schema_editor):
    normalize_document_definitions(
        apps.get_model("services", "RequiredDocumentDefinition"),
        apps.get_model("services", "ServiceRequiredDocument"),
        apps.get_model("orders", "Order"),
        apply=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0018_parcel_gate_all_land_services"),
        ("orders", "0016_backfill_order_requirements_snapshot"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
