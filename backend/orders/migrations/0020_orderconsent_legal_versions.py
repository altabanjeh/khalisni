"""Consent evidence also records the consent type and the published legal versions (D06).

Adding a column with a default makes Django rebuild the table on SQLite
(create new table, copy rows, drop old table, rename). Dropping the old table
also drops the append-only triggers created in ``orders.0019``, so this
migration re-creates them afterwards (and again after a reverse rebuild).
Rows are copied with INSERT; no row is updated or deleted.

On PostgreSQL ``ALTER TABLE ... ADD COLUMN`` keeps the table and its trigger;
the existing rows read ``consent_type = 'order_submission'`` (every row so far
was written at order submission) and blank legal versions (unknown, not
reconstructed).
"""

from django.db import migrations, models

TABLE = "orders_orderconsent"
MESSAGE = "Consent evidence is append-only."

SQLITE_TRIGGERS = [
    f"DROP TRIGGER IF EXISTS {TABLE}_no_update;",
    f"DROP TRIGGER IF EXISTS {TABLE}_no_delete;",
    f"CREATE TRIGGER {TABLE}_no_update BEFORE UPDATE ON {TABLE} "
    f"BEGIN SELECT RAISE(ABORT, '{MESSAGE}'); END;",
    f"CREATE TRIGGER {TABLE}_no_delete BEFORE DELETE ON {TABLE} "
    f"BEGIN SELECT RAISE(ABORT, '{MESSAGE}'); END;",
]


def ensure_sqlite_triggers(apps, schema_editor):
    if schema_editor.connection.vendor != "sqlite":
        return
    for statement in SQLITE_TRIGGERS:
        schema_editor.execute(statement, params=None)


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0019_order_consent_append_only"),
    ]

    operations = [
        # Runs last when this migration is reversed (after the columns are removed).
        migrations.RunPython(migrations.RunPython.noop, ensure_sqlite_triggers),
        migrations.AddField(
            model_name="orderconsent",
            name="consent_type",
            field=models.CharField(default="order_submission", max_length=32),
        ),
        migrations.AddField(
            model_name="orderconsent",
            name="privacy_version",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="orderconsent",
            name="terms_version",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.RunPython(ensure_sqlite_triggers, migrations.RunPython.noop),
    ]
