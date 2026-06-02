from django.contrib.auth.models import Permission
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from help_guides.models import HelpGuide


class HelpGuideApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="help-admin@example.com",
            password="Password@123",
            full_name="Help Admin",
            phone="0795100001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.customer = CustomUser.objects.create_user(
            email="help-customer@example.com",
            password="Password@123",
            full_name="Help Customer",
            phone="0795100002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.employee = CustomUser.objects.create_user(
            email="help-employee@example.com",
            password="Password@123",
            full_name="Help Employee",
            phone="0795100003",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.support = CustomUser.objects.create_user(
            email="help-support@example.com",
            password="Password@123",
            full_name="Help Support",
            phone="0795100004",
            role=CustomUser.Role.SUPPORT,
        )
        self.provider = CustomUser.objects.create_user(
            email="help-provider@example.com",
            password="Password@123",
            full_name="Help Provider",
            phone="0795100005",
            role=CustomUser.Role.PROVIDER,
        )

        review_permission = Permission.objects.get(content_type__app_label="orders", codename="review_order")
        verify_permission = Permission.objects.get(content_type__app_label="documents", codename="verify_document")
        self.employee.user_permissions.add(review_permission, verify_permission)
        self.support.user_permissions.add(review_permission)

    def _create_guide(self, **overrides):
        payload = {
            "screen_key": "test_customer_orders",
            "route_path": "/test/customer/orders",
            "role": "customer",
            "permission_key": "",
            "workflow_status": "",
            "title": "Customer Orders Guide",
            "short_description": "Quick help",
            "purpose": "Purpose",
            "before_you_start": "Before you start",
            "step_by_step_guide": "1. Step one\n2. Step two",
            "expected_result": "Expected result",
            "common_errors": "Common error",
            "related_screen": "",
            "related_permission": "",
            "search_keywords": "orders customer",
            "display_order": 0,
            "is_active": True,
        }
        payload.update(overrides)
        return HelpGuide.objects.create(**payload)

    def test_user_only_receives_help_for_their_role(self):
        self._create_guide(screen_key="test_role_screen", route_path="/test/role", role="customer", title="Customer guide")
        self._create_guide(screen_key="test_role_screen", route_path="/test/role", role="employee", title="Employee guide")

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/help/current/?screen_key=test_role_screen")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data["results"]], ["Customer guide"])

    def test_admin_can_create_edit_and_deactivate_help_guide(self):
        self.client.force_authenticate(self.admin)

        create_response = self.client.post(
            "/api/help/",
            {
                "screen_key": "admin_help_guides",
                "route_path": "/admin/help-guides",
                "role": "admin",
                "permission_key": "help_guides.manage_help_guides",
                "workflow_status": "",
                "title": "Manage help content",
                "short_description": "Admin content",
                "purpose": "Control help entries",
                "before_you_start": "Confirm the target screen.",
                "step_by_step_guide": "1. Create entry\n2. Save entry",
                "expected_result": "The guide is visible to admins.",
                "common_errors": "Wrong role selected",
                "related_screen": "admin_users_roles",
                "related_permission": "help_guides.manage_help_guides",
                "search_keywords": "admin help",
                "display_order": 7,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        guide_id = create_response.data["id"]

        update_response = self.client.patch(
            f"/api/help/{guide_id}/",
            {"title": "Updated admin help", "display_order": 9},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        delete_response = self.client.delete(f"/api/help/{guide_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        guide = HelpGuide.objects.get(pk=guide_id)
        self.assertFalse(guide.is_active)
        self.assertEqual(guide.title, "Updated admin help")

    def test_inactive_help_is_hidden_from_normal_users(self):
        self._create_guide(screen_key="test_inactive_screen", route_path="/test/inactive", role="customer", title="Active guide", is_active=True)
        self._create_guide(screen_key="test_inactive_screen", route_path="/test/inactive", role="customer", title="Inactive guide", is_active=False)

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/help/?screen_key=test_inactive_screen")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data], ["Active guide"])

    def test_current_help_uses_fallback_priority(self):
        self._create_guide(
            screen_key="test_employee_order_review",
            route_path="/test/employee/orders/:id",
            role="employee",
            permission_key="orders.review_order",
            workflow_status="WAITING_CUSTOMER",
            title="Waiting customer guide",
        )
        self._create_guide(
            screen_key="test_employee_order_review",
            route_path="/test/employee/orders/:id",
            role="employee",
            title="Generic employee review guide",
            display_order=2,
        )

        self.client.force_authenticate(self.employee)
        exact_response = self.client.get("/api/help/current/?screen_key=test_employee_order_review&workflow_status=WAITING_CUSTOMER")
        generic_response = self.client.get("/api/help/current/?screen_key=test_employee_order_review&workflow_status=NEW")

        self.assertEqual(exact_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in exact_response.data["results"]], ["Waiting customer guide"])
        self.assertEqual([item["title"] for item in generic_response.data["results"]], ["Generic employee review guide"])

    def test_permission_filtering_hides_guides_without_required_permission(self):
        self._create_guide(
            screen_key="test_employee_verify_documents",
            route_path="/test/employee/documents/verify",
            role="employee",
            permission_key="services.manage_service_prices",
            title="Verify documents guide",
        )
        self._create_guide(
            screen_key="test_employee_verify_documents",
            route_path="/test/employee/documents/verify",
            role="employee",
            title="Generic verification guide",
            display_order=2,
        )

        self.client.force_authenticate(self.support)
        response = self.client.get("/api/help/current/?screen_key=test_employee_verify_documents")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data["results"]], ["Generic verification guide"])

    def test_screen_key_filtering_works_for_admin_list(self):
        self._create_guide(screen_key="test_orders_screen", route_path="/test/orders", title="Orders guide")
        self._create_guide(screen_key="test_dashboard_screen", route_path="/test/dashboard", title="Dashboard guide")

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/help/?screen_key=test_dashboard_screen")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data], ["Dashboard guide"])
