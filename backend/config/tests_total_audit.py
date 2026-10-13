"""Total-assurance regression suite (KTA findings).

Each test asserts the SAFE behaviour for a weakness found during the total
system audit. Finding IDs refer to docs/total-audit/KHALSNI_TOTAL_FINDINGS.csv.
"""

from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import CustomUser, CustomerProfile
from config.tests_acceptance_adversarial import _pdf
from config.tests_hardening import HardeningBase
from config.tests_hardening_access import TenantBase
from documents.models import Document
from orders.models import Order
from organizations.models import Organization, OrganizationMembership
from organizations.selectors import is_platform_support, is_platform_super_admin
from payment.models import Payment
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceRelation


def _rows(response):
    data = response.data
    return data["results"] if isinstance(data, dict) and "results" in data else data


class AuditTenantBase(TenantBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.platform = Organization.objects.filter(
            organization_type=Organization.OrganizationType.PLATFORM
        ).first() or Organization.objects.create(
            name="Platform", slug="kta-platform", organization_type=Organization.OrganizationType.PLATFORM,
        )
        cls.platform_support = CustomUser.objects.create_user(
            email="kta-support@example.com", password="Password@123", full_name="Platform Support",
            phone="0795551001", role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=cls.platform_support, organization=cls.platform,
            role=OrganizationMembership.MembershipRole.PLATFORM_SUPPORT,
        )
        cls.platform_admin_member = CustomUser.objects.create_user(
            email="kta-padmin@example.com", password="Password@123", full_name="Platform Admin Member",
            phone="0795551002", role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=cls.platform_admin_member, organization=cls.platform,
            role=OrganizationMembership.MembershipRole.PLATFORM_SUPER_ADMIN,
        )
        cls.a_employee = CustomUser.objects.create_user(
            email="kta-a-employee@example.com", password="Password@123", full_name="A Employee",
            phone="0795551003", role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=cls.a_employee, organization=cls.partner_a,
            role=OrganizationMembership.MembershipRole.PARTNER_EMPLOYEE,
        )
        cls.a_service = Service.objects.create(
            category=cls.cat, organization=cls.partner_a, scope=Service.Scope.PARTNER_PRIVATE,
            name_ar="خدمة شريك", name_en="Partner service", slug="kta-a-service",
            description_ar="d", estimated_duration=1, base_price="1.00", provider_required=True,
            show_on_public_site=True,
        )


class LegacyRoleEscalationTests(AuditTenantBase):
    """KTA-001: an organization admin cannot mint platform-wide staff through the legacy role field."""

    def _can_read_foreign_order(self, user):
        order = self._order_for(self.customer, self.simple)
        self._as(CustomUser.objects.get(pk=user.pk))
        return self.client.get(f"/api/admin/orders/{order.pk}/").status_code == 200

    def test_partner_admin_cannot_create_unscoped_support_or_employee(self):
        for index, role in enumerate(("support", "employee")):
            self._as(self.partner_admin)
            email = f"kta-minted-{role}@example.com"
            r = self.client.post(
                "/api/admin/users/",
                {"email": email, "password": "Str0ng!Passw0rd", "full_name": "Minted",
                 "phone": f"079555200{index}", "role": role},
                format="json",
            )
            created = CustomUser.objects.filter(email=email).first()
            if created is not None:
                self.assertFalse(is_platform_support(created), f"{role}: became platform support ({r.status_code})")
                self.assertFalse(self._can_read_foreign_order(created), f"{role}: reads orders of every tenant")
            else:
                self.assertIn(r.status_code, (400, 403), r.data)

    def test_partner_admin_cannot_promote_a_member_or_self_to_support(self):
        for target in (self.a_employee, self.partner_admin):
            self._as(self.partner_admin)
            r = self.client.patch(f"/api/admin/users/{target.pk}/", {"role": "support"}, format="json")
            self.assertIn(r.status_code, (400, 403), r.data)
            self.assertEqual(CustomUser.objects.get(pk=target.pk).role, "employee")

    def test_scoped_member_with_scope_removed_does_not_become_platform_wide(self):
        """Removing the last membership must not widen an employee to every tenant."""
        OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=False)
        self.assertFalse(self._can_read_foreign_order(self.a_employee))


