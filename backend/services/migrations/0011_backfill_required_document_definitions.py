"""Defect D6 / CE10: backfill every ServiceRequiredDocument with a canonical
RequiredDocumentDefinition so validation and the missing-document workflow can
key on a stable id/code rather than a translated name.

Non-destructive: legacy ``document_type`` / ``name_ar`` / ``name_en`` columns are
kept and stay synced. Idempotent — safe to re-run. Mirrors
``services.management.commands.normalize_required_documents``.
"""

from django.db import migrations


def _normalize_code(value):
    return str(value or "").strip().lower().replace(" ", "_")


def backfill(apps, schema_editor):
    RequiredDocumentDefinition = apps.get_model("services", "RequiredDocumentDefinition")
    ServiceRequiredDocument = apps.get_model("services", "ServiceRequiredDocument")

    by_code = {d.code: d for d in RequiredDocumentDefinition.objects.all()}

    for rule in ServiceRequiredDocument.objects.all().order_by("requirement_id"):
        if rule.document_definition_id:
            continue
        code = _normalize_code(rule.document_type) or f"document_{rule.requirement_id}"
        definition = by_code.get(code)
        if definition is None:
            definition = RequiredDocumentDefinition.objects.create(
                code=code,
                name_ar=rule.name_ar or code,
                name_en=rule.name_en or "",
                allowed_extensions=list(rule.allowed_extensions or []),
                max_file_size=rule.max_file_size or (10 * 1024 * 1024),
                is_active=True,
                is_deleted=False,
            )
            by_code[code] = definition
        rule.document_definition = definition
        rule.document_type = definition.code
        rule.name_ar = definition.name_ar or rule.name_ar
        rule.name_en = definition.name_en or rule.name_en
        rule.save(update_fields=["document_definition", "document_type", "name_ar", "name_en"])


def noop_reverse(apps, schema_editor):
    # Backfill only adds links; nothing to undo.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("services", "0010_alter_serviceproviderassignment_provider_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill, noop_reverse),
    ]
