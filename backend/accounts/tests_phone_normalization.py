"""Owner phone policy: one canonical E.164 identity, Jordan (+962) as the default country."""

import json
import os
import tempfile
from io import StringIO

from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import CustomUser
from accounts.validators import normalize_phone, phone_number_error, phones_match
from orders.models import Order
from public_site.models import ContactInquiry
from services.models import Service, ServiceCategory

PASSWORD = "Strong-Pass-2026!"


class NormalizePhoneTests(SimpleTestCase):
    # Test 18
    def test_equivalent_jordan_formats_normalize_identically(self):
        for typed in ("0791234567", "079 123 4567", "+962791234567", "00962791234567", "962791234567",
                      "791234567", "079-123-4567", "(079) 123.4567", "+962 79 123 4567", "٠٧٩١٢٣٤٥٦٧"):
            self.assertEqual(normalize_phone(typed), "+962791234567", typed)

    def test_jordan_landline(self):
        self.assertEqual(normalize_phone("06 560 9000"), "+96265609000")
        self.assertEqual(normalize_phone("+962 6 560 9000"), "+96265609000")

    # Test 21
    def test_international_number_with_country_code_stays_international(self):
        self.assertEqual(normalize_phone("+44 20 7946 0958"), "+442079460958")
        self.assertEqual(normalize_phone("0044 20 7946 0958"), "+442079460958")
        self.assertEqual(normalize_phone("+1 (415) 555-2671"), "+14155552671")
        self.assertEqual(normalize_phone("+971501234567"), "+971501234567")

    # Test 23
    def test_invalid_values_are_identified(self):
        for typed in ("12", "07912345", "07912345678", "+962 79 123 45", "abc", "+0 123 456 789", "4155552671",
                      "+1234567890123456", "079 123 4567 ext 2", "<script>"):
            self.assertIsNone(normalize_phone(typed), typed)
            self.assertEqual(phone_number_error(typed), "invalid", typed)
        self.assertEqual(normalize_phone(""), "")
        self.assertEqual(phone_number_error("  "), "required")

    def test_phones_match_compares_canonical_numbers(self):
        self.assertTrue(phones_match("0791234567", "+962791234567"))
        self.assertTrue(phones_match("legacy-value", " legacy-value "))
        self.assertFalse(phones_match("0791234567", "0791234568"))
        self.assertFalse(phones_match("", ""))


class UnthrottledMixin:
    def setUp(self):
        super().setUp()
        cache.clear()
        self.addCleanup(cache.clear)
        rates = dict(ScopedRateThrottle.THROTTLE_RATES)
        self.addCleanup(setattr, ScopedRateThrottle, "THROTTLE_RATES", rates)
        ScopedRateThrottle.THROTTLE_RATES = {**rates, "auth_register": "1000/minute", "public_contact": "1000/minute"}


