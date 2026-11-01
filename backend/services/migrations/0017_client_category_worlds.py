"""Owner decision CN-ACT-04: the client's eight public categories.

See ``services/client_categories.py`` for the plan. Idempotent: ids and slugs
are kept, names/sort orders change only while they hold the known previous
value, services move only from their known previous category, retired
categories are hidden (never deleted) and the "???" debug categories and
"????" services are soft-deleted. Does nothing on a database without the real
catalogue. Orders are not touched (they keep their category name snapshot).

Reverse is a no-op.
"""

from django.db import migrations

from services.client_categories import apply_client_categories


def forwards(apps, schema_editor):
    apply_client_categories(apps.get_model("services", "ServiceCategory"), apps.get_model("services", "Service"))


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0016_client_acceptance_catalogue_fixes"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
