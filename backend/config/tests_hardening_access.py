"""Hardening regression suite: privilege, tenant and session boundaries.

Finding IDs refer to docs/hardening/KHALSNI_FINDINGS.csv.
"""

from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import CustomUser
from config.tests_hardening import HardeningBase
from notifications.models import Notification
from organizations.models import Branch, Organization, OrganizationMembership
from organizations.selectors import is_platform_super_admin
from services.models import Service


class TenantBase(HardeningBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.partner_a = Organization.objects.create(
            name="Partner A", slug="partner-a", organization_type=Organization.OrganizationType.PARTNER,
        )
        cls.partner_b = Organization.objects.create(
            name="Partner B", slug="partner-b", organization_type=Organization.OrganizationType.PARTNER,
        )
        cls.partner_admin = CustomUser.objects.create_user(
            email="adv-partner-admin@example.com", password="Password@123", full_name="Partner Admin",
            phone="0795550001", role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=cls.partner_admin, organization=cls.partner_a,
            role=OrganizationMembership.MembershipRole.PARTNER_ADMIN,
        )
        cls.b_employee = CustomUser.objects.create_user(
            email="adv-b-employee@example.com", password="Password@123", full_name="B Employee",
            phone="0795550002", role=CustomUser.Role.EMPLOYEE,
        )
        cls.b_membership = OrganizationMembership.objects.create(
            user=cls.b_employee, organization=cls.partner_b,
            role=OrganizationMembership.MembershipRole.PARTNER_EMPLOYEE,
        )


class PlatformRoleEscalationTests(TenantBase):
    """KHS-011: a partner administrator cannot become a platform administrator."""

    def _assert_not_escalated(self, user=None):
        user = CustomUser.objects.get(pk=(user or self.partner_admin).pk)
        self.assertFalse(is_platform_super_admin(user))
        self._as(user)
        self.assertIn(self.client.get("/api/admin/audit-logs/").status_code, (403, 404))

    def test_membership_endpoint_refuses_platform_role(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/organization-memberships/",
            {"user": self.partner_admin.pk, "organization": self.partner_a.pk, "role": "platform_super_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self._assert_not_escalated()

    def test_membership_endpoint_refuses_foreign_organization(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/organization-memberships/",
            {"user": self.partner_admin.pk, "organization": self.partner_b.pk, "role": "partner_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(
            OrganizationMembership.objects.filter(user=self.partner_admin, organization=self.partner_b).exists()
        )

    def test_admin_user_endpoint_refuses_platform_role(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/admin/users/",
            {"email": "new-esc@example.com", "password": "Str0ng!Passw0rd", "full_name": "Esc", "phone": "0795550009",
             "role": "employee", "organization_id": self.partner_a.pk, "membership_role": "platform_super_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(CustomUser.objects.filter(email="new-esc@example.com").exists())
        r = self.client.patch(
            f"/api/admin/users/{self.partner_admin.pk}/",
            {"organization_id": self.partner_a.pk, "membership_role": "platform_super_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self._assert_not_escalated()

    def test_admin_user_endpoint_refuses_foreign_organization(self):
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/admin/users/{self.partner_admin.pk}/",
            {"organization_id": self.partner_b.pk, "membership_role": "partner_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(
            OrganizationMembership.objects.filter(user=self.partner_admin, organization=self.partner_b).exists()
        )

    def test_platform_role_on_non_platform_organization_is_inert_and_unstorable(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            OrganizationMembership.objects.create(
                user=self.b_employee, organization=self.partner_b,
                role=OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN,
            )
        # A row that predates the guard must not grant anything either.
        OrganizationMembership.objects.bulk_create([
            OrganizationMembership(
                user=self.b_employee, organization=self.partner_b,
                role=OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN,
            )
        ])
        self._assert_not_escalated(self.b_employee)

    def test_partner_admin_cannot_grant_permissions(self):
        self._as(self.partner_admin)
        for target in (self.partner_admin,):
            r = self.client.patch(
                f"/api/admin/users/{target.pk}/permissions/",
                {"permissions": ["payment.refund_payment", "accounts.manage_user_roles", "auth.add_permission"]},
                format="json",
            )
            self.assertIn(r.status_code, (400, 403), r.data)
        self.assertEqual(CustomUser.objects.get(pk=self.partner_admin.pk).user_permissions.count(), 0)

    def test_super_admin_cannot_grant_permissions_outside_the_allowlist(self):
        self._as(self.admin)
        r = self.client.patch(
            f"/api/admin/users/{self.employee.pk}/permissions/", {"permissions": ["auth.add_permission"]}, format="json"
        )
        self.assertEqual(r.status_code, 400, r.data)
        r = self.client.patch(
            f"/api/admin/users/{self.employee.pk}/permissions/", {"permissions": ["orders.review_order"]}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)


class RestoreScopeTests(TenantBase):
    """KHS-012: restore actions honour the same scope as every other action."""

    def test_partner_admin_cannot_restore_foreign_or_unknown_records(self):
        self.b_employee.soft_delete(user=self.admin)
        self.b_membership.soft_delete(user=self.admin)
        branch = Branch.objects.create(organization=self.partner_b, name="B branch")
        branch.soft_delete(user=self.admin)
        self._as(self.partner_admin)
        for path in (
            f"/api/admin/users/{self.b_employee.pk}/restore/",
            f"/api/organization-memberships/{self.b_membership.pk}/restore/",
            f"/api/branches/{branch.pk}/restore/",
            f"/api/organizations/{self.partner_b.pk}/restore/",
            "/api/admin/users/99999999/restore/",
            "/api/branches/99999999/restore/",
        ):
            self.assertIn(self.client.post(path).status_code, (403, 404), path)
        self.b_employee.refresh_from_db()
        self.assertTrue(self.b_employee.is_deleted)
        self.assertFalse(self.b_employee.is_active)
        branch.refresh_from_db()
        self.assertTrue(branch.is_deleted)

    def test_super_admin_can_still_restore(self):
        self.b_employee.soft_delete(user=self.admin)
        self._as(self.admin)
        self.assertEqual(self.client.post(f"/api/admin/users/{self.b_employee.pk}/restore/").status_code, 200)
        self.b_employee.refresh_from_db()
        self.assertFalse(self.b_employee.is_deleted)


class DeleteGuardBypassTests(TenantBase):
    """KHS-013: soft-delete state is changed only through the guarded delete action."""

    def test_patch_cannot_soft_delete(self):
        self._as(self.admin)
        cases = (
            (f"/api/admin/users/{self.employee.pk}/", CustomUser, self.employee.pk),
            (f"/api/admin/services/{self.simple.pk}/", Service, self.simple.pk),
            (f"/api/organizations/{self.partner_b.pk}/", Organization, self.partner_b.pk),
        )
        for path, model, pk in cases:
            r = self.client.patch(path, {"is_deleted": True, "delete_reason": "bypass"}, format="json")
            self.assertIn(r.status_code, (200, 400), (path, r.data))
            self.assertFalse(model.all_objects.get(pk=pk).is_deleted if hasattr(model, "all_objects") else model.objects.get(pk=pk).is_deleted, path)


class SessionRevocationTests(TenantBase):
    """KHS-014: replacing a password ends the sessions opened with the old one."""

    def _login(self, email, password):
        client = APIClient()
        r = client.post("/api/auth/login/", {"email": email, "password": password}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return r.data

    def test_admin_password_change_revokes_existing_tokens(self):
        tokens = self._login(self.employee.email, "Password@123")
        stale = APIClient()
        stale.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(stale.get("/api/auth/me/").status_code, 200)
        self._as(self.admin)
        r = self.client.patch(f"/api/admin/users/{self.employee.pk}/", {"password": "N3w!Passw0rd#2026"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(stale.get("/api/auth/me/").status_code, 401)
        r = APIClient().post("/api/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        if r.status_code == 200:
            fresh = APIClient()
            fresh.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
            self.assertEqual(fresh.get("/api/auth/me/").status_code, 401)

    def test_deactivated_user_loses_access_immediately(self):
        tokens = self._login(self.employee.email, "Password@123")
        stale = APIClient()
        stale.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        CustomUser.objects.filter(pk=self.employee.pk).update(is_active=False)
        self.assertEqual(stale.get("/api/auth/me/").status_code, 401)
        r = APIClient().post("/api/auth/login/", {"email": self.employee.email, "password": "Password@123"}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_role_change_applies_to_existing_session(self):
        tokens = self._login(self.employee.email, "Password@123")
        stale = APIClient()
        stale.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.assertEqual(stale.get("/api/admin/orders/").status_code, 200)
        self._as(self.admin)
        r = self.client.patch(f"/api/admin/users/{self.employee.pk}/", {"role": "provider"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn(stale.get("/api/admin/orders/").status_code, (403, 404))

    def test_logout_blocks_refresh_token_reuse(self):
        tokens = self._login(self.customer.email, "Password@123")
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        r = client.post("/api/auth/logout/", {"refresh": tokens["refresh"]}, format="json")
        self.assertIn(r.status_code, (200, 204, 205), r.data)
        r = APIClient().post("/api/auth/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(r.status_code, 401)

    def test_protected_endpoints_reject_anonymous(self):
        self._as(None)
        for path in ("/api/customer/orders/", "/api/admin/orders/", "/api/provider/orders/", "/api/notifications/",
                     "/api/auth/me/", "/api/staff/documents/"):
            self.assertEqual(self.client.get(path).status_code, 401, path)


class RegistrationAndLoginTests(TenantBase):
    def test_registration_applies_password_policy(self):
        self._as(None)
        for password in ("12345678", "password"):
            r = self.client.post(
                "/api/auth/register/",
                {"email": "weak@example.com", "password": password, "full_name": "Weak", "phone": "0796660001"},
                format="json",
            )
            self.assertEqual(r.status_code, 400, password)
        self.assertFalse(CustomUser.objects.filter(email="weak@example.com").exists())

    def test_registration_cannot_set_privileged_fields(self):
        self._as(None)
        r = self.client.post(
            "/api/auth/register/",
            {"email": "priv@example.com", "password": "Str0ng!Passw0rd", "full_name": "Priv", "phone": "0796660002",
             "role": "admin", "is_staff": True, "is_superuser": True, "is_verified": True},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        user = CustomUser.objects.get(email="priv@example.com")
        self.assertEqual(user.role, CustomUser.Role.CUSTOMER)
        self.assertFalse(user.is_staff or user.is_superuser or user.is_verified)

    def test_repeated_failed_logins_are_throttled(self):
        cache.clear()
        self._as(None)
        codes = [
            self.client.post("/api/auth/login/", {"email": self.customer.email, "password": "wrong"}, format="json").status_code
            for _ in range(40)
        ]
        self.assertIn(429, codes)
        self.assertNotIn(200, codes)


class NotificationCentreIsolationTests(HardeningBase):
    """KHS-015: the bell belongs to its recipient."""

    def setUp(self):
        super().setUp()
        self.order = self._in_progress_order()
        self.customer_unread = Notification.objects.filter(recipient=self.customer, is_read=False).count()
        self.assertGreater(self.customer_unread, 0)

    def _list(self):
        data = self.client.get("/api/notifications/").data
        return data["results"] if isinstance(data, dict) else data

    def test_other_roles_do_not_see_or_mutate_customer_notifications(self):
        target = Notification.objects.filter(recipient=self.customer, is_read=False).first()
        for user in (self.provider_user, self.employee, self.admin, self.other_customer):
            self._as(user)
            rows = self._list()
            self.assertTrue(all(row["recipient"] == user.pk for row in rows), user.email)
            self.assertEqual(
                self.client.get("/api/notifications/unread-count/").data["unread"],
                Notification.objects.filter(recipient=user, is_read=False, is_deleted=False).count(), user.email,
            )
            self.assertEqual(self.client.patch(f"/api/notifications/{target.pk}/read/").status_code, 404, user.email)
            self.client.post("/api/notifications/mark-all-read/")
        self.assertEqual(Notification.objects.filter(recipient=self.customer, is_read=False).count(), self.customer_unread)

    def test_owner_reads_own_notifications_exactly_once_each(self):
        self._as(self.customer)
        self.assertEqual(self.client.get("/api/notifications/unread-count/").data["unread"], self.customer_unread)
        self.assertEqual(self.client.post("/api/notifications/mark-all-read/").data["updated"], self.customer_unread)
        self.assertEqual(self.client.get("/api/notifications/unread-count/").data["unread"], 0)

    def test_no_duplicate_event_notifications_per_recipient(self):
        seen = set()
        for row in Notification.objects.filter(order=self.order).values_list("recipient_id", "template_key", "title"):
            self.assertNotIn(row, seen)
            seen.add(row)


class FinanceVisibilityTests(HardeningBase):
    """KHS-016: providers do not receive finance figures (SRS business rule)."""

    def test_provider_summary_has_no_payment_or_revenue_data(self):
        self._completed_order()
        self._as(self.provider_user)
        r = self.client.get("/api/reports/summary/")
        if r.status_code == 200:
            self.assertNotIn("payment_summary", r.data)
            self.assertNotIn("final_price", str(r.data))
            self.assertNotIn(self.customer.phone, str(r.data))
            self.assertNotIn(self.customer.email, str(r.data))
            self.assertNotIn("revenue", str(r.data).lower())
            self.assertNotIn("government_fee", str(r.data))
        else:
            self.assertEqual(r.status_code, 403)
        r = self.client.get("/api/admin/dashboard/")
        if r.status_code == 200:
            self.assertNotIn("revenue_estimate", str(r.data))


class UnpublishedCatalogTests(HardeningBase):
    """KHS-017: only published, orderable services accept new orders."""

    def _create(self, service):
        self._as(self.customer)
        return self.client.post(
            "/api/orders/",
            {"service": service.pk, "full_name": "x", "phone": self.customer.phone, "city": "Amman", "consent": True},
            format="json",
        )

    def test_unpublished_service_cannot_be_ordered(self):
        Service.objects.filter(pk=self.simple.pk).update(show_on_public_site=False)
        self.assertEqual(self._create(self.simple).status_code, 400)

    def test_service_in_hidden_or_inactive_category_cannot_be_ordered(self):
        Service.objects.filter(pk=self.simple.pk).update(category=self.hidden_cat)
        self.assertEqual(self._create(self.simple).status_code, 400)

    def test_inactive_service_cannot_be_ordered_and_is_not_public(self):
        Service.objects.filter(pk=self.simple.pk).update(is_active=False)
        self.assertEqual(self._create(self.simple).status_code, 400)
        self._as(None)
        self.assertEqual(self.client.get(f"/api/services/{self.simple.slug}/").status_code, 404)

    def test_published_service_still_orderable(self):
        self.assertEqual(self._create(self.simple).status_code, 201)

    def test_existing_order_survives_service_unpublish(self):
        order = self._order_for(self.customer, self.svc)
        Service.objects.filter(pk=self.svc.pk).update(show_on_public_site=False, is_active=False)
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["service_name_snapshot"], "خدمة")
        self._start_review(order)


class CmsPublishStateTests(HardeningBase):
    """KHS-018: reading the public site never publishes content."""

    def test_public_read_does_not_republish_unpublished_content(self):
        from public_site.models import PublicPageContent

        self._as(None)
        self.assertEqual(self.client.get("/api/public-site/homepage/").status_code, 200)
        content = PublicPageContent.objects.order_by("-pk").first()
        PublicPageContent.objects.filter(pk=content.pk).update(active_content=False, hero_title_ar="DRAFT-ONLY-TEXT")
        r = self.client.get("/api/public-site/homepage/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("DRAFT-ONLY-TEXT", str(r.data))
        self.assertFalse(PublicPageContent.objects.get(pk=content.pk).active_content)


class TenantWriteBoundaryTests(TenantBase):
    """KHS-019: an organization administrator cannot change platform-wide records."""

    def test_partner_admin_cannot_create_or_capture_global_services(self):
        self._as(self.partner_admin)
        payload = {"name_ar": "خدمة دخيلة", "name_en": "Intruder", "slug": "intruder", "category": self.cat.pk,
                   "description_ar": "x", "estimated_duration": 1, "base_price": "1.00"}
        r = self.client.post("/api/admin/services/", payload, format="json")
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(Service.objects.filter(slug="intruder").exists())
        r = self.client.patch(f"/api/admin/services/{self.simple.pk}/", {"organization_id": self.partner_a.pk}, format="json")
        self.assertIn(r.status_code, (400, 403, 404), r.data)
        self.assertIsNone(Service.objects.get(pk=self.simple.pk).organization_id)

    def test_partner_admin_cannot_change_platform_document_rules_or_settings(self):
        from services.models import ServiceRequiredDocument

        rule = ServiceRequiredDocument.objects.get(service=self.svc, document_type="national_id")
        self._as(self.partner_admin)
        r = self.client.patch(f"/api/admin/service-documents/{rule.pk}/", {"provider_can_view_file": True}, format="json")
        self.assertIn(r.status_code, (403, 404), r.data)
        rule.refresh_from_db()
        self.assertFalse(rule.provider_can_view_file)
        self.assertIn(self.client.get("/api/admin/addresses/").status_code, (403, 404))
        r = self.client.post("/api/admin/system-settings/", {"key": "site.contact", "value": {"phone": "000"}}, format="json")
        self.assertIn(r.status_code, (403, 404), r.data)

    def test_partner_admin_cannot_take_over_a_shared_provider_account(self):
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/admin/providers/{self.provider.pk}/?order=1",
            {"password": "Taken!Over#2026", "email": "attacker@example.com"}, format="json",
        )
        self.assertIn(r.status_code, (400, 403, 404), r.data)
        self.provider_user.refresh_from_db()
        self.assertEqual(self.provider_user.email, "adv-prov@example.com")
        self.assertTrue(self.provider_user.check_password("Password@123"))


class CustomerPaymentRecordTests(HardeningBase):
    """KHS-021: the payer cannot write platform-owned payment fields."""

    def _post(self, order, **payload):
        self._as(self.customer)
        return self.client.post("/api/customer/payments/", {"order": order.pk, "method": "cash", **payload}, format="json")

    def test_customer_cannot_record_refund_or_non_positive_amount(self):
        order = self._order_for(self.customer)
        self.assertEqual(self._post(order, payment_type="refund", amount="5.00").status_code, 400)
        self.assertEqual(self._post(order, payment_type="full", amount="0").status_code, 400)
        self.assertEqual(self._post(order, payment_type="full", amount="-5").status_code, 400)

    def test_customer_cannot_pay_for_another_customers_order(self):
        order = self._order_for(self.other_customer)
        self.assertIn(self._post(order, payment_type="full", amount="5.00").status_code, (400, 403, 404))


class CatalogSchemaValidationTests(HardeningBase):
    """KHS-032: a malformed request-form schema is refused at save time."""

    def _patch(self, schema):
        self._as(self.admin)
        return self.client.patch(
            f"/api/admin/services/{self.simple.pk}/", {"required_information_schema": schema}, format="json"
        )

    def test_malformed_schemas_are_rejected(self):
        for schema in (
            {"key": "not-a-list"},
            ["just-a-string"],
            [{"label_ar": "بدون مفتاح", "type": "text"}],
            [{"key": "a", "label_ar": "أ"}, {"key": "A", "label_ar": "مكرر"}],
            [{"key": "a", "label_ar": "أ", "type": {"bad": 1}}],
            [{"key": "a", "label_ar": "أ", "type": "select", "options": "x,y"}],
            [{"key": "a", "type": "text"}],
        ):
            self.assertEqual(self._patch(schema).status_code, 400, schema)
        self.assertEqual(Service.objects.get(pk=self.simple.pk).required_information_schema, [])

    def test_valid_schema_is_accepted_and_public(self):
        schema = [{"key": "plot", "label_ar": "رقم القطعة", "label_en": "Plot number", "type": "number", "required": True}]
        self.assertEqual(self._patch(schema).status_code, 200)
        self._as(None)
        r = self.client.get(f"/api/services/{self.simple.slug}/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["required_information_schema"][0]["key"], "plot")
