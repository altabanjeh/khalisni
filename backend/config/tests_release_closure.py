"""Release-closure boundary tests for the account-management rule.

Makes explicit the six properties the release review relies on
(``organizations.selectors.can_manage_user_account`` and
``has_tenant_membership_history``). Complements tests_total_audit.py.
"""

from accounts.models import CustomUser
from config.tests_total_audit import AuditTenantBase
from organizations.models import OrganizationMembership
from organizations.selectors import (
    can_manage_user_account,
    enforce_organization_scope,
    has_tenant_membership_history,
    is_platform_support,
)
from orders.models import Order

Role = OrganizationMembership.MembershipRole


class AccountManagementBoundaryBase(AuditTenantBase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.legacy_admin = CustomUser.objects.create_user(
            email="rc-legacy-admin@example.com", password="Password@123", full_name="Legacy Admin",
            phone="0795553001", role=CustomUser.Role.ADMIN,
        )
        cls.superuser = CustomUser.objects.create_superuser(
            email="rc-root@example.com", password="Password@123", full_name="Root", phone="0795553002",
        )
        cls.internal_employee = CustomUser.objects.create_user(
            email="rc-internal@example.com", password="Password@123", full_name="Internal Employee",
            phone="0795553003", role=CustomUser.Role.EMPLOYEE,
        )

    def _fresh(self, user):
        return CustomUser.objects.get(pk=user.pk)

    def _patch_identity(self, target):
        return self.client.patch(
            f"/api/admin/users/{target.pk}/",
            {"password": "Attacker!Passw0rd9", "email": f"rc-stolen-{target.pk}@example.com"},
            format="json",
        )

    def _reads_foreign_order(self, user):
        order = self._order_for(self.customer, self.simple)
        self._as(self._fresh(user))
        listed = self.client.get("/api/admin/orders/")
        detail = self.client.get(f"/api/admin/orders/{order.pk}/")
        in_list = listed.status_code == 200 and any(
            row.get("id") == order.pk
            for row in (listed.data["results"] if isinstance(listed.data, dict) else listed.data)
        )
        return detail.status_code == 200 or in_list


class OrgAdminCannotManagePlatformAdministratorsTests(AccountManagementBoundaryBase):
    """1. Organization admins cannot manage platform administrators."""

    def test_rule_refuses_every_kind_of_platform_authority(self):
        for target in (
            self.legacy_admin, self.superuser, self.platform_admin_member, self.platform_support,
            self.internal_employee,
        ):
            self.assertFalse(can_manage_user_account(self.partner_admin, target), target.email)

    def test_rule_refuses_platform_authority_even_with_a_membership_in_the_organization(self):
        for target in (self.legacy_admin, self.superuser, self.platform_admin_member, self.platform_support):
            OrganizationMembership.objects.create(user=target, organization=self.partner_a, role=Role.PARTNER_EMPLOYEE)
            self.assertFalse(can_manage_user_account(self.partner_admin, target), target.email)

    def test_api_refuses_identity_change_and_deletion(self):
        for target in (self.legacy_admin, self.superuser, self.platform_admin_member, self.platform_support):
            OrganizationMembership.objects.create(user=target, organization=self.partner_a, role=Role.PARTNER_EMPLOYEE)
            before = self._fresh(target)
            self._as(self.partner_admin)
            r = self._patch_identity(target)
            self.assertIn(r.status_code, (400, 403, 404), f"{target.email}: {r.data}")
            r = self.client.delete(f"/api/admin/users/{target.pk}/")
            self.assertIn(r.status_code, (400, 403, 404, 405), f"{target.email}: delete {r.status_code}")
            after = self._fresh(target)
            self.assertEqual(
                (after.password, after.email, after.is_active, after.is_deleted),
                (before.password, before.email, before.is_active, before.is_deleted),
                target.email,
            )

    def test_staff_flag_alone_puts_an_account_out_of_reach(self):
        CustomUser.objects.filter(pk=self.a_employee.pk).update(is_staff=True)
        self.assertFalse(can_manage_user_account(self.partner_admin, self._fresh(self.a_employee)))


class OrgAdminCannotAttachArbitraryUsersTests(AccountManagementBoundaryBase):
    """2. Organization admins cannot attach arbitrary users."""

    def test_every_attach_path_is_refused(self):
        targets = (
            self.legacy_admin, self.superuser, self.internal_employee, self.b_employee,
            self.platform_support, self.customer,
        )
        for target in targets:
            self._as(self.partner_admin)
            via_membership = self.client.post(
                "/api/organization-memberships/",
                {"user": target.pk, "organization": self.partner_a.pk, "role": "partner_employee"},
                format="json",
            )
            via_user = self.client.patch(
                f"/api/admin/users/{target.pk}/",
                {"organization_id": self.partner_a.pk, "membership_role": "partner_employee"},
                format="json",
            )
            self.assertIn(via_membership.status_code, (400, 403), f"{target.email}: {via_membership.data}")
            self.assertIn(via_user.status_code, (400, 403, 404), f"{target.email}: {via_user.data}")
            self.assertFalse(
                OrganizationMembership.objects.filter(user=target, organization=self.partner_a).exists(), target.email
            )

    def test_existing_membership_cannot_be_repointed_to_another_user(self):
        membership = OrganizationMembership.objects.get(user=self.a_employee, organization=self.partner_a)
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/organization-memberships/{membership.pk}/", {"user": self.b_employee.pk}, format="json"
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        membership.refresh_from_db()
        self.assertEqual(membership.user_id, self.a_employee.pk)

    def test_cannot_place_own_staff_into_an_organization_not_administered(self):
        self._as(self.partner_admin)
        r = self.client.patch(
            f"/api/admin/users/{self.a_employee.pk}/",
            {"organization_id": self.partner_b.pk, "membership_role": "partner_admin"},
            format="json",
        )
        self.assertIn(r.status_code, (400, 403), r.data)
        self.assertFalse(OrganizationMembership.objects.filter(user=self.a_employee, organization=self.partner_b).exists())


class OrgAdminCannotCreateUnscopedStaffTests(AccountManagementBoundaryBase):
    """3. Organization admins cannot create unscoped support/employee accounts."""

    def _create(self, **extra):
        self._as(self.partner_admin)
        payload = {
            "email": f"rc-new-{CustomUser.objects.count()}@example.com", "password": "Str0ng!Passw0rd",
            "full_name": "New", "phone": f"07955540{CustomUser.objects.count():02d}", "role": "employee",
        }
        payload.update(extra)
        return payload["email"], self.client.post("/api/admin/users/", payload, format="json")

    def test_no_membership_is_refused(self):
        for role in ("employee", "support", "provider", "admin"):
            email, r = self._create(role=role)
            self.assertEqual(r.status_code, 400, f"{role}: {r.data}")
            self.assertFalse(CustomUser.objects.filter(email=email).exists(), role)

    def test_platform_level_role_is_refused_even_inside_own_organization(self):
        for role in ("support", "admin"):
            email, r = self._create(role=role, organization_id=self.partner_a.pk, membership_role="partner_employee")
            self.assertEqual(r.status_code, 400, f"{role}: {r.data}")
            self.assertFalse(CustomUser.objects.filter(email=email).exists(), role)

    def test_platform_membership_or_foreign_organization_is_refused(self):
        attempts = (
            {"organization_id": self.platform.pk, "membership_role": "platform_support"},
            {"organization_id": self.platform.pk, "membership_role": "platform_super_admin"},
            {"organization_id": self.partner_a.pk, "membership_role": "platform_support"},
            {"organization_id": self.partner_b.pk, "membership_role": "partner_employee"},
        )
        for extra in attempts:
            email, r = self._create(**extra)
            self.assertIn(r.status_code, (400, 403), f"{extra}: {r.data}")
            self.assertFalse(CustomUser.objects.filter(email=email).exists(), str(extra))

    def test_account_created_inside_the_organization_stays_inside_it(self):
        for role in ("employee", "provider"):
            for membership_role in ("partner_employee", "partner_admin"):
                email, r = self._create(role=role, organization_id=self.partner_a.pk, membership_role=membership_role)
                created = CustomUser.objects.filter(email=email).first()
                if created is None:
                    self.assertIn(r.status_code, (400, 403), r.data)
                    continue
                label = f"{role}/{membership_role}"
                self.assertFalse(is_platform_support(created), label)
                self.assertFalse(self._reads_foreign_order(created), f"{label}: reads another tenant's order")
                self.assertFalse(
                    enforce_organization_scope(Order.objects.all(), user=created)
                    .exclude(organization=self.partner_a).exists(),
                    f"{label}: selector returns orders outside the organization",
                )


class RemovingMembershipNeverBroadensAccessTests(AccountManagementBoundaryBase):
    """4. Removing a partner membership cannot broaden access."""

    def _removals(self):
        qs = OrganizationMembership.objects.filter(user=self.a_employee)
        return {
            "deactivated": lambda: qs.update(is_active=False),
            "soft deleted": lambda: qs.update(is_deleted=True, is_active=False),
            "organization closed": lambda: type(self.partner_a).objects.filter(pk=self.partner_a.pk).update(is_active=False),
        }

    def test_each_kind_of_removal_leaves_no_access(self):
        for label, remove in self._removals().items():
            with self.subTest(label):
                OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=True, is_deleted=False)
                type(self.partner_a).objects.filter(pk=self.partner_a.pk).update(is_active=True)
                remove()
                user = self._fresh(self.a_employee)
                self.assertTrue(has_tenant_membership_history(user))
                self.assertFalse(is_platform_support(user))
                self.assertFalse(enforce_organization_scope(Order.objects.all(), user=user).exists(), label)
                self.assertFalse(self._reads_foreign_order(user), label)

    def test_removal_through_the_api_leaves_no_access(self):
        membership = OrganizationMembership.objects.get(user=self.a_employee, organization=self.partner_a)
        self._as(self.partner_admin)
        r = self.client.patch(f"/api/organization-memberships/{membership.pk}/", {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200, getattr(r, "data", None))
        membership.refresh_from_db()
        self.assertFalse(membership.is_active)
        self.assertFalse(self._reads_foreign_order(self.a_employee))

    def test_legacy_support_role_with_tenant_history_is_not_platform_support(self):
        CustomUser.objects.filter(pk=self.a_employee.pk).update(role=CustomUser.Role.SUPPORT)
        OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=False)
        user = self._fresh(self.a_employee)
        self.assertFalse(is_platform_support(user))
        self.assertFalse(self._reads_foreign_order(user))

    def test_platform_membership_does_not_count_as_tenant_history(self):
        self.assertFalse(has_tenant_membership_history(self.platform_support))
        self.assertFalse(has_tenant_membership_history(self.internal_employee))


