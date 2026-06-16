from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from organizations.models import Organization, OrganizationMembership
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
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["id"], self.visible_order.id)

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
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual(len(records), 2)

    def test_employee_order_filtered_provider_list_returns_only_eligible_providers(self):
        service = self.visible_order.service
        self.visible_order.status = Order.Status.UNDER_REVIEW
        self.visible_order.assigned_employee = self.employee_user
        self.visible_order.save(update_fields=["status", "assigned_employee", "updated_at"])
        ServiceProviderAssignment.objects.create(service=service, provider=self.provider, is_active=True)
        self.other_provider.is_available = False
        self.other_provider.save(update_fields=["is_available"])

        self.client.force_authenticate(self.employee_user)
        response = self.client.get(f"/api/admin/providers/?order={self.visible_order.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["id"], self.provider.id)

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


class ProviderOrganizationScopeTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="provider-scope-category")
        self.partner_org_a = Organization.objects.create(
            name="Partner A",
            slug="partner-a",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.partner_org_b = Organization.objects.create(
            name="Partner B",
            slug="partner-b",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.provider_org_a = Organization.objects.create(
            name="Provider Org A",
            slug="provider-org-a",
            organization_type=Organization.OrganizationType.PROVIDER,
        )
        self.provider_org_b = Organization.objects.create(
            name="Provider Org B",
            slug="provider-org-b",
            organization_type=Organization.OrganizationType.PROVIDER,
        )
        self.customer = CustomUser.objects.create_user(
            email="scope-customer@example.com",
            password="Password@123",
            full_name="Scoped Customer",
            phone="0799000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.partner_admin = CustomUser.objects.create_user(
            email="partner-admin@example.com",
            password="Password@123",
            full_name="Partner Admin",
            phone="0799000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=self.partner_admin,
            organization=self.partner_org_a,
            role=OrganizationMembership.MembershipRole.PARTNER_ADMIN,
        )
        self.service_a = Service.objects.create(
            category=self.category,
            organization=self.partner_org_a,
            scope=Service.Scope.PARTNER_PRIVATE,
            name_ar="خدمة أ",
            name_en="Service A",
            slug="provider-scope-service-a",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.service_b = Service.objects.create(
            category=self.category,
            organization=self.partner_org_b,
            scope=Service.Scope.PARTNER_PRIVATE,
            name_ar="خدمة ب",
            name_en="Service B",
            slug="provider-scope-service-b",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        provider_user_a = CustomUser.objects.create_user(
            email="provider-scope-a@example.com",
            password="Password@123",
            full_name="Provider Scope A",
            phone="0799000003",
            role=CustomUser.Role.PROVIDER,
        )
        provider_user_b = CustomUser.objects.create_user(
            email="provider-scope-b@example.com",
            password="Password@123",
            full_name="Provider Scope B",
            phone="0799000004",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider_a = ProviderProfile.objects.create(
            organization=self.provider_org_a,
            user=provider_user_a,
            provider_type="Agent",
            city="Amman",
            is_available=True,
            is_approved=True,
        )
        self.provider_b = ProviderProfile.objects.create(
            organization=self.provider_org_b,
            user=provider_user_b,
            provider_type="Agent",
            city="Irbid",
            is_available=True,
            is_approved=True,
        )
        ServiceProviderAssignment.objects.create(service=self.service_a, provider=self.provider_a, is_active=True)
        ServiceProviderAssignment.objects.create(service=self.service_b, provider=self.provider_b, is_active=True)
        self.order_a = Order.objects.create(
            customer=self.customer,
            organization=self.partner_org_a,
            service=self.service_a,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
        )
        self.order_b = Order.objects.create(
            customer=self.customer,
            organization=self.partner_org_b,
            service=self.service_b,
            city="Irbid",
            status=Order.Status.UNDER_REVIEW,
        )

    def test_partner_admin_only_sees_providers_for_in_scope_services(self):
        self.client.force_authenticate(self.partner_admin)

        response = self.client.get("/api/admin/providers/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual([record["id"] for record in records], [self.provider_a.id])

    def test_partner_admin_cannot_retrieve_or_update_out_of_scope_provider(self):
        self.client.force_authenticate(self.partner_admin)

        detail_response = self.client.get(f"/api/admin/providers/{self.provider_b.id}/")
        activation_response = self.client.post(
            f"/api/admin/providers/{self.provider_b.id}/activation/",
            {"is_active": False, "reason": "Scoped test"},
            format="json",
        )

        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(activation_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partner_admin_cannot_lookup_provider_candidates_for_foreign_order(self):
        self.client.force_authenticate(self.partner_admin)

        response = self.client.get(f"/api/admin/providers/?order={self.order_b.id}")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_partner_admin_can_lookup_provider_candidates_for_visible_order(self):
        self.client.force_authenticate(self.partner_admin)

        response = self.client.get(f"/api/admin/providers/?order={self.order_a.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual([record["id"] for record in records], [self.provider_a.id])
