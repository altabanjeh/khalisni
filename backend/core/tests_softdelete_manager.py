"""Regression tests for the non-breaking SoftDeleteQuerySet helpers (D-DB1 / A2 §2)."""

from rest_framework.test import APITestCase

from services.models import RequiredDocumentDefinition, Service, ServiceCategory


class SoftDeleteQuerySetHelperTests(APITestCase):
    def setUp(self):
        self.cat = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="sdq-cat")
        self.a = Service.objects.create(
            category=self.cat, name_ar="A", name_en="A", slug="sdq-a",
            description_ar="d", estimated_duration=1, base_price="1.00",
        )
        self.b = Service.objects.create(
            category=self.cat, name_ar="B", name_en="B", slug="sdq-b",
            description_ar="d", estimated_duration=1, base_price="1.00",
        )
        self.b.soft_delete(reason="test")

    def test_default_manager_is_unchanged(self):
        # Non-breaking: .all() still returns every row (deleted included).
        slugs = set(Service.objects.filter(slug__startswith="sdq-").values_list("slug", flat=True))
        self.assertEqual(slugs, {"sdq-a", "sdq-b"})

    def test_alive_and_deleted_helpers(self):
        self.assertEqual(
            set(Service.objects.filter(slug__startswith="sdq-").alive().values_list("slug", flat=True)),
            {"sdq-a"},
        )
        self.assertEqual(
            set(Service.objects.filter(slug__startswith="sdq-").deleted().values_list("slug", flat=True)),
            {"sdq-b"},
        )
        self.assertEqual(
            set(Service.objects.filter(slug__startswith="sdq-").with_deleted().values_list("slug", flat=True)),
            {"sdq-a", "sdq-b"},
        )

    def test_active_helper_also_respects_is_active(self):
        self.a.is_active = False
        self.a.save(update_fields=["is_active"])
        self.assertEqual(
            list(Service.objects.filter(slug__startswith="sdq-").active().values_list("slug", flat=True)),
            [],
        )
        # alive() ignores is_active, active() applies it
        self.assertEqual(
            set(Service.objects.filter(slug__startswith="sdq-").alive().values_list("slug", flat=True)),
            {"sdq-a"},
        )

    def test_helper_available_on_model_without_is_active(self):
        RequiredDocumentDefinition.objects.create(code="sdq_doc", name_ar="x", is_active=True)
        self.assertEqual(RequiredDocumentDefinition.objects.filter(code="sdq_doc").alive().count(), 1)
        self.assertEqual(RequiredDocumentDefinition.objects.filter(code="sdq_doc").deleted().count(), 0)
