import hashlib
import re
from datetime import timedelta

from django.core.management import call_command
from django.core import mail
from django.core.cache import cache
from django.contrib.auth.models import Permission
from django.conf import settings
from django.test import override_settings
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import CustomUser, PasswordResetToken
from accounts.password_reset import FORGOT_PASSWORD_RESPONSE_MESSAGE, PASSWORD_RESET_SUCCESS_MESSAGE
from audit.models import AuditLog
from organizations.models import Organization, OrganizationMembership
from orders.models import Order
from public_site.models import Advertisement, PublicPageContent, SiteTheme
from services.models import Service, ServiceCategory


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


class CustomerProfileAdminScopeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.partner_org_a = Organization.objects.create(
            name="Customer Org A",
            slug="customer-org-a",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.partner_org_b = Organization.objects.create(
            name="Customer Org B",
            slug="customer-org-b",
            organization_type=Organization.OrganizationType.PARTNER,
        )
        self.partner_admin = CustomUser.objects.create_user(
            email="customer-profile-admin@example.com",
            password="Password@123",
            full_name="Customer Profile Admin",
            phone="0792000004",
            role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=self.partner_admin,
            organization=self.partner_org_a,
            role=OrganizationMembership.MembershipRole.PARTNER_ADMIN,
        )
        self.customer_a = CustomUser.objects.create_user(
            email="customer-a@example.com",
            password="Password@123",
            full_name="Customer A",
            phone="0792000005",
            role=CustomUser.Role.CUSTOMER,
        )
        self.customer_b = CustomUser.objects.create_user(
            email="customer-b@example.com",
            password="Password@123",
            full_name="Customer B",
            phone="0792000006",
            role=CustomUser.Role.CUSTOMER,
        )
        from accounts.models import CustomerProfile

        self.profile_a = CustomerProfile.objects.create(user=self.customer_a, organization=self.partner_org_a)
        self.profile_b = CustomerProfile.objects.create(user=self.customer_b, organization=self.partner_org_b)
        self.client.force_authenticate(self.partner_admin)

    def test_partner_admin_only_lists_customer_profiles_in_scope(self):
        response = self.client.get("/api/admin/customer-profiles/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        records = response.data if isinstance(response.data, list) else response.data["results"]
        self.assertEqual([record["id"] for record in records], [self.profile_a.pk])

    def test_partner_admin_cannot_retrieve_foreign_customer_profile(self):
        response = self.client.get(f"/api/admin/customer-profiles/{self.profile_b.pk}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AdminUserPaginationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="pagination-admin@example.com",
            password="Password@123",
            full_name="Pagination Admin",
            phone="0792000100",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        CustomUser.objects.create_user(
            email="pagination-employee-1@example.com",
            password="Password@123",
            full_name="Pagination Employee One",
            phone="0792000101",
            role=CustomUser.Role.EMPLOYEE,
        )
        CustomUser.objects.create_user(
            email="pagination-employee-2@example.com",
            password="Password@123",
            full_name="Pagination Employee Two",
            phone="0792000102",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.client.force_authenticate(self.admin)

    def test_admin_user_list_returns_paginated_response(self):
        response = self.client.get("/api/admin/users/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertIn("results", response.data)
        self.assertGreaterEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), response.data["count"])


class PublicAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_then_login_succeeds(self):
        register_response = self.client.post(
            "/api/auth/register/",
            {
                "full_name": "Portal User",
                "phone": "0793000001",
                "email": "portal-user@example.com",
                "password": "Password@123",
                "national_id": "1234567890",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(register_response.data["email"], "portal-user@example.com")

        login_response = self.client.post(
            "/api/auth/login/",
            {
                "email": "portal-user@example.com",
                "password": "Password@123",
            },
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)
        self.assertEqual(login_response.data["user"]["email"], "portal-user@example.com")


class SeedCommandTests(TestCase):
    def test_baseline_seed_does_not_create_public_demo_users(self):
        call_command("seed_initial_data")

        self.assertGreater(ServiceCategory.objects.count(), 0)
        self.assertGreater(Service.objects.count(), 0)
        self.assertFalse(CustomUser.objects.filter(email="admin@khalisni.local").exists())
        self.assertEqual(Order.objects.count(), 0)

    def test_seed_demo_creates_demo_users_orders_and_public_site_content(self):
        call_command("seed_demo")

        self.assertTrue(CustomUser.objects.filter(email="admin@khalisni.local").exists())
        self.assertTrue(CustomUser.objects.filter(email="customer@khalisni.local").exists())
        self.assertTrue(CustomUser.objects.filter(email="employee@khalisni.local").exists())
        self.assertTrue(CustomUser.objects.filter(email="provider@khalisni.local").exists())
        self.assertGreater(Order.objects.count(), 0)
        self.assertGreater(SiteTheme.objects.count(), 0)
        self.assertGreater(PublicPageContent.objects.count(), 0)
        self.assertGreater(Advertisement.objects.count(), 0)

    def test_seed_demo_does_not_reset_existing_passwords_without_flag(self):
        call_command("seed_demo")
        admin_user = CustomUser.objects.get(email="admin@khalisni.local")
        admin_user.set_password("ChangedPassword@123")
        admin_user.save()

        call_command("seed_demo")

        admin_user.refresh_from_db()
        self.assertTrue(admin_user.check_password("ChangedPassword@123"))
        self.assertFalse(admin_user.check_password("Admin@123"))

    def test_seed_demo_can_reset_existing_passwords_when_requested(self):
        call_command("seed_demo")
        admin_user = CustomUser.objects.get(email="admin@khalisni.local")
        admin_user.set_password("ChangedPassword@123")
        admin_user.save()

        call_command("seed_demo", reset_passwords=True)

        admin_user.refresh_from_db()
        self.assertTrue(admin_user.check_password("Admin@123"))


@override_settings(
    FRONTEND_BASE_URL="https://portal.example.com",
    PASSWORD_RESET_RATE_LIMIT_EMAIL=2,
    PASSWORD_RESET_RATE_LIMIT_IP=2,
    PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS=1800,
)
class PasswordResetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = CustomUser.objects.create_user(
            email="reset-customer@example.com",
            password="Password@123",
            full_name="Reset Customer",
            phone="0794000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="reset-admin@example.com",
            password="Password@123",
            full_name="Reset Admin",
            phone="0794000002",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        cache.clear()
        if hasattr(mail, "outbox"):
            mail.outbox.clear()

    def _extract_token_from_email(self, email_body):
        match = re.search(r"/reset-password/([^/\s]+)", email_body)
        self.assertIsNotNone(match)
        return match.group(1)

    def test_forgot_password_returns_same_message_and_stores_only_token_hash(self):
        response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.customer.email},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], FORGOT_PASSWORD_RESPONSE_MESSAGE)
        self.assertEqual(len(mail.outbox), 1)

        token_record = PasswordResetToken.objects.get(user=self.customer)
        raw_token = self._extract_token_from_email(mail.outbox[0].body)
        self.assertNotEqual(token_record.token_hash, raw_token)
        self.assertEqual(len(token_record.token_hash), 64)
        self.assertIsNone(token_record.used_at)
        self.assertGreater(token_record.expires_at, timezone.now())
        self.assertEqual(token_record.request_ip, "127.0.0.1")
        self.assertTrue(
            AuditLog.objects.filter(action="password_reset_request", entity_type="PasswordResetRequest").exists()
        )

    def test_forgot_password_for_unknown_or_non_customer_email_keeps_response_generic(self):
        unknown_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": "missing@example.com"},
            format="json",
        )
        admin_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.admin.email},
            format="json",
        )

        self.assertEqual(unknown_response.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown_response.data["detail"], FORGOT_PASSWORD_RESPONSE_MESSAGE)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_response.data["detail"], FORGOT_PASSWORD_RESPONSE_MESSAGE)
        self.assertEqual(PasswordResetToken.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 0)

    def test_forgot_password_is_rate_limited_by_email_and_ip(self):
        for _ in range(3):
            response = self.client.post(
                "/api/auth/forgot-password/",
                {"email": self.customer.email},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["detail"], FORGOT_PASSWORD_RESPONSE_MESSAGE)

        self.assertEqual(PasswordResetToken.objects.count(), 2)
        self.assertEqual(len(mail.outbox), 2)
        last_audit = AuditLog.objects.filter(action="password_reset_request").latest("created_at")
        self.assertEqual(last_audit.new_values["rate_limited"], True)

    def test_reset_password_is_single_use_invalidates_other_tokens_and_sends_notification(self):
        first_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.customer.email},
            format="json",
        )
        second_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.customer.email},
            format="json",
        )
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)

        first_token = self._extract_token_from_email(mail.outbox[0].body)
        first_record = PasswordResetToken.objects.order_by("created_at").first()
        second_record = PasswordResetToken.objects.order_by("created_at").last()

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                f"/api/auth/reset-password/{first_token}/",
                {
                    "new_password": "NewPassword@123",
                    "confirm_new_password": "NewPassword@123",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], PASSWORD_RESET_SUCCESS_MESSAGE)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)

        self.customer.refresh_from_db()
        first_record.refresh_from_db()
        second_record.refresh_from_db()
        self.assertTrue(self.customer.check_password("NewPassword@123"))
        self.assertFalse(self.customer.check_password("Password@123"))
        self.assertIsNotNone(first_record.used_at)
        self.assertIsNotNone(second_record.used_at)
        self.assertEqual(len(mail.outbox), 3)
        self.assertIn("password was changed successfully", mail.outbox[2].body)
        self.assertNotIn("NewPassword@123", mail.outbox[2].body)
        self.assertTrue(AuditLog.objects.filter(action="password_reset_success", entity_id=str(self.customer.pk)).exists())

        reused_response = self.client.post(
            f"/api/auth/reset-password/{first_token}/",
            {
                "new_password": "AnotherPassword@123",
                "confirm_new_password": "AnotherPassword@123",
            },
            format="json",
        )
        self.assertEqual(reused_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", reused_response.data["detail"])

    def test_reset_password_rejects_expired_token(self):
        raw_token = "expired-token"
        PasswordResetToken.objects.create(
            user=self.customer,
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            expires_at=timezone.now() - timedelta(minutes=1),
            request_ip="127.0.0.1",
        )

        response = self.client.post(
            f"/api/auth/reset-password/{raw_token}/",
            {
                "new_password": "NewPassword@123",
                "confirm_new_password": "NewPassword@123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalid or has expired", response.data["detail"])
        self.customer.refresh_from_db()
        self.assertTrue(self.customer.check_password("Password@123"))


@override_settings(
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "auth_password_reset": "1/minute",
        },
    }
)
class ForgotPasswordThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self._original_throttle_rates = dict(ScopedRateThrottle.THROTTLE_RATES)
        ScopedRateThrottle.THROTTLE_RATES = {
            **ScopedRateThrottle.THROTTLE_RATES,
            "auth_password_reset": "1/minute",
        }
        self.client = APIClient()
        self.customer = CustomUser.objects.create_user(
            email="throttle-reset@example.com",
            password="Password@123",
            full_name="Throttle Reset Customer",
            phone="0794000101",
            role=CustomUser.Role.CUSTOMER,
        )

    def tearDown(self):
        ScopedRateThrottle.THROTTLE_RATES = self._original_throttle_rates
        cache.clear()
        super().tearDown()

    def test_forgot_password_endpoint_is_rate_limited(self):
        first_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.customer.email},
            format="json",
        )
        second_response = self.client.post(
            "/api/auth/forgot-password/",
            {"email": self.customer.email},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
