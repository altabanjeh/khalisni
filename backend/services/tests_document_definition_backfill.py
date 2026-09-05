"""Regression tests for D6/CE10 canonical-definition linking (non-destructive)."""

from rest_framework.test import APITestCase

from services.models import (
    RequiredDocumentDefinition,
    Service,
    ServiceCategory,
    ServiceRequiredDocument,
)


class EnsureDocumentDefinitionTests(APITestCase):
    def setUp(self):
        self.cat = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="edd-cat")
        self.service = Service.objects.create(
            category=self.cat, name_ar="S", name_en="S", slug="edd-svc",
            description_ar="d", estimated_duration=1, base_price="1.00",
        )

    def test_links_existing_definition_by_code(self):
        definition = RequiredDocumentDefinition.objects.create(
            code="national_id", name_ar="هوية", name_en="ID", is_active=True
        )
        rule = ServiceRequiredDocument.objects.create(
            service=self.service, document_type="National ID", name_ar="هوية", is_required=True
        )
        self.assertIsNone(rule.document_definition_id)  # not auto-linked on save()
        linked = rule.ensure_document_definition()
        rule.refresh_from_db()
        self.assertEqual(linked, definition)
        self.assertEqual(rule.document_definition_id, definition.pk)

    def test_creates_definition_when_missing(self):
        rule = ServiceRequiredDocument.objects.create(
            service=self.service, document_type="lease_contract", name_ar="عقد إيجار", is_required=True
        )
        rule.ensure_document_definition()
        rule.refresh_from_db()
        self.assertIsNotNone(rule.document_definition_id)
        self.assertEqual(rule.document_definition.code, "lease_contract")

    def test_skips_when_it_would_duplicate_a_service_definition_link(self):
        definition = RequiredDocumentDefinition.objects.create(code="passport", name_ar="جواز", is_active=True)
        first = ServiceRequiredDocument.objects.create(
            service=self.service, document_definition=definition, document_type="passport",
            name_ar="جواز", is_required=True,
        )
        # a second free-text rule that would resolve to the same definition
        second = ServiceRequiredDocument.objects.create(
            service=self.service, document_type="passport_copy", name_ar="نسخة جواز", is_required=True
        )
        # make its code collide with the first
        second.document_type = "passport"
        result = second.ensure_document_definition()
        second.refresh_from_db()
        self.assertIsNone(result)  # skipped, no IntegrityError
        self.assertIsNone(second.document_definition_id)
        self.assertEqual(first.document_definition_id, definition.pk)

    def test_migration_0011_backfilled_seed_rows(self):
        # Any ServiceRequiredDocument that exists in a fresh DB after migrations
        # must already carry a document_definition (migration 0011 backfill).
        unlinked = ServiceRequiredDocument.objects.filter(
            document_definition__isnull=True, is_deleted=False
        ).exclude(document_type="")
        self.assertEqual(list(unlinked), [], "migration 0011 should backfill every rule")
