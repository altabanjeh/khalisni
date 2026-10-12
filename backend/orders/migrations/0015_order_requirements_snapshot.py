from django.db import migrations, models


def freeze_existing_requirements(apps, schema_editor):
    """Freeze today's catalog requirements onto orders that have no snapshot.

    Without this, existing orders would keep following live catalog edits.
    Rows are written in batches to keep each statement short.
    """
    Order = apps.get_model("orders", "Order")
    ServiceRequiredDocument = apps.get_model("services", "ServiceRequiredDocument")

    by_service = {}
    requirements = (
        ServiceRequiredDocument.objects.filter(is_active=True, is_deleted=False)
        .select_related("document_definition")
        .order_by("service_id", "display_order", "pk")
    )
    for requirement in requirements:
        definition = requirement.document_definition
        by_service.setdefault(requirement.service_id, []).append(
            {
                "id": requirement.pk,
                "service": requirement.service_id,
                "definition_id": requirement.document_definition_id,
                "document_definition": requirement.document_definition_id,
                "code": requirement.document_type,
                "document_type": requirement.document_type,
                "name_ar": requirement.name_ar or getattr(definition, "name_ar", "") or "",
                "name_en": requirement.name_en or getattr(definition, "name_en", "") or "",
                "instructions_ar": requirement.instructions_ar or "",
                "instructions_en": requirement.instructions_en or "",
                "is_required": requirement.is_required,
                "allowed_extensions": list(requirement.allowed_extensions or []),
                "max_file_size": requirement.max_file_size,
                "requires_verification": requirement.requires_verification,
                "client_can_replace_file": requirement.client_can_replace_file,
                "provider_can_view_file": requirement.provider_can_view_file,
                "display_order": requirement.display_order,
                "is_active": True,
                "is_deleted": False,
            }
        )

    batch = []
    for order in Order.objects.filter(requirements_snapshot__isnull=True).only("pk", "service_id").iterator(chunk_size=500):
        order.requirements_snapshot = by_service.get(order.service_id, [])
        batch.append(order)
        if len(batch) >= 500:
            Order.objects.bulk_update(batch, ["requirements_snapshot"])
            batch = []
    if batch:
        Order.objects.bulk_update(batch, ["requirements_snapshot"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0014_order_submission_fingerprint_order_submission_key_and_more"),
        ("services", "0013_normalize_legacy_schema_locale_fields"),
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
        migrations.RunPython(freeze_existing_requirements, migrations.RunPython.noop),
    ]
