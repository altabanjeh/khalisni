"""D03 / AR-EN purity: English terms and field help text for the land services.

Re-runs the faithful-translation fill from ``services/catalogue_translations.py``
after ``TERMS_EN`` and ``HELP_TEXTS_EN`` were added (18 service terms and 17 field
help texts that existed only in Arabic). Fills only blank English values while the
Arabic still equals the translated source. Idempotent; reverse is a no-op.
"""

from django.db import migrations

from services.catalogue_translations import apply_english_content


def forwards(apps, schema_editor):
    apply_english_content(
        apps.get_model("services", "Service"),
        apps.get_model("services", "RequiredDocumentDefinition"),
        apps.get_model("services", "ServiceRequiredDocument"),
        apps.get_model("services", "ServiceRelation"),
    )


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0021_brand_spelling_in_catalogue"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
