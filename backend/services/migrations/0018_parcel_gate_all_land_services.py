"""Owner decision B4 / B10-1/2/3 option A: the parcel/basin yes/no gate on every land service.

A form that collects «رقم القطعة» and «رقم الحوض» but does not ask
«هل تعرف رقم القطعة والحوض؟» gets the question (نعم/لا, values yes/no) inserted
right before those fields; the numbers become text, shown and required only
when the answer is "yes" (``catalogue_rules.apply_schema_rules`` with
``gate_all_parcel_fields=True``: the importer applies the same rule). The
server already enforces ``visible_when`` (``schema_rules.validate_answers``).

Idempotent; forms without parcel/basin fields are unchanged. Orders are not
touched (their answers are stored in the order notes). Reverse is a no-op.
"""

from django.db import migrations

from services.catalogue_rules import apply_schema_rules


def forwards(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service._base_manager.all().iterator():
        schema = apply_schema_rules(service.required_information_schema, gate_all_parcel_fields=True)
        if schema != service.required_information_schema:
            Service._base_manager.filter(pk=service.pk).update(required_information_schema=schema)


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0017_client_category_worlds"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
