import re

from django.db import migrations


ARABIC = re.compile(r"[\u0600-\u06ff]")


def normalize_schema_locale_fields(apps, schema_editor):
    Service = apps.get_model("services", "Service")
    for service in Service.objects.all().iterator():
        schema = service.required_information_schema
        fields = schema.get("fields") if isinstance(schema, dict) else schema
        if not isinstance(fields, list):
            continue
        changed = False
        for field in fields:
            if not isinstance(field, dict):
                continue
            legacy_help = field.get("help_text")
            if legacy_help and ARABIC.search(str(legacy_help)) and not field.get("help_text_ar"):
                field["help_text_ar"] = legacy_help
                changed = True
            for option in field.get("options") or []:
                if not isinstance(option, dict):
                    continue
                legacy_label = option.get("label")
                if not legacy_label:
                    continue
                target = "label_ar" if ARABIC.search(str(legacy_label)) else "label_en"
                if not option.get(target):
                    option[target] = legacy_label
                    changed = True
        if changed:
            service.required_information_schema = schema
            service.save(update_fields=["required_information_schema"])


class Migration(migrations.Migration):
    dependencies = [("services", "0012_repair_known_public_arabic_catalog_values")]

    operations = [migrations.RunPython(normalize_schema_locale_fields, migrations.RunPython.noop)]