class PhoneIdentityApiTests(UnthrottledMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def register(self, phone, email, language="en"):
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client.post(
            "/api/auth/register/",
            {"full_name": "Phone Test", "email": email, "phone": phone, "password": PASSWORD},
            format="json",
        )

    def test_registration_stores_the_canonical_number(self):
        response = self.register("079 123 4567", "phone-a@example.test")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(CustomUser.objects.get(email="phone-a@example.test").phone, "+962791234567")

    # Test 20
    def test_duplicate_account_is_blocked_after_normalization(self):
        self.assertEqual(self.register("0791234567", "phone-a@example.test").status_code, 201)
        for variant in ("+962791234567", "00962 79 123 4567", "791234567"):
            response = self.register(variant, f"phone-{variant[-3:]}-{len(variant)}@example.test")
            self.assertEqual(response.status_code, 400, variant)
            self.assertEqual(
                response.data["phone"],
                ["This phone number is already used by another account. Sign in or use a different number."],
            )
        self.assertEqual(CustomUser.objects.filter(phone="+962791234567").count(), 1)

    def test_soft_deleted_account_still_owns_its_number(self):
        user = CustomUser.objects.create_user(email="gone@example.test", password=PASSWORD, full_name="Gone", phone="0791234567")
        user.is_deleted = True
        user.save()
        self.assertEqual(self.register("+962791234567", "phone-b@example.test").status_code, 400)

    def test_international_registration_is_kept_international(self):
        response = self.register("+44 20 7946 0958", "phone-uk@example.test")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(CustomUser.objects.get(email="phone-uk@example.test").phone, "+442079460958")

    def test_invalid_phone_is_refused_with_a_localized_message(self):
        response = self.register("4155552671", "phone-c@example.test", language="ar")
        self.assertEqual(response.status_code, 400)
        self.assertIn("رمز الدولة", response.data["phone"][0])

    def test_profile_same_number_in_another_format_is_not_a_change(self):
        user = CustomUser.objects.create_user(email="me@example.test", password=PASSWORD, full_name="Me", phone="0791234567")
        self.client.force_authenticate(user)
        response = self.client.patch("/api/customer/profile/", {"phone": "+962 79 123 4567"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertEqual(user.phone, "+962791234567")

    def test_profile_cannot_take_another_accounts_number_in_another_format(self):
        CustomUser.objects.create_user(email="owner@example.test", password=PASSWORD, full_name="Owner", phone="0791234567")
        user = CustomUser.objects.create_user(email="me@example.test", password=PASSWORD, full_name="Me", phone="0791234500")
        self.client.force_authenticate(user)
        response = self.client.patch(
            "/api/customer/profile/", {"phone": "00962791234567", "current_password": PASSWORD}, format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)

    def test_admin_user_search_finds_any_format(self):
        admin = CustomUser.objects.create_user(email="adm@example.test", password=PASSWORD, full_name="Adm",
                                               phone="0791234501", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        target = CustomUser.objects.create_user(email="target@example.test", password=PASSWORD, full_name="Target", phone="0791234567")
        self.client.force_authenticate(admin)
        for typed in ("079 123 4567", "00962791234567", "+962791234567"):
            response = self.client.get("/api/admin/users/", {"search": typed})
            self.assertEqual(response.status_code, 200)
            rows = response.data["results"] if isinstance(response.data, dict) else response.data
            self.assertIn(target.pk, [row["id"] for row in rows], typed)

    def test_admin_created_user_and_provider_phone_uniqueness_is_canonical(self):
        admin = CustomUser.objects.create_user(email="adm@example.test", password=PASSWORD, full_name="Adm",
                                               phone="0791234501", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        CustomUser.objects.create_user(email="taken@example.test", password=PASSWORD, full_name="Taken", phone="0791234567")
        self.client.force_authenticate(admin)
        provider = self.client.post(
            "/api/admin/providers/",
            {"full_name": "Prov", "email": "prov@example.test", "phone": "+962 79 123 4567", "password": PASSWORD,
             "provider_type": "Office", "city": "Amman"},
            format="json",
        )
        self.assertEqual(provider.status_code, 400, provider.data)
        self.assertIn("phone", provider.data)
        created = self.client.post(
            "/api/admin/providers/",
            {"full_name": "Prov", "email": "prov2@example.test", "phone": "0791234599", "password": PASSWORD,
             "provider_type": "Office", "city": "Amman"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(CustomUser.objects.get(email="prov2@example.test").phone, "+962791234599")

    def test_contact_inquiry_phone_is_validated_and_canonical(self):
        endpoint = "/api/public-site/contact-inquiries/"
        bad = self.client.post(endpoint, {"name": "A", "phone": "12", "message": "Hello"}, format="json")
        self.assertEqual(bad.status_code, 400)
        good = self.client.post(endpoint, {"name": "A", "phone": "079 123 4567", "message": "Hello"}, format="json")
        self.assertEqual(good.status_code, 201, good.data)
        self.assertEqual(ContactInquiry.objects.get().phone, "+962791234567")


class GuestAccountReuseTests(TestCase):
    def test_guest_reuse_finds_the_account_in_any_format(self):
        from orders.services import _get_or_create_public_customer

        existing = _get_or_create_public_customer(full_name="Guest", phone="0791234567")
        again = _get_or_create_public_customer(full_name="Guest", phone="+962 79 123 4567")
        self.assertEqual(existing.pk, again.pk)
        self.assertEqual(CustomUser.objects.filter(phone="+962791234567").count(), 1)


class NormalizePhonesCommandTests(TestCase):
    """22-23: dry run reports, apply needs confirmation, collisions are never merged."""

    def setUp(self):
        make = CustomUser.objects.create_user
        self.legacy = make(email="legacy@example.test", password=PASSWORD, full_name="Legacy", phone="0791111111")
        self.twin_a = make(email="twin-a@example.test", password=PASSWORD, full_name="Twin A", phone="0792222222")
        self.twin_b = make(email="twin-b@example.test", password=PASSWORD, full_name="Twin B", phone="0792222299")
        self.broken = make(email="broken@example.test", password=PASSWORD, full_name="Broken", phone="0793333333")
        self.done = make(email="done@example.test", password=PASSWORD, full_name="Done", phone="0794444444")
        # Put the stored values back to how legacy rows look (save() would normalize them).
        set_phone = lambda user, value: CustomUser._base_manager.filter(pk=user.pk).update(phone=value)  # noqa: E731
        set_phone(self.legacy, "079 111 1111")
        set_phone(self.twin_a, "0792222222")
        set_phone(self.twin_b, "+962 79 222 2222")
        set_phone(self.broken, "call me")
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="np-cat")
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="np-svc", description_ar="و")
        Order.objects.create(customer=self.twin_a, service=service, city="Amman")
        ContactInquiry.objects.create(name="Visitor", phone="0795555555", message="Hi")
        self.report = os.path.join(tempfile.mkdtemp(), "phones.json")

    def run_command(self, *args):
        out = StringIO()
        call_command("normalize_phones", *args, stdout=out)
        return out.getvalue()

    def phones(self):
        return dict(CustomUser._base_manager.values_list("email", "phone"))

    # Test 22
    def test_dry_run_reports_normalizations_invalid_values_and_collisions_and_changes_nothing(self):
        before = self.phones()
        output = self.run_command("--unmasked")
        self.assertEqual(self.phones(), before)
        self.assertIn("normalize  user#%d: 079 111 1111 -> +962791111111" % self.legacy.pk, output)
        self.assertIn("invalid    user#%d: call me -> -" % self.broken.pk, output)
        self.assertIn("collision  user#%d" % self.twin_a.pk, output)
        self.assertIn("orders=1", output)
        self.assertIn("collides_with=[%d]" % self.twin_b.pk, output)
        self.assertIn("normalize  contact_inquiry", output)
        self.assertIn("Dry run: nothing was changed.", output)

    def test_default_output_masks_numbers(self):
        output = self.run_command()
        self.assertNotIn("079 111 1111", output)
        self.assertNotIn("+962791111111", output)

    def test_apply_requires_explicit_confirmation_and_a_report(self):
        with self.assertRaises(CommandError):
            self.run_command("--apply")
        with self.assertRaises(CommandError):
            self.run_command("--apply", "--confirm", "NORMALIZE")
        self.assertEqual(self.phones()["legacy@example.test"], "079 111 1111")

    def test_apply_changes_only_safe_rows_and_rollback_restores_them(self):
        self.run_command("--apply", "--confirm", "NORMALIZE", "--report", self.report)
        phones = self.phones()
        self.assertEqual(phones["legacy@example.test"], "+962791111111")
        # Collisions and invalid values are left for a person; accounts are not merged.
        self.assertEqual(phones["twin-a@example.test"], "0792222222")
        self.assertEqual(phones["twin-b@example.test"], "+962 79 222 2222")
        self.assertEqual(phones["broken@example.test"], "call me")
        self.assertEqual(CustomUser._base_manager.filter(email__startswith="twin-").count(), 2)
        self.assertEqual(ContactInquiry.objects.get().phone, "+962795555555")
        with open(self.report, encoding="utf-8") as handle:
            statuses = {(row["table"], row["pk"]): row["status"] for row in json.load(handle)["rows"]}
        self.assertEqual(statuses[("user", self.twin_b.pk)], "collision")
        # Second run: idempotent.
        self.assertIn("Applied: 0", self.run_command("--apply", "--confirm", "NORMALIZE", "--report", self.report + ".2"))
        with self.assertRaises(CommandError):
            self.run_command("--rollback", self.report)
        self.run_command("--rollback", self.report, "--confirm", "RESTORE")
        self.assertEqual(self.phones()["legacy@example.test"], "079 111 1111")
        self.assertEqual(ContactInquiry.objects.get().phone, "0795555555")
