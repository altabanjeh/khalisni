"""CN-BIZ-09: per-definition upload size override (in MB, empty = default limit)."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("services", "0023_repeater_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="requireddocumentdefinition",
            name="max_file_size_mb",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
