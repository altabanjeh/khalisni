from django.contrib.auth.models import Permission
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import CustomUser


class RoleGroupSyncTests(TestCase):
    def test_users_are_synced_to_role_groups_with_permissions(self):
        customer = CustomUser.objects.create_user(
            email="customer-role@example.com",
            password="Password@123",
            full_name="Customer Role",
            phone="0791000001",
            role=CustomUser.Role.CUSTOMER,
        )
        employee = CustomUser.objects.create_user(
            email="employee-role@example.com",
            password="Password@123",
            full_name="Employee Role",
            phone="0791000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        provider = CustomUser.objects.create_user(
            email="provider-role@example.com",
            password="Password@123",
            full_name="Provider Role",
            phone="0791000003",
            role=CustomUser.Role.PROVIDER,
        )
        admin = CustomUser.objects.create_user(
            email="admin-role@example.com",
            password="Password@123",
            full_name="Admin Role",
            phone="0791000004",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )

        self.assertEqual(customer.groups.values_list("name", flat=True).get(), "client")
        self.assertEqual(employee.groups.values_list("name", flat=True).get(), "employee")
        self.assertEqual(provider.groups.values_list("name", flat=True).get(), "provider")
        self.assertEqual(admin.groups.values_list("name", flat=True).get(), "admin")

        self.assertTrue(employee.has_perm("orders.review_order"))
        self.assertTrue(employee.has_perm("documents.verify_document"))
        self.assertTrue(provider.has_perm("documents.upload_final_document"))
        self.assertTrue(admin.has_perm("services.manage_service_prices"))

    def test_me_endpoint_returns_role_permissions(self):
        client = APIClient()
        employee = CustomUser.objects.create_user(
            email="employee-perms@example.com",
            password="Password@123",
            full_name="Employee Permissions",
            phone="0791000005",
            role=CustomUser.Role.EMPLOYEE,
        )

        client.force_authenticate(employee)
        response = client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], CustomUser.Role.EMPLOYEE)
        self.assertIn("permissions", response.data)
        self.assertIn("orders.review_order", response.data["permissions"])

    def test_normal_admin_cannot_create_admin_level_user(self):
        client = APIClient()
        admin = CustomUser.objects.create_user(
            email="normal-admin@example.com",
            password="Password@123",
            full_name="Normal Admin",
            phone="0791000006",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        client.force_authenticate(admin)

        response = client.post(
            "/api/admin/users/",
            {
                "full_name": "Second Admin",
                "email": "second-admin@example.com",
                "phone": "0791000007",
                "password": "Password@123",
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_super_admin_can_create_admin_level_user(self):
        client = APIClient()
        super_admin = CustomUser.objects.create_superuser(
            email="super-admin@example.com",
            password="Password@123",
            full_name="Super Admin",
        )
        client.force_authenticate(super_admin)

        response = client.post(
            "/api/admin/users/",
            {
                "full_name": "Second Admin",
                "email": "second-admin@example.com",
                "phone": "0791000008",
                "password": "Password@123",
                "role": "admin",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_cannot_create_customer_user_manually(self):
        client = APIClient()
        admin = CustomUser.objects.create_user(
            email="ops-admin@example.com",
            password="Password@123",
            full_name="Ops Admin",
            phone="0791000010",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        client.force_authenticate(admin)

        response = client.post(
            "/api/admin/users/",
            {
                "full_name": "Manual Customer",
                "email": "manual-customer@example.com",
                "phone": "0791000011",
                "password": "Password@123",
                "role": "customer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_super_admin_cannot_create_customer_user_manually(self):
        client = APIClient()
        super_admin = CustomUser.objects.create_superuser(
            email="super-admin-customer@example.com",
            password="Password@123",
            full_name="Super Admin Customer",
        )
        client.force_authenticate(super_admin)

        response = client.post(
            "/api/admin/users/",
            {
                "full_name": "Manual Customer",
                "email": "manual-customer-2@example.com",
                "phone": "0791000012",
                "password": "Password@123",
                "role": "customer",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_admin_cannot_convert_existing_employee_into_customer(self):
        client = APIClient()
        admin = CustomUser.objects.create_user(
            email="ops-admin-2@example.com",
            password="Password@123",
            full_name="Ops Admin 2",
            phone="0791000013",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        employee = CustomUser.objects.create_user(
            email="ops-employee@example.com",
            password="Password@123",
            full_name="Ops Employee",
            phone="0791000014",
            role=CustomUser.Role.EMPLOYEE,
        )
        client.force_authenticate(admin)

        response = client.patch(
            f"/api/admin/users/{employee.pk}/",
            {"role": "customer"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_system_settings_reject_unknown_key(self):
        client = APIClient()
        admin = CustomUser.objects.create_user(
            email="settings-admin@example.com",
            password="Password@123",
            full_name="Settings Admin",
            phone="0791000009",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        client.force_authenticate(admin)

        response = client.post(
            "/api/admin/system-settings/",
            {
                "key": "dangerous.raw_json",
                "description": "Unsafe",
                "hero_title": "Ignored",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserPermissionManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="perm-mgr-admin@example.com",
            password="Password@123",
            full_name="Perm Manager Admin",
            phone="0792000001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.target = CustomUser.objects.create_user(
            email="perm-mgr-target@example.com",
            password="Password@123",
            full_name="Perm Target Employee",
            phone="0792000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.client.force_authenticate(self.admin)

    def test_available_permissions_returns_grouped_dict(self):
        response = self.client.get("/api/admin/available-permissions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)
        self.assertTrue(len(response.data) > 0)
        for app_label, perms in response.data.items():
            self.assertIsInstance(perms, list)
            self.assertTrue(len(perms) > 0)
            first = perms[0]
            self.assertIn("codename", first)
            self.assertIn("full_codename", first)
            self.assertIn("name", first)
            self.assertEqual(first["full_codename"], f"{app_label}.{first['codename']}")

    def test_available_permissions_requires_admin_role(self):
        employee = CustomUser.objects.create_user(
            email="perm-employee@example.com",
            password="Password@123",
            full_name="Non Admin",
            phone="0792000003",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.client.force_authenticate(employee)
        response = self.client.get("/api/admin/available-permissions/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_user_permissions_returns_direct_permissions_only(self):
        perm = Permission.objects.get(content_type__app_label="orders", codename="review_order")
        self.target.user_permissions.add(perm)

        response = self.client.get(f"/api/admin/users/{self.target.pk}/permissions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("permissions", response.data)
        self.assertIn("orders.review_order", response.data["permissions"])

    def test_patch_user_permissions_sets_direct_permissions(self):
        response = self.client.patch(
            f"/api/admin/users/{self.target.pk}/permissions/",
            {"permissions": ["orders.review_order", "documents.verify_document"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned = set(response.data["permissions"])
        self.assertIn("orders.review_order", returned)
        self.assertIn("documents.verify_document", returned)

        self.target.refresh_from_db()
        direct_perms = set(
            f"{app}.{code}"
            for app, code in self.target.user_permissions.values_list(
                "content_type__app_label", "codename"
            )
        )
        self.assertIn("orders.review_order", direct_perms)
        self.assertIn("documents.verify_document", direct_perms)

    def test_patch_user_permissions_replaces_existing_permissions(self):
        perm = Permission.objects.get(content_type__app_label="orders", codename="review_order")
        self.target.user_permissions.add(perm)

        response = self.client.patch(
            f"/api/admin/users/{self.target.pk}/permissions/",
            {"permissions": ["documents.verify_document"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        direct_perms = set(
            f"{app}.{code}"
            for app, code in self.target.user_permissions.values_list(
                "content_type__app_label", "codename"
            )
        )
        self.assertNotIn("orders.review_order", direct_perms)
        self.assertIn("documents.verify_document", direct_perms)

    def test_patch_user_permissions_rejects_unknown_codename(self):
        response = self.client.patch(
            f"/api/admin/users/{self.target.pk}/permissions/",
            {"permissions": ["orders.nonexistent_permission"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_user_permissions_clears_all_when_empty_list(self):
        perm = Permission.objects.get(content_type__app_label="orders", codename="review_order")
        self.target.user_permissions.add(perm)

        response = self.client.patch(
            f"/api/admin/users/{self.target.pk}/permissions/",
            {"permissions": []},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["permissions"], [])
        self.target.refresh_from_db()
        direct_count = self.target.user_permissions.filter(
            content_type__app_label__in=["orders", "documents"]
        ).count()
        self.assertEqual(direct_count, 0)

    def test_admin_user_serializer_exposes_current_permissions(self):
        perm = Permission.objects.get(content_type__app_label="orders", codename="review_order")
        self.target.user_permissions.add(perm)

        response = self.client.get(f"/api/admin/users/{self.target.pk}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("current_permissions", response.data)
        self.assertIn("orders.review_order", response.data["current_permissions"])
