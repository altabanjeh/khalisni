"""D03 / C6: English text for catalogue content that exists only in Arabic.

Fills blank English field and option labels, document names and service
short/full descriptions and delivery notes from the explicit table in
``services/catalogue_translations.py`` (faithful translations of the client's
Arabic text; no new business facts). Only blank English values are filled and
only while the Arabic still equals the translated source. The two English
related-service messages are replaced by their Arabic translation (the model
has a single customer-facing message field). Idempotent; reverse is a no-op.
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
        ("services", "0019_normalize_document_definitions"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
