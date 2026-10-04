from django.test import TestCase

from services.catalog_locale_audit import audit_public_catalog_arabic
from services.models import Service, ServiceCategory


class PublicCatalogLocaleAuditTests(TestCase):
    def test_flags_published_english_arabic_values_and_ignores_hidden_drafts(self):
        category = ServiceCategory.objects.create(
            slug="locale-audit-category", name_ar="English category", name_en="English category",
            description_ar="English description", show_on_public_site=True,
        )
        service = Service.objects.create(
            category=category, slug="locale-audit-service", name_ar="Arabic missing",
            name_en="English service", description_ar="English description",
            required_information_schema=[{"key": "parcel", "label_ar": "Parcel number", "label_en": "Parcel number"}],
            show_on_public_site=True,
        )
        ServiceCategory.objects.create(
            slug="locale-audit-hidden", name_ar="Hidden English", name_en="Hidden English",
            show_on_public_site=False,
        )

        findings = audit_public_catalog_arabic()
        fields = {(item["kind"], item["field"]) for item in findings}
        self.assertIn(("category", "name_ar"), fields)
        self.assertIn(("service", "name_ar"), fields)
        self.assertIn(("service_field", "label_ar"), fields)
        self.assertFalse(any(item["id"] == "locale-audit-hidden" for item in findings))

        category.name_ar = "التصنيف"
        category.description_ar = "وصف التصنيف"
        category.save()
        service.name_ar = "الخدمة"
        service.description_ar = "وصف الخدمة"
        service.required_information_schema = [{"key": "parcel", "label_ar": "رقم القطعة", "label_en": "Parcel number"}]
        service.save()
        self.assertEqual(audit_public_catalog_arabic(), [])
