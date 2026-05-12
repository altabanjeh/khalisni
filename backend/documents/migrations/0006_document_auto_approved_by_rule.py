from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0005_alter_document_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="document",
            name="auto_approved_by_rule",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="True when the document was approved automatically by a service rule (requires_verification=False), not by a human reviewer.",
            ),
        ),
    ]
