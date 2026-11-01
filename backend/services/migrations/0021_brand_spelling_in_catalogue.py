"""Brand spelling in visible catalogue text (owner decision: «خلصني» / "Khalsni").

The client service sheets write «خلّصني». Runs after the English content
migration (which compares the source Arabic). Idempotent; reverse is a no-op.
Orders keep their own snapshots and are not touched.
"""

import re

from django.db import migrations

LATIN = re.compile(r"\bKhalisni\b(?![.@\w])")
SERVICE_FIELDS = ("name_ar", "short_description_ar", "description_ar", "terms_ar", "delivery_note_ar",
                  "public_price_note_ar", "name_en", "short_description_en", "description_en", "terms_en",
                  "delivery_note_en", "public_price_note_en")


def fix(text):
    if not isinstance(text, str) or not text:
        return text
    return LATIN.sub("Khalsni", text.replace("خلّصني", "خلصني"))


def forwards(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service.objects.all():
        updates = {}
        for field in SERVICE_FIELDS:
            value = getattr(service, field, None)
            if fix(value) != value:
                updates[field] = fix(value)
        if updates:
            Service.objects.filter(pk=service.pk).update(**updates)
    ServiceRelation = apps.get_model("services", "ServiceRelation")
    for relation in ServiceRelation.objects.all():
        value = getattr(relation, "message_to_customer", None)
        if fix(value) != value:
            ServiceRelation.objects.filter(pk=relation.pk).update(message_to_customer=fix(value))


class Migration(migrations.Migration):
    dependencies = [("services", "0020_english_catalogue_content")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
