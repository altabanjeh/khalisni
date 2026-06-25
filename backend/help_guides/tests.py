from django.contrib.auth.models import Permission
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from help_guides.models import HelpGuide, HelpGuideAction, HelpGuideField, HelpGuideScreenshot
from services.models import Service, ServiceCategory


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
        self.category = ServiceCategory.objects.create(
            name_ar="وثائق",
            name_en="Documents",
            slug="documents",
        )
        self.service = Service.objects.create(
            category=self.category,
            name_ar="خدمة اختبار",
            name_en="Test Service",
            slug="test-service",
            description_ar="وصف خدمة اختبار",
            required_information_schema=[
                {"key": "passport_number", "label": "Passport number", "required": True},
            ],
        )

    def _create_guide(self, **overrides):
        next_index = HelpGuide.objects.count() + 1
        payload = {
            "slug": f"customer-orders-guide-{next_index}",
            "screen_key": "test_customer_orders",
            "route_path": "/test/customer/orders",
            "category": "customer",
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
            "troubleshooting": "Troubleshooting note",
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
                "slug": "manage-help-content",
                "category": "settings",
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
                "troubleshooting": "Check the target role again.",
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

        delete_response = self.client.delete(
            f"/api/help/{guide_id}/",
            {"delete_password": "Password@123"},
            format="json",
        )
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

    def test_field_action_and_workflow_help_endpoints_return_contextual_rows(self):
        HelpGuideField.objects.create(
            screen_key="customer_create_order",
            field_key="full_name",
            field_label="Full name",
            role="customer",
            purpose="Customer full name",
            required=True,
        )
        HelpGuideAction.objects.create(
            screen_key="employee_order_review",
            button_key="request_missing_documents",
            button_label="Request missing documents",
            role="employee",
            permission_key="orders.request_missing_documents",
            purpose="Ask the customer for missing files",
        )
        self.employee.user_permissions.add(
            Permission.objects.get(content_type__app_label="orders", codename="request_missing_documents")
        )

        self.client.force_authenticate(self.employee)
        fields_response = self.client.get("/api/help/fields/?screen_key=customer_create_order")
        actions_response = self.client.get("/api/help/actions/?screen_key=employee_order_review&workflow_status=UNDER_REVIEW")
        workflows_response = self.client.get("/api/help/workflows/?screen_key=employee_order_review&status=UNDER_REVIEW")

        self.assertEqual(fields_response.status_code, status.HTTP_200_OK)
        self.assertEqual(actions_response.status_code, status.HTTP_200_OK)
        self.assertEqual(workflows_response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["field_key"] == "full_name" for item in fields_response.data))
        self.assertTrue(any(item["button_key"] == "request_missing_documents" for item in actions_response.data))
        self.assertTrue(any(item["current_status"] == "UNDER_REVIEW" for item in workflows_response.data))

    def test_service_help_returns_generated_fallback(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get(f"/api/help/services/{self.service.pk}/?screen_key=customer_create_order")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["service_id"], self.service.pk)
        self.assertEqual(response.data["service_name"], self.service.name_ar)
        self.assertEqual(response.data["source"], "registry")
        self.assertTrue(response.data["required_data"])

    def test_search_respects_user_role_for_structured_results(self):
        HelpGuideAction.objects.create(
            screen_key="employee_order_review",
            button_key="employee_secret_action",
            button_label="Employee only action",
            role="employee",
            purpose="Hidden from customers",
            search_keywords="private employee action",
        )

        self.client.force_authenticate(self.customer)
        customer_response = self.client.get("/api/help/search/?q=private employee action")
        self.client.force_authenticate(self.employee)
        employee_response = self.client.get("/api/help/search/?q=private employee action")

        self.assertEqual(customer_response.status_code, status.HTTP_200_OK)
        self.assertEqual(employee_response.status_code, status.HTTP_200_OK)
        self.assertEqual(customer_response.data["actions"], [])
        self.assertEqual(len(employee_response.data["actions"]), 1)

    def test_normal_user_cannot_access_admin_help_endpoints(self):
        self.client.force_authenticate(self.customer)

        list_response = self.client.get("/api/help/admin/fields/")
        create_response = self.client.post(
            "/api/help/admin/actions/",
            {
                "screen_key": "customer_orders",
                "button_key": "x",
                "button_label": "X",
                "role": "customer",
            },
            format="json",
        )

        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_preview_role_filters_current_help(self):
        self._create_guide(screen_key="preview_screen", route_path="/preview", role="customer", title="Customer preview guide")
        self._create_guide(screen_key="preview_screen", route_path="/preview", role="employee", title="Employee preview guide")

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/help/current/?screen_key=preview_screen&preview_role=customer")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["title"] for item in response.data["screen_guides"]], ["Customer preview guide"])
        self.assertEqual(response.data["preview_role"], "customer")

    def test_inactive_field_help_is_hidden(self):
        HelpGuideField.objects.create(
            screen_key="customer_create_order",
            field_key="active_field",
            field_label="Active field",
            role="customer",
            is_active=True,
        )
        HelpGuideField.objects.create(
            screen_key="customer_create_order",
            field_key="inactive_field",
            field_label="Inactive field",
            role="customer",
            is_active=False,
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/help/fields/?screen_key=customer_create_order")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["field_key"] == "active_field" for item in response.data))
        self.assertFalse(any(item["field_key"] == "inactive_field" for item in response.data))

    def test_manual_index_returns_category_filtered_guides_and_quick_links(self):
        customer_guide = self._create_guide(
            slug="customer-create-order-guide",
            screen_key="customer_create_order",
            category="customer",
            title="Create order guide",
            is_quick_link=True,
        )
        self._create_guide(
            slug="employee-review-guide",
            screen_key="employee_order_review",
            category="employee",
            role="employee",
            title="Employee review guide",
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/help/index/?category=customer")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item["slug"] == customer_guide.slug for item in response.data["guides"]))
        self.assertTrue(any(item["slug"] == customer_guide.slug for item in response.data["quick_links"]))
        self.assertTrue(all(item["category"] == "customer" for item in response.data["guides"]))
        self.assertTrue(response.data["categories"])

    def test_current_help_includes_placeholder_screenshot_payload(self):
        guide = self._create_guide(screen_key="customer_orders", slug="customer-orders-with-shot")
        HelpGuideScreenshot.objects.create(
            help_guide=guide,
            caption="Customer orders placeholder",
            placeholder_label="Screenshot required: Customer orders",
            alt_text="Customer orders",
            step_reference="overview",
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/help/current/?screen_key=customer_orders")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        screenshots = response.data["screen_guides"][0]["screenshots"]
        self.assertEqual(len(screenshots), 1)
        self.assertTrue(screenshots[0]["is_placeholder"])
        self.assertEqual(screenshots[0]["placeholder_label"], "Screenshot required: Customer orders")

    def test_metadata_endpoint_is_available_to_authenticated_users(self):
        self.client.force_authenticate(self.customer)

        response = self.client.get("/api/help/metadata/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("categories", response.data)
        self.assertFalse(response.data["can_manage_help_guides"])
