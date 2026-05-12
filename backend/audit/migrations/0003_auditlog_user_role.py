from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0002_alter_auditlog_action"),
    ]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="user_role",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Snapshot of the acting user's role when the audit event was recorded.",
                max_length=30,
            ),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["user_role", "created_at"], name="audit_audit_user_ro_845dd3_idx"),
        ),
    ]
