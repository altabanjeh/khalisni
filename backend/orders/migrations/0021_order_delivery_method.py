from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0020_orderconsent_legal_versions"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="delivery_method",
            field=models.CharField(
                choices=[("electronic", "Electronic"), ("paper_pickup", "Paper - pickup"), ("paper_courier", "Paper - courier")],
                default="electronic",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_instructions",
            field=models.TextField(blank=True),
        ),
    ]
