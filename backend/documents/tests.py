from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory


class DocumentValidationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="category-docs")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="service-docs",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="customer-doc@example.com",
            password="Password@123",
            full_name="Customer",
            phone="0799999999",
            role=CustomUser.Role.CUSTOMER,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")

    def test_document_upload_validates_file_type(self):
        self.client.force_authenticate(self.customer)
        bad_file = SimpleUploadedFile("malware.exe", b"fake-binary", content_type="application/octet-stream")
        response = self.client.post(
            f"/api/customer/orders/{self.order.id}/documents/",
            {"document_type": "ID", "file": bad_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DocumentStaffVerificationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="category-doc-review")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="service-doc-review",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="customer-review@example.com",
            password="Password@123",
            full_name="Customer Review",
            phone="0799999998",
            role=CustomUser.Role.CUSTOMER,
        )
        self.employee = CustomUser.objects.create_user(
            email="employee-review@example.com",
            password="Password@123",
            full_name="Employee Review",
            phone="0799999997",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        self.document = Document.objects.create(
            order=self.order,
            uploaded_by=self.customer,
            document_type="national_id",
            file=SimpleUploadedFile("id.pdf", b"fake-pdf-content", content_type="application/pdf"),
            original_filename="id.pdf",
            file_size=16,
            mime_type="application/pdf",
        )

    def test_employee_can_verify_document(self):
        self.client.force_authenticate(self.employee)
        response = self.client.post(
            f"/api/staff/documents/{self.document.id}/verify/",
            {"is_verified": True, "note": "Looks good"},
            format="json",
            HTTP_X_REQUEST_ID="doc-verify-1",
            HTTP_USER_AGENT="document-tests",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.document.refresh_from_db()
        self.assertTrue(self.document.is_verified)
        self.assertEqual(self.document.verified_by_id, self.employee.id)
        audit_entry = AuditLog.objects.get(action="verify_document", entity_type="Document", entity_id=str(self.document.id))
        self.assertEqual(audit_entry.user_role, CustomUser.Role.EMPLOYEE)
        self.assertEqual(audit_entry.source, AuditLog.Source.EMPLOYEE_PORTAL)
        self.assertEqual(audit_entry.request_id, "doc-verify-1")

    def test_provider_cannot_verify_document(self):
        provider = CustomUser.objects.create_user(
            email="provider-review@example.com",
            password="Password@123",
            full_name="Provider Review",
            phone="0799999996",
            role=CustomUser.Role.PROVIDER,
        )
        self.client.force_authenticate(provider)
        response = self.client.post(
            f"/api/staff/documents/{self.document.id}/verify/",
            {"is_verified": True, "note": "Should fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_document_queue_defaults_to_pending_documents_and_includes_history_fields(self):
        approved_document = Document.objects.create(
            order=self.order,
            uploaded_by=self.customer,
            document_type="passport_copy",
            file=SimpleUploadedFile("passport.pdf", b"fake-pdf-content", content_type="application/pdf"),
            original_filename="passport.pdf",
            file_size=16,
            mime_type="application/pdf",
            status=Document.DocumentStatus.APPROVED,
            is_verified=True,
            verified_by=self.employee,
        )
        self.client.force_authenticate(self.employee)

        response = self.client.get("/api/staff/documents/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual(len(records), 1)
        payload = records[0]
        self.assertEqual(payload["id"], self.document.id)
        self.assertEqual(payload["order"]["order_number"], self.order.order_number)
        self.assertEqual(payload["uploaded_by_name"], self.customer.full_name)
        self.assertNotEqual(payload["id"], approved_document.id)

    def test_rejecting_final_document_returns_order_to_in_progress(self):
        provider_user = CustomUser.objects.create_user(
            email="provider-doc-review@example.com",
            password="Password@123",
            full_name="Provider Doc Review",
            phone="0799999995",
            role=CustomUser.Role.PROVIDER,
        )
        provider = ProviderProfile.objects.create(user=provider_user, provider_type="Agent", city="Amman")
        self.order.assigned_provider = provider
        self.order.status = Order.Status.READY_FOR_DELIVERY
        self.order.save(update_fields=["assigned_provider", "status", "updated_at"])
        final_document = Document.objects.create(
            order=self.order,
            uploaded_by=self.customer,
            document_type="final_report",
            file=SimpleUploadedFile("final.pdf", b"fake-pdf-content", content_type="application/pdf"),
            original_filename="final.pdf",
            file_size=16,
            mime_type="application/pdf",
            is_final_document=True,
        )
        self.client.force_authenticate(self.employee)
        response = self.client.post(
            f"/api/staff/documents/{final_document.id}/verify/",
            {"is_verified": False, "note": "Needs rework"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.IN_PROGRESS)


class DocumentAdminCrudTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="category-admin-docs")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="service-admin-docs",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="customer-admin-doc@example.com",
            password="Password@123",
            full_name="Customer Admin Doc",
            phone="0799999994",
            role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="admin-doc@example.com",
            password="Password@123",
            full_name="Admin Doc",
            phone="0799999993",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")

    def test_admin_can_create_and_delete_document(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/admin/documents/",
            {
                "order": self.order.id,
                "uploaded_by": self.admin.id,
                "document_type": "final_report",
                "file": SimpleUploadedFile("admin.pdf", b"fake-pdf-content", content_type="application/pdf"),
                "mime_type": "application/pdf",
                "file_size": 16,
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        document_id = response.data["document_id"]
        delete_response = self.client.delete(f"/api/admin/documents/{document_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
