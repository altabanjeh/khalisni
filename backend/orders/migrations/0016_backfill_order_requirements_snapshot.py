from django.db import migrations, transaction


BATCH_SIZE = 500


def freeze_existing_requirements(apps, schema_editor):
    """Freeze today's catalog requirements onto orders that have no snapshot.

    Without this, existing orders would keep following live catalog edits.

    This is the catalog as it is at migration time, not as it was when each
    order was created: the system kept no history of requirement rules, so the
    original state cannot be reconstructed (see
    docs/hardening/KHALSNI_HARDENING_FINAL.md, legacy snapshot assumption).

    The migration is non-atomic and commits every batch, so it holds only short
    row locks and can be re-run safely: it touches only orders with no snapshot.
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

    pending = Order.objects.filter(requirements_snapshot__isnull=True)
    while True:
        batch = list(pending.order_by("pk").only("pk", "service_id")[:BATCH_SIZE])
        if not batch:
            break
        for order in batch:
            order.requirements_snapshot = by_service.get(order.service_id, [])
        with transaction.atomic():
            Order.objects.bulk_update(batch, ["requirements_snapshot"])


class Migration(migrations.Migration):
    # Each batch commits on its own; no long transaction, no table-wide lock.
    atomic = False

    dependencies = [
        ("orders", "0015_order_requirements_snapshot"),
        ("services", "0013_normalize_legacy_schema_locale_fields"),
    ]

    operations = [
        migrations.RunPython(freeze_existing_requirements, migrations.RunPython.noop),
    ]
