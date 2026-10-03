import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from accounts.models import CustomUser
from documents.services import create_order_document
from orders.models import Order
from orders.readiness import evaluate_order_requirements
from services.models import Service, ServiceCategory, ServiceRequiredDocument


class OrderReadinessTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_dir = tempfile.TemporaryDirectory()
        cls.media_override = override_settings(MEDIA_ROOT=cls.media_dir.name)
        cls.media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.media_override.disable()
        cls.media_dir.cleanup()
        super().tearDownClass()

    def setUp(self):
        category = ServiceCategory.objects.create(name_ar="اختبار", name_en="QA", slug="qa-readiness")
        service = Service.objects.create(
            category=category, name_ar="خدمة اختبار", name_en="QA service",
            slug="qa-readiness", description_ar="اختبار الجاهزية",
        )
        self.customer = CustomUser.objects.create_user(
            email="readiness@example.test", password=None, full_name="QA Customer",
            role=CustomUser.Role.CUSTOMER,
        )
        self.employee = CustomUser.objects.create_user(
            email="reviewer@example.test", password=None, full_name="QA Reviewer",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        for code, required in (("mandatory", True), ("optional", False)):
            ServiceRequiredDocument.objects.create(
                service=service, document_type=code, name_ar=code,
                is_required=required, requires_verification=True,
            )

    def upload(self):
        return create_order_document(
            order=self.order, uploaded_by=self.customer,
            document_type="mandatory",
            file_obj=SimpleUploadedFile("qa.pdf", b"%PDF-1.4\n%%EOF", content_type="application/pdf"),
        )

    def test_mandatory_document_lifecycle_and_optional_absence(self):
        readiness = evaluate_order_requirements(self.order)
        self.assertFalse(readiness["requirements_complete"])
        self.assertEqual(readiness["blocking_reasons"], [{"code": "not_uploaded", "document_type": "mandatory"}])
        self.assertEqual({row["document_type"]: row["state"] for row in readiness["documents"]}, {
            "mandatory": "not_uploaded", "optional": "not_uploaded",
        })

        document = self.upload()
        readiness = evaluate_order_requirements(self.order)
        self.assertFalse(readiness["requirements_complete"])
        self.assertEqual(readiness["blocking_reasons"][0]["code"], "pending_review")

        document.mark_rejected(user=self.employee, reason="Unreadable QA file")
        readiness = evaluate_order_requirements(self.order)
        self.assertEqual(readiness["blocking_reasons"][0]["code"], "rejected")

        replacement = self.upload()
        replacement.mark_verified(user=self.employee, note="QA approved")
        readiness = evaluate_order_requirements(self.order)
        self.assertTrue(readiness["requirements_complete"])
        self.assertEqual(readiness["blocking_reasons"], [])
        self.assertEqual(next(row for row in readiness["documents"] if row["document_type"] == "optional")["state"], "not_uploaded")

    def test_unresolved_requested_optional_document_blocks_progress(self):
        document = self.upload()
        document.mark_verified(user=self.employee, note="QA approved")
        self.order.missing_document_types = ["optional"]
        self.order.save(update_fields=["missing_document_types"])
        readiness = evaluate_order_requirements(self.order)
        self.assertFalse(readiness["requirements_complete"])
        self.assertIn({"code": "requested_document_unresolved", "document_type": "optional"}, readiness["blocking_reasons"])
