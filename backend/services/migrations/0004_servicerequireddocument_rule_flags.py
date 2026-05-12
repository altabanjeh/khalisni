from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0003_alter_service_options"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicerequireddocument",
            name="client_can_replace_file",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="servicerequireddocument",
            name="provider_can_view_file",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="servicerequireddocument",
            name="requires_verification",
            field=models.BooleanField(default=True),
        ),
    ]
