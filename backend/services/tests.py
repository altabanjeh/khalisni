from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from orders.models import Order
from services.models import Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument


class ServiceManagementPermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="service-mgmt-category")
        self.employee = CustomUser.objects.create_user(
            email="service-employee@example.com",
            password="Password@123",
            full_name="Service Employee",
            phone="0794000001",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.admin = CustomUser.objects.create_user(
            email="service-admin@example.com",
            password="Password@123",
            full_name="Service Admin",
            phone="0794000002",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )

    def test_employee_cannot_access_service_management(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/services/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_access_service_management(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/services/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_edit_safe_service_fields_and_change_is_audited(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة",
            name_en="Service",
            slug="service-edit-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        self.client.force_authenticate(self.admin)

        response = self.client.patch(
            f"/api/admin/services/{service.id}/",
            {
                "category_id": self.category.id,
                "name_ar": "خدمة محدثة",
                "name_en": "Updated Service",
                "description_ar": "تفاصيل محدثة",
                "description_en": "Updated description",
                "base_price": "12.00",
                "government_fee": "4.00",
                "service_fee": "5.00",
                "estimated_duration": 3,
                "estimated_duration_unit": "days",
                "price_type": "fixed",
                "provider_required": True,
                "requires_manual_review": True,
                "requires_appointment": False,
                "is_online": True,
                "is_featured": False,
                "is_active": True,
                "display_order": 0,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        service.refresh_from_db()
        self.assertEqual(service.name_ar, "خدمة محدثة")
        self.assertEqual(str(service.base_price), "12.00")
        self.assertTrue(
            AuditLog.objects.filter(
                action="update_service",
                entity_type="Service",
                entity_id=str(service.id),
            ).exists()
        )

    def test_admin_can_manage_required_documents_safely(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مستندات",
            name_en="Doc Service",
            slug="doc-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        self.client.force_authenticate(self.admin)

        create_response = self.client.post(
            "/api/admin/service-documents/",
            {
                "service_id": service.id,
                "document_type": "national_id",
                "name_ar": "هوية",
                "name_en": "National ID",
                "is_required": True,
                "allowed_extensions": [".pdf", ".jpg"],
                "max_file_size": 5242880,
                "requires_verification": True,
                "client_can_replace_file": False,
                "provider_can_view_file": True,
                "display_order": 1,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        requirement_id = create_response.data["id"]

        update_response = self.client.patch(
            f"/api/admin/service-documents/{requirement_id}/",
            {"provider_can_view_file": False},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        requirement = ServiceRequiredDocument.objects.get(pk=requirement_id)
        self.assertFalse(requirement.provider_can_view_file)
        self.assertTrue(
            AuditLog.objects.filter(
                entity_type="ServiceRequiredDocument",
                entity_id=str(requirement_id),
            ).exists()
        )

    def test_admin_service_delete_soft_disables_used_service(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مستخدمة",
            name_en="Used Service",
            slug="used-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        customer = CustomUser.objects.create_user(
            email="service-customer@example.com",
            password="Password@123",
            full_name="Customer",
            phone="0794999999",
            role=CustomUser.Role.CUSTOMER,
        )
        Order.objects.create(customer=customer, service=service, city="Amman")
        self.client.force_authenticate(self.admin)

        response = self.client.delete(f"/api/admin/services/{service.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        service.refresh_from_db()
        self.assertFalse(service.is_active)

    def test_admin_can_manage_service_provider_assignment(self):
        service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مزود",
            name_en="Provider Service",
            slug="provider-service-safe",
            description_ar="تفاصيل",
            base_price=10,
            government_fee=3,
            service_fee=4,
            estimated_duration=2,
        )
        provider_user = CustomUser.objects.create_user(
            email="assign-provider@example.com",
            password="Password@123",
            full_name="Assign Provider",
            phone="0794777777",
            role=CustomUser.Role.PROVIDER,
        )
        from providers.models import ProviderProfile

        provider = ProviderProfile.objects.create(user=provider_user, provider_type="Agent", city="Amman", is_approved=True)
        self.client.force_authenticate(self.admin)

        response = self.client.post(
            "/api/admin/service-provider-assignments/",
            {"service_id": service.id, "provider_id": provider.id, "is_active": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(ServiceProviderAssignment.objects.filter(service=service, provider=provider).exists())
