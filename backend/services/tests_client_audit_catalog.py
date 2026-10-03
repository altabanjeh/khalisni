from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CustomUser, CustomerProfile
from organizations.models import Organization
from services.models import Service, ServiceCategory


class PlatformCustomerCatalogTests(TestCase):
    def test_global_service_remains_visible_after_customer_gets_platform_organization(self):
        category = ServiceCategory.objects.create(
            name_ar="QA", name_en="QA", slug="audit-platform-catalog",
            is_active=True, show_on_public_site=True,
        )
        service = Service.objects.create(
            category=category, name_ar="QA service", name_en="QA service",
            slug="audit-platform-service", description_ar="QA",
            is_active=True, show_on_public_site=True, scope=Service.Scope.GLOBAL,
        )
        platform = Organization.objects.create(
            name="QA platform", slug="audit-platform", organization_type=Organization.OrganizationType.PLATFORM,
        )
        customer = CustomUser.objects.create_user(
            email="catalog-platform@example.test", password=None,
            full_name="QA customer", role=CustomUser.Role.CUSTOMER,
        )
        CustomerProfile.objects.update_or_create(user=customer, defaults={"organization": platform})
        client = APIClient()
        client.force_authenticate(customer)

        response = client.get(f"/api/services/{service.slug}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], service.id)
