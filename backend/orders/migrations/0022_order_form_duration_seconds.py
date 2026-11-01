from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0021_order_delivery_method"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="form_duration_seconds",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
