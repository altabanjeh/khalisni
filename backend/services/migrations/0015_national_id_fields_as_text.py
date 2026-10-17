"""Store national-ID form fields as text instead of numbers.

They are identifiers: a numeric input can be changed by the arrow keys or the
mouse wheel, accepts exponent and sign characters, and does not fit labels
that also accept a registration or passport number. Only the field ``type``
changes (``number`` -> ``text``); labels, required flags and order answers are
untouched (answers are stored as text in the order notes). No format rule is
added. Idempotent; reverse is a no-op.
"""

from django.db import migrations

from services.catalogue_rules import apply_identifier_rules


def national_id_as_text(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service._base_manager.all().iterator():
        schema = apply_identifier_rules(service.required_information_schema)
        if schema != service.required_information_schema:
            # update() skips model save hooks: no other field is recalculated.
            Service._base_manager.filter(pk=service.pk).update(required_information_schema=schema)


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0014_apply_owner_catalogue_decisions"),
    ]

    operations = [migrations.RunPython(national_id_as_text, migrations.RunPython.noop)]
