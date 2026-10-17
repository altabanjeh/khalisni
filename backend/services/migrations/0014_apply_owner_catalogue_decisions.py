"""Apply owner decisions D02, B10-1/2/3 and B10-4 to stored catalogue data.

Idempotent: a second run finds nothing to change. Only the note fields that
mention the admin panel and the form schemas are touched; prices, price types
and durations are not. Orders keep the schema answers they were submitted with
(they are stored in the order notes), so existing orders are unaffected.

Reverse is a no-op: the old wording is not restored.
"""

from django.db import migrations

from services.catalogue_rules import apply_schema_rules, approved_delivery_note, approved_price_note


def apply_decisions(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service._base_manager.all().iterator():
        changed = []
        price = approved_price_note(service.public_price_note_ar, service.public_price_note_en)
        if price != (service.public_price_note_ar, service.public_price_note_en):
            service.public_price_note_ar, service.public_price_note_en = price
            changed += ["public_price_note_ar", "public_price_note_en"]
        delivery = approved_delivery_note(service.delivery_note_ar, service.delivery_note_en)
        if delivery != (service.delivery_note_ar, service.delivery_note_en):
            service.delivery_note_ar, service.delivery_note_en = delivery
            changed += ["delivery_note_ar", "delivery_note_en"]
        schema = apply_schema_rules(service.required_information_schema)
        if schema != service.required_information_schema:
            service.required_information_schema = schema
            changed.append("required_information_schema")
        if changed:
            # update() skips model save hooks: no other field is recalculated.
            Service._base_manager.filter(pk=service.pk).update(**{name: getattr(service, name) for name in changed})


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0013_normalize_legacy_schema_locale_fields"),
    ]

    operations = [migrations.RunPython(apply_decisions, migrations.RunPython.noop)]
