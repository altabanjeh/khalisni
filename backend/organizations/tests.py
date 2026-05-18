from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser, CustomerProfile
from organizations.models import Branch, Organization, OrganizationMembership, PartnerServiceConfig
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory


class B2B2COrganizationTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name_ar="Government Services",
            name_en="Government Services",
            slug="government-services-b2b2c",
        )
        self.platform_admin = CustomUser.objects.create_user(
            email="platform-admin@example.com",
            password="Password@123",
            full_name="Platform Admin",
            phone="0795000001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.partner_one = Organization.objects.create(
            name="Partner One",
            slug="partner-one",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.partner_two = Organization.objects.create(
            name="Partner Two",
            slug="partner-two",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.provider_org = Organization.objects.create(
            name="Provider Org",
            slug="provider-org",
            organization_type=Organization.OrganizationType.PROVIDER,
        )
        self.branch_one = Branch.objects.create(organization=self.partner_one, name="Amman HQ")
        self.branch_two = Branch.objects.create(organization=self.partner_one, name="Irbid Branch")
        self.partner_admin = CustomUser.objects.create_user(
            email="partner-admin@example.com",
            password="Password@123",
            full_name="Partner Admin",
            phone="0795000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.branch_manager = CustomUser.objects.create_user(
            email="branch-manager@example.com",
            password="Password@123",
            full_name="Branch Manager",
            phone="0795000003",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.customer_one = CustomUser.objects.create_user(
            email="customer-one@example.com",
            password="Password@123",
            full_name="Customer One",
            phone="0795000004",
            role=CustomUser.Role.CUSTOMER,
        )
        self.customer_two = CustomUser.objects.create_user(
            email="customer-two@example.com",
            password="Password@123",
            full_name="Customer Two",
            phone="0795000005",
            role=CustomUser.Role.CUSTOMER,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="provider-user@example.com",
            password="Password@123",
            full_name="Provider User",
            phone="0795000006",
            role=CustomUser.Role.PROVIDER,
        )
        self.other_partner_admin = CustomUser.objects.create_user(
            email="partner-two-admin@example.com",
            password="Password@123",
            full_name="Partner Two Admin",
            phone="0795000007",
            role=CustomUser.Role.EMPLOYEE,
        )

        OrganizationMembership.objects.create(
            user=self.partner_admin,
            organization=self.partner_one,
            role=OrganizationMembership.MembershipRole.PARTNER_ADMIN,
        )
        OrganizationMembership.objects.create(
            user=self.branch_manager,
            organization=self.partner_one,
            branch=self.branch_one,
            role=OrganizationMembership.MembershipRole.BRANCH_MANAGER,
        )
        OrganizationMembership.objects.create(
            user=self.other_partner_admin,
            organization=self.partner_two,
            role=OrganizationMembership.MembershipRole.PARTNER_ADMIN,
        )
        OrganizationMembership.objects.create(
            user=self.provider_user,
            organization=self.provider_org,
            role=OrganizationMembership.MembershipRole.PROVIDER_EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=self.customer_one,
            organization=self.partner_one,
            role=OrganizationMembership.MembershipRole.CUSTOMER,
        )
        OrganizationMembership.objects.create(
            user=self.customer_two,
            organization=self.partner_two,
            role=OrganizationMembership.MembershipRole.CUSTOMER,
        )
        CustomerProfile.objects.create(user=self.customer_one, organization=self.partner_one)
        CustomerProfile.objects.create(user=self.customer_two, organization=self.partner_two)

        self.service_global = Service.objects.create(
            category=self.category,
            name_ar="Restaurant License",
            name_en="Restaurant License",
            slug="restaurant-license-b2b2c",
            description_ar="Details",
            estimated_duration=2,
            base_price=10,
            government_fee=5,
            service_fee=5,
        )
        self.service_private = Service.objects.create(
            category=self.category,
            organization=self.partner_one,
            scope=Service.Scope.PARTNER_PRIVATE,
            name_ar="Partner One Private Service",
            name_en="Partner One Private Service",
            slug="partner-one-private-service",
            description_ar="Details",
            estimated_duration=2,
            base_price=20,
            government_fee=5,
            service_fee=5,
        )
        PartnerServiceConfig.objects.create(
            organization=self.partner_one,
            service=self.service_global,
            is_enabled=True,
            visible_to_customers=True,
            custom_price="40.00",
        )
        PartnerServiceConfig.objects.create(
            organization=self.partner_two,
            service=self.service_global,
            is_enabled=False,
            visible_to_customers=False,
        )

        self.provider_profile = ProviderProfile.objects.create(
            user=self.provider_user,
            organization=self.provider_org,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )

        self.order_partner_one_branch_one = Order.objects.create(
            customer=self.customer_one,
            organization=self.partner_one,
            branch=self.branch_one,
            service=self.service_global,
            city="Amman",
            status=Order.Status.NEW,
        )
        self.order_partner_one_branch_two = Order.objects.create(
            customer=self.customer_one,
            organization=self.partner_one,
            branch=self.branch_two,
            service=self.service_private,
            city="Irbid",
            status=Order.Status.NEW,
        )
        self.order_partner_two = Order.objects.create(
            customer=self.customer_two,
            organization=self.partner_two,
            service=self.service_global,
            city="Aqaba",
            status=Order.Status.NEW,
        )
        self.order_provider_assigned = Order.objects.create(
            customer=self.customer_one,
            organization=self.partner_one,
            branch=self.branch_one,
            service=self.service_global,
            city="Amman",
            status=Order.Status.ASSIGNED,
            assigned_provider=self.provider_profile,
            assigned_provider_organization=self.provider_org,
        )

    def test_platform_admin_can_create_organization(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.post(
            "/api/organizations/",
            {
                "name": "Partner Three",
                "slug": "partner-three",
                "organization_type": "partner",
                "legal_name": "Partner Three LLC",
                "email": "three@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Organization.objects.filter(slug="partner-three").exists())

    def test_partner_admin_can_create_branch_for_own_organization(self):
        self.client.force_authenticate(self.partner_admin)

        response = self.client.post(
            "/api/branches/",
            {
                "organization": self.partner_one.id,
                "name": "Zarqa Branch",
                "address": "Street 1",
                "phone": "0795111111",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Branch.objects.filter(organization=self.partner_one, name="Zarqa Branch").exists())

    def test_membership_endpoint_returns_role_data(self):
        self.client.force_authenticate(self.partner_admin)

        response = self.client.get("/api/me/memberships/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["role"], OrganizationMembership.MembershipRole.PARTNER_ADMIN)

    def test_partner_admin_cannot_access_another_partner_data(self):
        self.client.force_authenticate(self.partner_admin)

        organizations_response = self.client.get("/api/organizations/")
        orders_response = self.client.get("/api/admin/orders/")

        self.assertEqual(organizations_response.status_code, status.HTTP_200_OK)
        self.assertEqual({row["slug"] for row in organizations_response.data}, {"partner-one"})
        self.assertEqual(orders_response.status_code, status.HTTP_200_OK)
        returned_ids = {row["id"] for row in orders_response.data}
        self.assertIn(self.order_partner_one_branch_one.id, returned_ids)
        self.assertIn(self.order_partner_one_branch_two.id, returned_ids)
        self.assertNotIn(self.order_partner_two.id, returned_ids)

    def test_customer_cannot_access_another_customers_order(self):
        self.client.force_authenticate(self.customer_one)

        response = self.client.get(f"/api/customer/orders/{self.order_partner_two.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_provider_sees_only_assigned_provider_work(self):
        self.client.force_authenticate(self.provider_user)

        response = self.client.get("/api/provider/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([row["id"] for row in response.data], [self.order_provider_assigned.id])

    def test_partner_service_configuration_controls_customer_visibility(self):
        response_partner_one = self.client.get(f"/api/services/?organization={self.partner_one.slug}")
        response_partner_two = self.client.get(f"/api/services/?organization={self.partner_two.slug}")

        self.assertEqual(response_partner_one.status_code, status.HTTP_200_OK)
        self.assertEqual({row["slug"] for row in response_partner_one.data}, {"restaurant-license-b2b2c", "partner-one-private-service"})
        self.assertEqual(response_partner_two.status_code, status.HTTP_200_OK)
        self.assertEqual(response_partner_two.data, [])

    def test_customer_order_creation_saves_organization_snapshots(self):
        self.client.force_authenticate(self.customer_one)

        response = self.client.post(
            "/api/orders/",
            {
                "organization": self.partner_one.slug,
                "service": self.service_global.id,
                "full_name": self.customer_one.full_name,
                "phone": self.customer_one.phone,
                "national_id": "",
                "city": "Amman",
                "notes": "New order",
                "consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(pk=response.data["id"])
        self.assertEqual(order.organization_id, self.partner_one.id)
        self.assertEqual(order.organization_name_snapshot, self.partner_one.name)
        self.assertEqual(order.service_name_snapshot, self.service_global.name_ar)
        self.assertEqual(order.service_category_name_snapshot, self.category.name_ar)

    def test_platform_admin_can_view_all_organizations(self):
        self.client.force_authenticate(self.platform_admin)

        response = self.client.get("/api/organizations/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue({"partner-one", "partner-two", "provider-org"}.issubset({row["slug"] for row in response.data}))

    def test_branch_manager_sees_only_branch_data(self):
        self.client.force_authenticate(self.branch_manager)

        response = self.client.get("/api/admin/orders/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = {row["id"] for row in response.data}
        self.assertIn(self.order_partner_one_branch_one.id, returned_ids)
        self.assertNotIn(self.order_partner_one_branch_two.id, returned_ids)
        self.assertNotIn(self.order_partner_two.id, returned_ids)
