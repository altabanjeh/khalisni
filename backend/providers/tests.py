from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument
from django.core.files.uploadedfile import SimpleUploadedFile


class ProviderPermissionsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="category")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="service",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="customer@example.com",
            password="Password@123",
            full_name="Customer",
            phone="0796666666",
            role=CustomUser.Role.CUSTOMER,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="provider@example.com",
            password="Password@123",
            full_name="Provider",
            phone="0797777777",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )
        other_provider_user = CustomUser.objects.create_user(
            email="provider2@example.com",
            password="Password@123",
            full_name="Provider 2",
            phone="0798888888",
            role=CustomUser.Role.PROVIDER,
        )
        self.other_provider = ProviderProfile.objects.create(
            user=other_provider_user,
            provider_type="Agent",
            city="Irbid",
            is_approved=True,
        )
        self.visible_order = Order.objects.create(
            customer=self.customer,
            service=service,
            city="Amman",
            assigned_provider=self.provider,
            status=Order.Status.ASSIGNED,
        )
        self.hidden_order = Order.objects.create(
            customer=self.customer,
            service=service,
            city="Irbid",
            assigned_provider=self.other_provider,
            status=Order.Status.ASSIGNED,
        )
        self.employee_user = CustomUser.objects.create_user(
            email="employee@example.com",
            password="Password@123",
            full_name="Employee",
            phone="0791111222",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.admin_user = CustomUser.objects.create_user(
            email="provider-admin@example.com",
            password="Password@123",
            full_name="Provider Admin",
            phone="0793333444",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )

    def test_provider_can_only_see_assigned_orders(self):
        self.client.force_authenticate(self.provider_user)
        response = self.client.get("/api/provider/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.visible_order.id)

    def test_provider_cannot_access_unassigned_order_detail(self):
        self.client.force_authenticate(self.provider_user)
        response = self.client.get(f"/api/provider/orders/{self.hidden_order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_provider_order_detail_hides_private_fields_and_unrelated_documents(self):
        ServiceRequiredDocument.objects.create(
            service=self.visible_order.service,
            document_type="national_id",
            name_ar="National ID",
            display_order=1,
            provider_can_view_file=True,
        )
        self.visible_order.customer_notes = "Customer-facing work summary"
        self.visible_order.internal_notes = "Internal operations note"
        self.visible_order.save(update_fields=["customer_notes", "internal_notes", "updated_at"])
        Document.objects.create(
            order=self.visible_order,
            uploaded_by=self.customer,
            document_type="national_id",
            file=SimpleUploadedFile("national-id.pdf", b"pdf", content_type="application/pdf"),
            original_filename="national-id.pdf",
            file_size=3,
            mime_type="application/pdf",
        )
        Document.objects.create(
            order=self.visible_order,
            uploaded_by=self.customer,
            document_type="bank_statement",
            file=SimpleUploadedFile("bank.pdf", b"pdf", content_type="application/pdf"),
            original_filename="bank.pdf",
            file_size=3,
            mime_type="application/pdf",
        )
        Document.objects.create(
            order=self.visible_order,
            uploaded_by=self.provider_user,
            document_type="FINAL_RESULT",
            file=SimpleUploadedFile("final.pdf", b"pdf", content_type="application/pdf"),
            original_filename="final.pdf",
            file_size=3,
            mime_type="application/pdf",
            is_final_document=True,
        )

        self.client.force_authenticate(self.provider_user)
        response = self.client.get(f"/api/provider/orders/{self.visible_order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("customer", response.data)
        self.assertNotIn("internal_notes", response.data)
        self.assertNotIn("customer_notes", response.data)
        self.assertNotIn("final_price", response.data)
        self.assertNotIn("notes", response.data)
        self.assertEqual(response.data["assigned_work_details"], "Customer-facing work summary")
        self.assertEqual(
            sorted(document["document_type"] for document in response.data["documents"]),
            ["FINAL_RESULT", "national_id"],
        )

    def test_employee_can_list_providers_for_assignment(self):
        self.client.force_authenticate(self.employee_user)
        response = self.client.get("/api/admin/providers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_employee_order_filtered_provider_list_returns_only_eligible_providers(self):
        service = self.visible_order.service
        ServiceProviderAssignment.objects.create(service=service, provider=self.provider, is_active=True)
        self.other_provider.is_available = False
        self.other_provider.save(update_fields=["is_available"])

        self.client.force_authenticate(self.employee_user)
        response = self.client.get(f"/api/admin/providers/?order={self.visible_order.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.provider.id)

    def test_admin_can_approve_and_deactivate_provider_with_audit(self):
        pending_provider_user = CustomUser.objects.create_user(
            email="pending-provider@example.com",
            password="Password@123",
            full_name="Pending Provider",
            phone="0795555666",
            role=CustomUser.Role.PROVIDER,
        )
        pending_provider = ProviderProfile.objects.create(
            user=pending_provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=False,
        )

        self.client.force_authenticate(self.admin_user)
        approval_response = self.client.post(
            f"/api/admin/providers/{pending_provider.id}/approval/",
            {"decision": "approve"},
            format="json",
        )
        self.assertEqual(approval_response.status_code, status.HTTP_200_OK)
        pending_provider.refresh_from_db()
        self.assertTrue(pending_provider.is_approved)
        self.assertEqual(pending_provider.approved_by_id, self.admin_user.id)

        deactivation_response = self.client.post(
            f"/api/admin/providers/{pending_provider.id}/activation/",
            {"is_active": False, "reason": "Capacity paused"},
            format="json",
        )
        self.assertEqual(deactivation_response.status_code, status.HTTP_200_OK)
        pending_provider.refresh_from_db()
        self.assertFalse(pending_provider.user.is_active)
        self.assertFalse(pending_provider.is_available)
        self.assertTrue(
            AuditLog.objects.filter(
                entity_type="ProviderProfile",
                entity_id=str(pending_provider.id),
                action="provider_activation_change",
            ).exists()
        )

    def test_employee_cannot_use_provider_approval_actions(self):
        self.client.force_authenticate(self.employee_user)
        response = self.client.post(
            f"/api/admin/providers/{self.provider.id}/approval/",
            {"decision": "reject", "reason": "Missing paperwork"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
