from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("help_guides", "0004_manual_guide_library"),
    ]

    operations = [
        migrations.AlterField(
            model_name="helpguide",
            name="slug",
            field=models.SlugField(db_index=False, max_length=160, unique=True),
        ),
    ]
