"""Brand spelling in help guide text (owner decision: «خلصني» / "Khalsni"). Idempotent."""

import re

from django.db import migrations, models

LATIN = re.compile(r"\bKhalisni\b(?![.@\w])")


def fix(text):
    if not isinstance(text, str) or not text:
        return text
    return LATIN.sub("Khalsni", text.replace("خلّصني", "خلصني"))


def forwards(apps, schema_editor):
    for model_name in ("HelpGuide", "HelpGuideField", "HelpGuideAction", "HelpGuideWorkflow", "HelpGuideService", "HelpGuideScreenshot"):
        try:
            model = apps.get_model("help_guides", model_name)
        except LookupError:
            continue
        text_fields = [f.name for f in model._meta.get_fields() if isinstance(f, (models.CharField, models.TextField))]
        for row in model.objects.all():
            updates = {name: fix(getattr(row, name)) for name in text_fields if fix(getattr(row, name)) != getattr(row, name)}
            if updates:
                model.objects.filter(pk=row.pk).update(**updates)


class Migration(migrations.Migration):
    dependencies = [("help_guides", "0007_arabic_manual_guides_hide_placeholders")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