class CrossTenantAccountTakeoverTests(AuditTenantBase):
    """KTA-002: an organization admin manages only accounts that belong wholly to that organization."""

    def test_cannot_attach_foreign_users_to_own_organization(self):
        for target in (self.b_employee, self.platform_support, self.platform_admin_member, self.other_customer):
            self._as(self.partner_admin)
            r = self.client.post(
                "/api/organization-memberships/",
                {"user": target.pk, "organization": self.partner_a.pk, "role": "partner_employee"},
                format="json",
            )
            self.assertIn(r.status_code, (400, 403), f"{target.email}: {r.data}")
            self.assertFalse(
                OrganizationMembership.objects.filter(user=target, organization=self.partner_a).exists(), target.email
            )

    def test_cannot_reset_password_of_user_shared_with_another_organization(self):
        for target in (self.b_employee, self.platform_support, self.platform_admin_member):
            # The link exists already (for example made earlier by the platform team).
            OrganizationMembership.objects.create(
                user=target, organization=self.partner_a,
                role=OrganizationMembership.MembershipRole.PARTNER_EMPLOYEE,
            )
            before = CustomUser.objects.get(pk=target.pk)
            self._as(self.partner_admin)
            r = self.client.patch(
                f"/api/admin/users/{target.pk}/",
                {"password": "Attacker!Passw0rd9", "email": f"stolen-{target.pk}@example.com"},
                format="json",
            )
            after = CustomUser.objects.get(pk=target.pk)
            self.assertIn(r.status_code, (400, 403, 404), f"{target.email}: {r.data}")
            self.assertEqual(after.password, before.password, target.email)
            self.assertEqual(after.email, before.email, target.email)

    def test_still_manages_own_organization_staff(self):
        self._as(self.partner_admin)
        r = self.client.patch(f"/api/admin/users/{self.a_employee.pk}/", {"full_name": "Renamed"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_former_member_is_out_of_reach(self):
        OrganizationMembership.objects.filter(user=self.a_employee, organization=self.partner_a).update(
            is_active=False, is_deleted=True
        )
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/admin/users/{self.a_employee.pk}/", {"password": "Attacker!Passw0rd9"}, format="json"
        )
        self.assertIn(r.status_code, (400, 403, 404), r.data)

    def test_cannot_capture_a_customer_through_the_profile_endpoint(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/admin/customer-profiles/",
            {"user": self.other_customer.pk, "organization": self.partner_a.pk, "is_identity_verified": True},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(CustomerProfile.objects.filter(user=self.other_customer, organization=self.partner_a).exists())


class PlatformCatalogWriteBoundaryTests(AuditTenantBase):
    """KTA-003/004: categories and relations between global services belong to the platform."""

    def test_partner_admin_cannot_change_shared_categories(self):
        self._as(self.partner_admin)
        r = self.client.patch(f"/api/admin/categories/{self.cat.pk}/", {"name_en": "Captured"}, format="json")
        self.assertIn(r.status_code, (403, 404), r.data)
        self.assertEqual(ServiceCategory.objects.get(pk=self.cat.pk).name_en, "C")
        r = self.client.post(
            "/api/admin/categories/reorder/", {"items": [{"id": self.cat.pk, "sort_order": 99}]}, format="json"
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertNotEqual(ServiceCategory.objects.get(pk=self.cat.pk).sort_order, 99)

    def test_partner_admin_can_still_read_categories_and_edit_an_exclusive_one(self):
        own = ServiceCategory.objects.create(name_ar="خاص", name_en="Own", slug="kta-own-cat")
        Service.objects.filter(pk=self.a_service.pk).update(category=own)
        self._as(self.partner_admin)
        self.assertEqual(self.client.get("/api/admin/categories/").status_code, 200)
        r = self.client.patch(f"/api/admin/categories/{own.pk}/", {"description_en": "ours"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_partner_admin_cannot_block_global_services_with_a_prerequisite(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/admin/service-relations/",
            {"source_service_id": self.svc.pk, "target_service_id": self.simple.pk,
             "relation_type": "prerequisite", "is_required": True, "is_active": True},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(ServiceRelation.objects.filter(target_service=self.simple).exists())
        # Customers of every tenant can still order the global service.
        self._order_for(self.customer, self.simple)

    def test_partner_admin_cannot_edit_a_relation_between_global_services(self):
        relation = ServiceRelation.objects.create(
            source_service=self.svc, target_service=self.simple,
            relation_type=ServiceRelation.RelationType.ALTERNATIVE, is_active=True, created_by=self.admin,
        )
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/admin/service-relations/{relation.pk}/",
            {"relation_type": "prerequisite", "is_required": True},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403, 404), r.data)
        relation.refresh_from_db()
        self.assertEqual(relation.relation_type, ServiceRelation.RelationType.ALTERNATIVE)


class SharedProviderBoundaryTests(AuditTenantBase):
    """KTA-005: approval and activation of a shared provider are platform decisions."""

    def setUp(self):
        super().setUp()
        # The shared provider serves the category that partner A's service is in,
        # which is what puts it inside partner A's provider list.
        self.provider.service_categories.add(self.cat)

    def test_partner_admin_cannot_revoke_approval(self):
        self._as(self.partner_admin)
        r = self.client.post(
            f"/api/admin/providers/{self.provider.pk}/approval/", {"decision": "reject", "reason": "x"}, format="json"
        )
        self.assertIn(r.status_code, (403, 404), r.data)
        self.assertTrue(ProviderProfile.objects.get(pk=self.provider.pk).is_approved)

    def test_partner_admin_cannot_deactivate_the_account(self):
        self._as(self.partner_admin)
        r = self.client.post(
            f"/api/admin/providers/{self.provider.pk}/activation/", {"is_active": False, "reason": "x"}, format="json"
        )
        self.assertIn(r.status_code, (403, 404), r.data)
        r = self.client.patch(f"/api/admin/providers/{self.provider.pk}/", {"account_active": False}, format="json")
        self.assertIn(r.status_code, (400, 403, 404), r.data)
        self.assertTrue(CustomUser.objects.get(pk=self.provider_user.pk).is_active)

    def test_partner_admin_cannot_create_a_pre_approved_provider(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/admin/providers/",
            {"full_name": "Shadow", "email": "kta-shadow@example.com", "phone": "0795553001",
             "password": "Str0ng!Passw0rd", "provider_type": "company", "city": "Amman", "is_approved": True,
             "service_category_ids": [self.cat.pk]},
            format="json",
        )
        profile = ProviderProfile.objects.filter(user__email="kta-shadow@example.com").first()
        if profile is not None:
            self.assertFalse(profile.is_approved, r.data)
        else:
            self.assertIn(r.status_code, (400, 403), r.data)

    def test_filter_parameters_do_not_widen_write_scope(self):
        """A provider outside the caller's list stays out of reach with ?service= on a write."""
        outsider = self.other_provider
        outsider.service_categories.add(self.hidden_cat)
        self._as(self.partner_admin)
        for query in (f"?service={self.a_service.pk}", ""):
            r = self.client.patch(
                f"/api/admin/providers/{outsider.pk}/{query}", {"city": "Captured"}, format="json"
            )
            self.assertIn(r.status_code, (403, 404), f"{query}: {r.data}")
        self.assertNotEqual(ProviderProfile.objects.get(pk=outsider.pk).city, "Captured")


class TimelineShadowEndpointTests(HardeningBase):
    """KTA-006: the standalone timeline endpoint obeys the same privacy rule as the order payload."""

    def test_customer_timeline_has_no_staff_identity_or_internal_reason(self):
        order = self._in_progress_order()
        self._as(self.customer)
        r = self.client.get(f"/api/orders/{order.pk}/timeline/")
        self.assertEqual(r.status_code, 200)
        for row in _rows(r):
            self.assertNotIn("changed_by", row)
            self.assertNotIn("changed_by_name", row)
            if row["new_status"] not in {"WAITING_CUSTOMER", "REJECTED", "CANCELLED"}:
                self.assertEqual(row.get("note", ""), "")

    def test_provider_timeline_has_no_staff_identity(self):
        order = self._in_progress_order()
        self._as(self.provider_user)
        r = self.client.get(f"/api/orders/{order.pk}/timeline/")
        self.assertEqual(r.status_code, 200)
        for row in _rows(r):
            self.assertNotIn("changed_by", row)
            self.assertNotIn("changed_by_name", row)

    def test_staff_timeline_keeps_actor(self):
        order = self._in_progress_order()
        self._as(self.admin)
        r = self.client.get(f"/api/orders/{order.pk}/timeline/")
        self.assertIn("changed_by_name", _rows(r)[0])

    def test_other_customer_gets_404(self):
        order = self._in_progress_order()
        self._as(self.other_customer)
        self.assertEqual(self.client.get(f"/api/orders/{order.pk}/timeline/").status_code, 404)


class CustomerPayloadStaffPrivacyTests(HardeningBase):
    """KTA-007: customer payloads carry no staff email or internal user ids."""

    def test_customer_order_payload_hides_staff_contact(self):
        order = self._in_progress_order()
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/").data
        listing = _rows(self.client.get("/api/customer/orders/"))[0]
        for payload in (detail, listing):
            employee = payload.get("assigned_employee") or {}
            self.assertNotIn("email", employee)
            self.assertNotIn("role", employee)
        self.assertNotIn(self.admin.email, str(detail))

    def test_staff_still_see_the_assigned_employee(self):
        order = self._in_progress_order()
        self._as(self.admin)
        detail = self.client.get(f"/api/admin/orders/{order.pk}/").data
        self.assertEqual(detail["assigned_employee"]["email"], self.admin.email)


class FinalResultSupersededTests(HardeningBase):
    """KTA-008: an older verified result must not carry a newer unverified one to the customer."""

    def _second_unverified_result(self):
        order = self._ready_order()
        first = order.documents.get(is_final_document=True)
        self._as(self.admin)
        r = self.client.post(f"/api/staff/documents/{first.pk}/verify/", {"is_verified": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/", {"status": "IN_PROGRESS", "note": "redo page 2"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        r = self._provider_final(order)
        self.assertEqual(r.status_code, 201, r.data)
        second = order.documents.filter(is_final_document=True).exclude(pk=first.pk).get()
        return order, first, second

    def test_employee_cannot_complete_on_a_superseded_verification(self):
        order, _first, second = self._second_unverified_result()
        Order.objects.filter(pk=order.pk).update(assigned_employee=self.employee)
        self._as(self.employee)
        r = self.client.post(f"/api/admin/orders/{order.pk}/complete/", {}, format="json")
        self.assertIn(r.status_code, (400, 403), r.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)
        self.assertFalse(Document.objects.get(pk=second.pk).is_verified)

    def test_unverified_result_never_reaches_the_customer(self):
        order, first, second = self._second_unverified_result()
        self._as(self.admin)
        r = self.client.post(f"/api/admin/orders/{order.pk}/complete/", {"admin_confirmation": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self._as(self.customer)
        ids = [d["id"] for d in self.client.get(f"/api/customer/orders/{order.pk}/").data["documents"]]
        self.assertIn(first.pk, ids)
        self.assertNotIn(second.pk, ids)
        self.assertIn(self.client.get(f"/api/documents/{second.pk}/download/").status_code, (403, 404))
        self._as(None)
        r = self.client.get(f"/api/orders/track/?order_number={order.order_number}&phone={self.customer.phone}")
        self.assertNotIn(second.pk, [d["id"] for d in r.data["final_documents"]])


class RobustErrorTests(HardeningBase):
    """KTA-009: invalid input is a 400, never a 500."""

    def setUp(self):
        super().setUp()
        self.client.raise_request_exception = False

    def test_report_with_malformed_date(self):
        self._as(self.admin)
        r = self.client.get("/api/employee/reports/summary/?date_from=not-a-date")
        self.assertEqual(r.status_code, 400, getattr(r, "data", None))

    def test_payment_status_change_that_breaks_model_rules(self):
        order = self._order_for(self.customer, self.simple)
        payment = Payment.objects.create(order=order, amount="5.00", paid_by=self.customer)
        self._as(self.admin)
        r = self.client.post(f"/api/admin/payments/{payment.pk}/status/", {"status": "failed"}, format="json")
        self.assertEqual(r.status_code, 400, getattr(r, "data", None))
        r = self.client.post(f"/api/admin/payments/{payment.pk}/status/", {"status": "paid"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post(f"/api/admin/payments/{payment.pk}/status/", {"status": "pending"}, format="json")
        self.assertEqual(r.status_code, 400, getattr(r, "data", None))
        self.assertEqual(Payment.objects.get(pk=payment.pk).status, "paid")

    def test_provider_dashboard_without_profile(self):
        provider_org = Organization.objects.create(
            name="Prov Org", slug="kta-prov-org", organization_type=Organization.OrganizationType.PROVIDER,
        )
        member = CustomUser.objects.create_user(
            email="kta-prov-member@example.com", password="Password@123", full_name="Prov Member",
            phone="0795554001", role=CustomUser.Role.EMPLOYEE,
        )
        OrganizationMembership.objects.create(
            user=member, organization=provider_org, role=OrganizationMembership.MembershipRole.PROVIDER_EMPLOYEE,
        )
        self._as(member)
        r = self.client.get("/api/provider/dashboard/")
        self.assertIn(r.status_code, (200, 403, 404), getattr(r, "data", None))


class RefreshTokenRevocationTests(HardeningBase):
    """KTA-010: a refresh token issued before revocation cannot mint a working session."""

    def _login(self, user, password="Password@123"):
        client = APIClient()
        r = client.post("/api/auth/login/", {"email": user.email, "password": password}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        return r.data["access"], r.data["refresh"]

    def _refresh_gives_working_access(self, refresh):
        cache.clear()
        client = APIClient()
        r = client.post("/api/auth/token/refresh/", {"refresh": refresh}, format="json")
        if r.status_code != 200:
            return False
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        return client.get("/api/auth/me/").status_code == 200

    def test_refresh_token_dies_on_logout_everywhere(self):
        access, refresh = self._login(self.customer)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.assertEqual(client.post("/api/auth/logout/", {"all_devices": True}, format="json").status_code, 204)
        self.assertFalse(self._refresh_gives_working_access(refresh))

    def test_refresh_endpoint_itself_refuses_a_revoked_token(self):
        _access, refresh = self._login(self.customer)
        CustomUser.objects.filter(pk=self.customer.pk).update(token_version=5)
        r = APIClient().post("/api/auth/token/refresh/", {"refresh": refresh}, format="json")
        self.assertEqual(r.status_code, 401, r.data)

    def test_refresh_token_dies_on_deactivation(self):
        _access, refresh = self._login(self.customer)
        CustomUser.objects.filter(pk=self.customer.pk).update(is_active=False)
        self.assertFalse(self._refresh_gives_working_access(refresh))


class OperationsLedgerBoundaryTests(HardeningBase):
    """KTA-011: the operations payment endpoints are closed to customers and providers."""

    def setUp(self):
        super().setUp()
        from accounts.role_groups import sync_user_role_group

        for user in (self.customer, self.other_customer, self.provider_user):
            sync_user_role_group(user)
        self.order = self._order_for(self.customer, self.simple)
        self.foreign = Payment.objects.create(
            order=self._order_for(self.other_customer, self.simple), amount="7.00", paid_by=self.other_customer
        )

    def test_customer_cannot_read_the_operations_ledger(self):
        self._as(CustomUser.objects.get(pk=self.customer.pk))
        r = self.client.get("/api/admin/payments/")
        self.assertEqual(r.status_code, 403, getattr(r, "data", None))
        self.assertEqual(self.client.get(f"/api/admin/payments/{self.foreign.pk}/").status_code, 403)

    def test_customer_cannot_record_through_the_operations_endpoint(self):
        self._as(CustomUser.objects.get(pk=self.customer.pk))
        r = self.client.post(
            "/api/admin/payments/",
            {"order": self.order.pk, "payment_type": "refund", "method": "cash", "amount": "0.00"},
            format="json",
        )
        self.assertEqual(r.status_code, 403, getattr(r, "data", None))
        self.assertFalse(Payment.objects.filter(order=self.order).exists())

    def test_staff_cannot_record_a_non_positive_amount(self):
        self._as(self.admin)
        r = self.client.post(
            "/api/admin/payments/",
            {"order": self.order.pk, "payment_type": "full", "method": "cash", "amount": "0.00"},
            format="json",
        )
        self.assertEqual(r.status_code, 400, getattr(r, "data", None))

class AdminBootstrapTests(HardeningBase):
    """KTA-014: the start-up admin command never promotes or revives an account by accident."""

    def _run(self, **env):
        import os
        from unittest import mock

        from django.core.management import call_command

        with mock.patch.dict(os.environ, {"DJANGO_ADMIN_PASSWORD": "Str0ng!Passw0rd", **env}):
            call_command("create_admin")

    def test_existing_customer_is_not_promoted(self):
        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            self._run(DJANGO_ADMIN_EMAIL=self.customer.email)
        customer = CustomUser.objects.get(pk=self.customer.pk)
        self.assertEqual(customer.role, "customer")
        self.assertFalse(customer.is_superuser)

    def test_deactivated_admin_stays_deactivated_without_reset(self):
        CustomUser.objects.filter(pk=self.admin.pk).update(is_active=False)
        self._run(DJANGO_ADMIN_EMAIL=self.admin.email)
        self.assertFalse(CustomUser.objects.get(pk=self.admin.pk).is_active)

    def test_password_reset_revokes_old_sessions(self):
        before = CustomUser.objects.get(pk=self.admin.pk).token_version
        self._run(DJANGO_ADMIN_EMAIL=self.admin.email, DJANGO_ADMIN_RESET_PASSWORD="True")
        admin = CustomUser.objects.get(pk=self.admin.pk)
        self.assertEqual(admin.token_version, before + 1)
        self.assertTrue(admin.check_password("Str0ng!Passw0rd"))


class CacheOutageTests(HardeningBase):
    """KTA-015: an unreachable rate-limit store does not take the API down."""

    def setUp(self):
        from core.throttling import reset_store_state

        super().setUp()
        reset_store_state()
        self.addCleanup(reset_store_state)

    def test_api_answers_when_the_cache_raises(self):
        from unittest import mock

        self._as(None)
        with mock.patch("django.core.cache.cache.get", side_effect=ConnectionError("redis down")), \
                mock.patch("django.core.cache.cache.set", side_effect=ConnectionError("redis down")):
            self.assertEqual(self.client.get("/api/services/").status_code, 200)
            r = self.client.post(
                "/api/auth/login/", {"email": self.customer.email, "password": "Password@123"}, format="json"
            )
            self.assertEqual(r.status_code, 200, getattr(r, "data", None))
            self.assertEqual(
                self.client.get("/api/orders/track/?order_number=KH-0000-000000&phone=0790000000").status_code, 404
            )


    def test_outage_is_paid_for_once_not_on_every_request(self):
        """A dead store is left alone for a while: one slow request, not all of them."""
        from unittest import mock

        from core import throttling

        self._as(None)
        with mock.patch("django.core.cache.cache.get", side_effect=ConnectionError("redis down")) as cache_get,                 self.assertLogs("khalsni.throttle", level="ERROR") as captured:
            for _ in range(5):
                self.assertEqual(self.client.get("/api/services/").status_code, 200)
            self.assertEqual(cache_get.call_count, 1)
        self.assertEqual(len(captured.records), 1)
        self.assertTrue(throttling.store_marked_down())

    def test_limits_resume_after_the_pause(self):
        from unittest import mock

        from core import throttling

        self._as(None)
        with mock.patch("django.core.cache.cache.get", side_effect=ConnectionError("redis down")),                 self.assertLogs("khalsni.throttle", level="ERROR"):
            self.client.get("/api/services/")
        self.assertTrue(throttling.store_marked_down())
        with mock.patch("core.throttling.time.monotonic", return_value=throttling._store_down_until + 1):
            self.assertFalse(throttling.store_marked_down())
            with mock.patch("django.core.cache.cache.get", return_value=None) as cache_get:
                self.assertEqual(self.client.get("/api/services/").status_code, 200)
                self.assertGreaterEqual(cache_get.call_count, 1)

    def test_password_reset_limit_shares_the_pause(self):
        from unittest import mock

        from accounts.password_reset import _increment_rate_limit

        with mock.patch("accounts.password_reset.cache.add", side_effect=ConnectionError("redis down")) as cache_add,                 self.assertLogs("khalsni.throttle", level="ERROR"):
            for _ in range(4):
                self.assertFalse(_increment_rate_limit("k", max_attempts=1, window_seconds=60))
            self.assertEqual(cache_add.call_count, 1)


class ProductionLoggingTests(HardeningBase):
    """KTA-016: an unhandled error leaves a traceback in the log."""

    def test_logging_is_configured_for_errors(self):
        from django.conf import settings

        self.assertIn("console", settings.LOGGING["handlers"])
        self.assertEqual(settings.LOGGING["loggers"]["django.request"]["level"], "ERROR")
        self.assertEqual(settings.LOGGING["root"]["handlers"], ["console"])

    def test_unhandled_error_is_logged(self):
        from unittest import mock

        self.client.raise_request_exception = False
        self._as(self.admin)
        with self.assertLogs("django.request", level="ERROR") as captured, \
                mock.patch("reports.views._scoped_orders_for_reports", side_effect=RuntimeError("boom")):
            r = self.client.get("/api/admin/dashboard/")
        self.assertEqual(r.status_code, 500)
        self.assertTrue(any("Internal Server Error" in line for line in captured.output))


from config.tests_hardening_closure import ConcurrentWorkflowRaceTests  # noqa: E402
from orders import services as order_services  # noqa: E402
from orders.models import OrderStatusLog, Rating  # noqa: E402
from notifications.models import Notification  # noqa: E402


class ConcurrentLateStageRaceTests(ConcurrentWorkflowRaceTests):
    """KTA-017: late-stage decisions taken at the same instant (PostgreSQL row locks)."""

    test_concurrent_reject_and_assign_leave_one_consistent_outcome = None
    test_concurrent_double_assignment_writes_one_assignment = None

    ROUNDS = 6

    def _in_progress(self):
        pk = self._order_under_review()
        order_services.assign_provider_to_order(order=Order.objects.get(pk=pk), provider=self.provider, actor=self.admin)
        order_services.provider_update_status(
            order=Order.objects.get(pk=pk), actor=self.provider.user, new_status=Order.Status.IN_PROGRESS
        )
        return pk

    def _upload_final(self, pk):
        return order_services.complete_provider_work(
            order=Order.objects.get(pk=pk), actor=self.provider.user,
            validated_data={"file": _pdf("final.pdf"), "document_type": "FINAL_RESULT"},
        )

    def _ready_and_verified(self):
        pk = self._in_progress()
        document = self._upload_final(pk)
        from documents.services import verify_document

        verify_document(document=document, actor=self.admin, is_verified=True)
        return pk

    def test_provider_result_and_admin_cancel_leave_a_serial_history(self):
        """Either order of the two actions is legal on its own; the record must match one of them."""
        for _ in range(self.ROUNDS):
            pk = self._in_progress()
            outcomes = self._race(
                lambda: self._upload_final(pk),
                lambda: order_services.cancel_order(order=Order.objects.get(pk=pk), actor=self.admin, reason="race"),
            )
            order = Order.objects.get(pk=pk)
            late = list(
                OrderStatusLog.objects.filter(order=order, new_status__in=["READY_FOR_DELIVERY", "CANCELLED"])
                .order_by("created_at", "pk").values_list("new_status", flat=True)
            )
            final_count = Document.objects.filter(order=order, is_final_document=True).count()
            if outcomes == ["ok", "ok"]:
                # Result delivered first, then cancelled by the administrator.
                self.assertEqual(late, ["READY_FOR_DELIVERY", "CANCELLED"])
                self.assertEqual((order.status, final_count), (Order.Status.CANCELLED, 1))
            else:
                # Cancelled first: the late upload is refused and leaves no file row.
                self.assertEqual(outcomes, ["ok", "refused"])
                self.assertEqual(late, ["CANCELLED"])
                self.assertEqual((order.status, final_count), (Order.Status.CANCELLED, 0))

    def test_double_completion_counts_once(self):
        for _ in range(self.ROUNDS):
            pk = self._ready_and_verified()
            before = ProviderProfile.objects.get(pk=self.provider.pk).total_completed_orders

            def complete():
                order_services.complete_order(order=Order.objects.get(pk=pk), actor=self.admin)

            self.assertEqual(self._race(complete, complete), ["ok", "refused"])
            self.assertEqual(OrderStatusLog.objects.filter(order_id=pk, new_status="COMPLETED").count(), 1)
            self.assertEqual(ProviderProfile.objects.get(pk=self.provider.pk).total_completed_orders, before + 1)
            self.assertEqual(
                Notification.objects.filter(order_id=pk, recipient=self.customer, context_data__dedupe_key__startswith="order_completed").count(),
                1,
            )

    def test_two_results_uploaded_at_once_leave_one(self):
        for _ in range(self.ROUNDS):
            pk = self._in_progress()
            self.assertEqual(self._race(lambda: self._upload_final(pk), lambda: self._upload_final(pk)), ["ok", "refused"])
            self.assertEqual(Document.objects.filter(order_id=pk, is_final_document=True).count(), 1)

    def test_double_rating_stores_one(self):
        pk = self._ready_and_verified()
        order_services.complete_order(order=Order.objects.get(pk=pk), actor=self.admin)

        def rate():
            order_services.create_customer_rating(
                order=Order.objects.get(pk=pk), actor=self.customer, validated_data={"score": 5, "comment": ""}
            )

        self.assertEqual(self._race(rate, rate), ["ok", "refused"])
        self.assertEqual(Rating.objects.filter(order_id=pk).count(), 1)

    def test_same_submission_key_from_two_tabs_creates_one_order(self):
        import uuid

        simple = Service.objects.create(
            category=self.service.category, name_ar="بسيطة", name_en="Simple", slug="race-simple",
            description_ar="d", estimated_duration=1, base_price="1.00", provider_required=False,
            show_on_public_site=True,
        )
        for _ in range(self.ROUNDS):
            key = str(uuid.uuid4())
            statuses = []

            def submit():
                client = APIClient()
                client.force_authenticate(self.customer)
                r = client.post(
                    "/api/orders/",
                    {"service": simple.pk, "full_name": self.customer.full_name, "phone": self.customer.phone,
                     "city": "Amman", "consent": True},
                    format="json", HTTP_IDEMPOTENCY_KEY=key,
                )
                statuses.append(r.status_code)

            self.assertEqual(self._race(submit, submit), ["ok", "ok"])
            self.assertEqual(sorted(statuses), [200, 201])
            self.assertEqual(Order.objects.filter(customer=self.customer, submission_key=key).count(), 1)