class LegitimateOrganizationAdministrationTests(AccountManagementBoundaryBase):
    """5. Legitimate organization-scoped administration still works."""

    def test_create_update_reset_and_detach_own_staff(self):
        self._as(self.partner_admin)
        r = self.client.post(
            "/api/admin/users/",
            {"email": "rc-own-staff@example.com", "password": "Str0ng!Passw0rd", "full_name": "Own Staff",
             "phone": "0795555001", "role": "employee", "organization_id": self.partner_a.pk,
             "membership_role": "partner_employee"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        staff = CustomUser.objects.get(email="rc-own-staff@example.com")
        membership = OrganizationMembership.objects.get(user=staff, organization=self.partner_a)
        self.assertTrue(can_manage_user_account(self.partner_admin, staff))

        r = self.client.get("/api/admin/users/")
        self.assertEqual(r.status_code, 200)
        rows = r.data["results"] if isinstance(r.data, dict) else r.data
        self.assertIn(staff.pk, [row["id"] for row in rows])

        r = self.client.patch(
            f"/api/admin/users/{staff.pk}/", {"full_name": "Renamed", "password": "An0ther!Passw0rd"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        staff.refresh_from_db()
        self.assertTrue(staff.check_password("An0ther!Passw0rd"))

        r = self.client.patch(
            f"/api/organization-memberships/{membership.pk}/", {"role": "branch_manager"}, format="json"
        )
        self.assertIn(r.status_code, (200, 400), r.data)  # 400 only if the model requires a branch
        r = self.client.post(
            "/api/organization-memberships/",
            {"user": staff.pk, "organization": self.partner_a.pk, "role": "finance"},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)

    def test_own_staff_sees_own_organization_orders_only(self):
        user = self._fresh(self.a_employee)
        scoped = enforce_organization_scope(Order.objects.all(), user=user)
        self.assertFalse(scoped.exclude(organization=self.partner_a).exists())
        self.assertFalse(self._reads_foreign_order(user))


class PlatformAdministratorCapabilityTests(AccountManagementBoundaryBase):
    """6. Platform administrators retain required management capabilities."""

    def test_rule_allows_every_target(self):
        for actor in (self.superuser, self.legacy_admin, self.platform_admin_member):
            for target in (self.legacy_admin, self.platform_support, self.b_employee, self.internal_employee, self.customer):
                self.assertTrue(can_manage_user_account(actor, target), f"{actor.email} -> {target.email}")

    def test_super_admin_manages_users_across_tenants(self):
        for actor in (self.superuser, self.platform_admin_member):
            with self.subTest(actor.email):
                self._as(actor)
                suffix = actor.pk
                r = self.client.post(
                    "/api/admin/users/",
                    {"email": f"rc-support-{suffix}@example.com", "password": "Str0ng!Passw0rd",
                     "full_name": "Support", "phone": f"07955560{suffix % 100:02d}", "role": "support"},
                    format="json",
                )
                self.assertEqual(r.status_code, 201, r.data)
                r = self.client.patch(
                    f"/api/admin/users/{self.b_employee.pk}/", {"password": "Platf0rm!Reset9"}, format="json"
                )
                self.assertEqual(r.status_code, 200, r.data)
                r = self.client.post(
                    "/api/organization-memberships/",
                    {"user": self.internal_employee.pk, "organization": self.platform.pk, "role": "platform_support"},
                    format="json",
                )
                self.assertIn(r.status_code, (201, 400), r.data)  # 400 on the second actor: already a member
                self.assertTrue(
                    OrganizationMembership.objects.filter(
                        user=self.internal_employee, organization=self.platform, role="platform_support"
                    ).exists()
                )

    def test_platform_staff_keep_platform_wide_read(self):
        for user in (self.superuser, self.legacy_admin, self.platform_admin_member, self.platform_support, self.internal_employee):
            self.assertTrue(self._reads_foreign_order(user), user.email)

    def test_restoring_a_former_tenant_employee_needs_an_explicit_platform_membership(self):
        OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=False)
        self.assertFalse(self._reads_foreign_order(self.a_employee))
        OrganizationMembership.objects.create(user=self.a_employee, organization=self.platform, role=Role.PLATFORM_SUPPORT)
        self.assertTrue(self._reads_foreign_order(self.a_employee))


class ProviderRoleScopeTests(AccountManagementBoundaryBase):
    """KTA-041: the legacy provider role must not turn a tenant account into an unscoped one."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        from organizations.models import Branch, PartnerServiceConfig

        cls.b_branch = Branch.objects.create(organization=cls.partner_b, name="B branch")
        cls.b_config = PartnerServiceConfig.objects.create(
            organization=cls.partner_b, service=cls.simple, custom_name="B private name",
        )

    def _mint(self, membership_role):
        self._as(self.partner_admin)
        email = f"rc-provider-{membership_role}@example.com"
        r = self.client.post(
            "/api/admin/users/",
            {"email": email, "password": "Str0ng!Passw0rd", "full_name": "Minted provider",
             "phone": f"07955570{len(membership_role):02d}", "role": "provider",
             "organization_id": self.partner_a.pk, "membership_role": membership_role},
            format="json",
        )
        return CustomUser.objects.filter(email=email).first(), r

    def test_minted_provider_role_account_cannot_read_or_change_another_tenant(self):
        from organizations.models import PartnerServiceConfig

        for membership_role in ("partner_admin", "partner_employee"):
            with self.subTest(membership_role):
                user, r = self._mint(membership_role)
                if user is None:
                    self.assertIn(r.status_code, (400, 403), r.data)
                    continue
                self._as(user)
                for url in ("/api/branches/", "/api/organization-branding/", "/api/partner-service-configs/"):
                    listed = self.client.get(url)
                    if listed.status_code != 200:
                        self.assertIn(listed.status_code, (403, 404), url)
                        continue
                    rows = listed.data["results"] if isinstance(listed.data, dict) else listed.data
                    foreign = [row for row in rows if row.get("organization") == self.partner_b.pk]
                    self.assertEqual(foreign, [], f"{url} shows another tenant's rows")
                r = self.client.patch(
                    f"/api/partner-service-configs/{self.b_config.pk}/", {"custom_name": "Hijacked"}, format="json"
                )
                self.assertIn(r.status_code, (403, 404), r.data)
                self.assertEqual(PartnerServiceConfig.objects.get(pk=self.b_config.pk).custom_name, "B private name")

    def test_selector_never_returns_unfiltered_rows_to_a_provider_role_account(self):
        from organizations.models import Branch
        from payment.models import Payment

        self._order_for(self.customer, self.simple)
        lone = CustomUser.objects.create_user(
            email="rc-lone-provider@example.com", password="Password@123", full_name="Lone Provider",
            phone="0795558001", role=CustomUser.Role.PROVIDER,
        )
        tenant = CustomUser.objects.create_user(
            email="rc-tenant-provider@example.com", password="Password@123", full_name="Tenant Provider",
            phone="0795558002", role=CustomUser.Role.PROVIDER,
        )
        OrganizationMembership.objects.create(user=tenant, organization=self.partner_a, role=Role.PARTNER_ADMIN)
        for user in (lone, tenant):
            self.assertFalse(
                enforce_organization_scope(Order.objects.all(), user=user).exclude(organization=self.partner_a).exists(),
                f"{user.email}: orders",
            )
            self.assertFalse(
                enforce_organization_scope(Branch.objects.all(), user=user).filter(organization=self.partner_b).exists(),
                f"{user.email}: branches",
            )
            self.assertFalse(
                enforce_organization_scope(Payment.objects.all(), user=user).exclude(organization=self.partner_a).exists(),
                f"{user.email}: payments",
            )


class PredeployReadOnlyCommandTests(AccountManagementBoundaryBase):
    """The two pre-deployment review commands report correctly and change nothing."""

    def _snapshot(self):
        return (
            list(CustomUser.objects.order_by("pk").values_list("pk", "email", "password", "is_active", "role", "token_version")),
            list(OrganizationMembership.objects.order_by("pk").values_list("pk", "user_id", "role", "is_active", "is_deleted")),
        )

    def _run(self, name, *args):
        from io import StringIO

        from django.core.management import call_command

        out = StringIO()
        call_command(name, *args, stdout=out)
        return out.getvalue()

    def test_access_review_classifies_without_changing_anything(self):
        from accounts.management.commands.audit_access_review import Command

        OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=False)
        provider_staff = CustomUser.objects.create_user(
            email="rc-prov-staff@example.com", password="Password@123", full_name="Prov Staff",
            phone="0795559001", role=CustomUser.Role.PROVIDER,
        )
        OrganizationMembership.objects.create(user=provider_staff, organization=self.partner_a, role=Role.PARTNER_EMPLOYEE)
        before = self._snapshot()
        groups = {key: {u.email for u in users} for key, users in Command().classify().items()}
        self.assertIn(self.a_employee.email, groups["LOSES_ACCESS"])
        self.assertIn(self.internal_employee.email, groups["UNSCOPED_INTERNAL_STAFF"])
        self.assertIn(provider_staff.email, groups["PROVIDER_ROLE_PARTNER_STAFF"])
        everyone = set().union(*groups.values())
        for unaffected in (self.platform_support, self.platform_admin_member, self.partner_admin, self.b_employee,
                           self.legacy_admin, self.superuser, self.customer):
            self.assertNotIn(unaffected.email, everyone, unaffected.email)

        output = self._run("audit_access_review", "--mask-emails")
        self.assertIn("LOSES_ACCESS: 1", output)
        self.assertNotIn(self.a_employee.email, output)
        self.assertIn("Partner A", output)
        self.assertEqual(self._snapshot(), before)

        from django.core.management.base import CommandError

        with self.assertRaises(CommandError):
            self._run("audit_access_review", "--counts-only", "--fail-on-findings")

    def test_access_review_group_matches_real_access(self):
        """Everyone in LOSES_ACCESS really reads nothing; unscoped internal staff still read."""
        OrganizationMembership.objects.filter(user=self.a_employee).update(is_active=False)
        from accounts.management.commands.audit_access_review import Command

        groups = Command().classify()
        for user in groups["LOSES_ACCESS"]:
            self.assertFalse(self._reads_foreign_order(user), user.email)
        for user in groups["UNSCOPED_INTERNAL_STAFF"]:
            self.assertTrue(self._reads_foreign_order(user), user.email)

    def test_demo_account_check_reports_without_passwords_or_changes(self):
        from pathlib import Path

        from django.conf import settings
        from django.core.management.base import CommandError

        from accounts.management.commands.audit_demo_accounts import published_identities

        published = published_identities()
        output = self._run("audit_demo_accounts")
        self.assertIn("admin@khalisni.local: exists=no", output)

        demo_admin = CustomUser.objects.create_superuser(
            email="admin@khalisni.local", password=published["admin@khalisni.local"], full_name="Demo Admin",
            phone="0795559101",
        )
        rotated = CustomUser.objects.create_user(
            email="customer@khalisni.local", password="R0tated!Elsewhere9", full_name="Demo Customer",
            phone="0795559102", role=CustomUser.Role.CUSTOMER, is_active=False,
        )
        before = self._snapshot()
        output = self._run("audit_demo_accounts")
        self.assertIn("admin@khalisni.local: exists=yes", output)
        self.assertIn("superuser=True", output)
        self.assertIn("published_password_works=True", output)
        self.assertIn("customer@khalisni.local: exists=yes", output)
        self.assertIn("can_sign_in=False", output)
        for secret in set(published.values()) | {"R0tated!Elsewhere9", demo_admin.password, rotated.password}:
            self.assertNotIn(secret, output)
        self.assertEqual(self._snapshot(), before)
        with self.assertRaises(CommandError):
            self._run("audit_demo_accounts", "--fail-on-findings")

        csv_path = Path(settings.BASE_DIR).parent / "docs" / "demo_seed_accounts.csv"
        if csv_path.exists():
            import csv

            with csv_path.open(encoding="utf-8") as handle:
                listed = {row["email"].strip().lower() for row in csv.DictReader(handle)}
            self.assertLessEqual(listed, set(published), "docs/demo_seed_accounts.csv lists an identity the check does not cover")
