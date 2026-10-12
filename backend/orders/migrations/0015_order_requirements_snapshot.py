from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Schema only. The backfill lives in 0016 so the brief exclusive lock taken
    by ALTER TABLE is released before any row is rewritten.
    """

    dependencies = [
        ("orders", "0014_order_submission_fingerprint_order_submission_key_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="requirements_snapshot",
            field=models.JSONField(
                blank=True,
                help_text="Document requirements frozen at order creation. Null on orders created before the snapshot existed.",
                null=True,
            ),
        ),
    ]
