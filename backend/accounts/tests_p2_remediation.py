"""Regression tests for the P2 objective remediation: U04/B04, B10-8 and D03 (password emails)."""

import re
from pathlib import Path
from unittest import skipUnless

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import CustomUser, PasswordResetToken
from accounts.validators import phone_number_error

REGISTER_URL = "/api/auth/register/"
STRONG_PASSWORD = "Khalsni-Reg-2026!"
FRONTEND_PASSWORD_POLICY = Path(settings.BASE_DIR).parent / "frontend" / "src" / "utils" / "passwordPolicy.js"


def payload(**overrides):
    data = {"full_name": "عميل جديد", "email": "new-customer@example.test", "phone": "0791234567", "password": STRONG_PASSWORD}
    data.update(overrides)
    return {key: value for key, value in data.items() if value is not None}


class UnthrottledAuthMixin:
    """These tests send many auth requests; the throttle itself is covered in accounts.tests."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self._original_throttle_rates = dict(ScopedRateThrottle.THROTTLE_RATES)
        ScopedRateThrottle.THROTTLE_RATES = {
            **ScopedRateThrottle.THROTTLE_RATES,
            "auth_register": "1000/minute",
            "auth_password_reset": "1000/minute",
        }

    def tearDown(self):
        ScopedRateThrottle.THROTTLE_RATES = self._original_throttle_rates
        cache.clear()
        super().tearDown()


class RegistrationValidationTests(UnthrottledAuthMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

    def register(self, data, language="ar"):
        return self.client.post(REGISTER_URL, data, format="json", HTTP_ACCEPT_LANGUAGE=language)

    # 1. missing phone -> 400, never 500
    def test_missing_phone_is_a_structured_400(self):
        response = self.register(payload(phone=None))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["phone"], ["رقم الهاتف مطلوب."])
        self.assertFalse(CustomUser.objects.filter(email="new-customer@example.test").exists())

    def test_missing_phone_message_follows_screen_language(self):
        response = self.register(payload(phone=None), language="en")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["phone"], ["Phone number is required."])

    # 2. blank phone -> 400
    def test_blank_and_whitespace_phone_rejected(self):
        for value in ("", "   "):
            with self.subTest(value=value):
                response = self.register(payload(phone=value))
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("phone", response.data)
        self.assertFalse(CustomUser.objects.filter(email="new-customer@example.test").exists())

    # 3. malformed phone -> 400
    def test_malformed_phone_rejected(self):
        for value in ("abc", "079-abc-1234", "1234567", "+", "++962791234567", "0791234567890123", "07912345 67x"):
            with self.subTest(value=value):
                response = self.register(payload(phone=value))
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
                self.assertIn("0791234567", response.data["phone"][0])  # the example is part of the guidance
        self.assertEqual(CustomUser.objects.filter(email="new-customer@example.test").count(), 0)

    # 4. valid phone -> accepted
    def test_valid_local_and_international_phones_accepted(self):
        for index, value in enumerate(("0791234567", "+962 79 123 4567", "00962-78-1234567", "(06) 5512345")):
            with self.subTest(value=value):
                response = self.register(payload(phone=value, email=f"ok-{index}@example.test"))
                self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
                user = CustomUser.objects.get(email=f"ok-{index}@example.test")
                self.assertEqual(user.phone, value)
                self.assertEqual(user.role, CustomUser.Role.CUSTOMER)

    def test_canonical_validator_rule(self):
        self.assertEqual(phone_number_error(""), "required")
        self.assertEqual(phone_number_error("abc"), "invalid")
        self.assertEqual(phone_number_error("+9627912345678901"), "invalid")  # 16 digits
        self.assertIsNone(phone_number_error("+962791234567"))

    # 5. duplicate email -> localized safe validation
    def test_duplicate_email_message_is_customer_facing(self):
        self.assertEqual(self.register(payload()).status_code, status.HTTP_201_CREATED)
        arabic = self.register(payload(phone="0791111111"))
        english = self.register(payload(phone="0792222222"), language="en")
        self.assertEqual(arabic.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(english.status_code, status.HTTP_400_BAD_REQUEST)
        for response in (arabic, english):
            text = " ".join(response.data["email"])
            self.assertNotIn("User", text)
            self.assertNotIn("النموذج", text)
        self.assertIn("نسيت كلمة المرور", arabic.data["email"][0])
        self.assertIn("Forgot password", english.data["email"][0])
        self.assertEqual(CustomUser.objects.filter(email="new-customer@example.test").count(), 1)

    def test_duplicate_email_detected_after_normalisation_and_for_soft_deleted_accounts(self):
        self.assertEqual(self.register(payload()).status_code, status.HTTP_201_CREATED)
        response = self.register(payload(email="new-customer@EXAMPLE.TEST", phone="0791111111"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        CustomUser.objects.filter(email="new-customer@example.test").update(is_deleted=True)
        response = self.register(payload(phone="0793333333"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_duplicate_phone_message_is_customer_facing(self):
        self.assertEqual(self.register(payload()).status_code, status.HTTP_201_CREATED)
        response = self.register(payload(email="other@example.test"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("User", response.data["phone"][0])
        self.assertIn("مستخدم في حساب آخر", response.data["phone"][0])

    def test_password_validator_messages_follow_screen_language(self):
        arabic = self.register(payload(password="12345678"))
        english = self.register(payload(password="12345678", email="en@example.test", phone="0794444444"), language="en")
        self.assertEqual(arabic.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("كلمة المرور هذه تتكون من أرقام فقط.", arabic.data["password"])
        self.assertIn("This password is entirely numeric.", english.data["password"])

    def test_profile_phone_change_uses_the_same_rule(self):
        user = CustomUser.objects.create_user(email="profile@example.test", password=STRONG_PASSWORD, full_name="P",
                                              phone="0795555555", role=CustomUser.Role.CUSTOMER)
        self.client.force_authenticate(user)
        response = self.client.patch("/api/customer/profile/", {"phone": "abc", "current_password": STRONG_PASSWORD}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        user.refresh_from_db()
        self.assertEqual(user.phone, "0795555555")


class PasswordGuidanceTests(APITestCase):
    # 6. password guidance matches configured backend validators
    @skipUnless(FRONTEND_PASSWORD_POLICY.exists(), "frontend sources not present")
    def test_frontend_guidance_names_every_configured_validator(self):
        source = FRONTEND_PASSWORD_POLICY.read_text(encoding="utf-8")
        configured = [entry["NAME"].rsplit(".", 1)[-1] for entry in settings.AUTH_PASSWORD_VALIDATORS]
        documented = re.findall(r"validator:\s*'(\w+)'", source)
        self.assertEqual(sorted(documented), sorted(configured))
        minimum = next(
            (entry.get("OPTIONS", {}).get("min_length", 8) for entry in settings.AUTH_PASSWORD_VALIDATORS
             if entry["NAME"].endswith("MinimumLengthValidator")),
            None,
        )
        self.assertIn(f"PASSWORD_MIN_LENGTH = {minimum}", source)


class UserVerificationFieldsTests(APITestCase):
    # 11-13 (API side): active and the verification facts are separate fields.
    def test_admin_users_api_reports_active_and_each_verification_flag(self):
        admin = CustomUser.objects.create_user(email="admin-p2@example.test", password=STRONG_PASSWORD, full_name="Admin",
                                               role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        CustomUser.objects.create_user(email="active-unverified@example.test", password=STRONG_PASSWORD, full_name="A",
                                       phone="0796666666", role=CustomUser.Role.CUSTOMER)
        CustomUser.objects.create_user(email="inactive@example.test", password=STRONG_PASSWORD, full_name="B",
                                       phone="0797777777", role=CustomUser.Role.CUSTOMER, is_active=False,
                                       is_email_verified=True)
        client = APIClient()
        client.force_authenticate(admin)
        response = client.get("/api/admin/users/?page_size=100")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = {row["email"]: row for row in response.data.get("results", response.data)}
        active = rows["active-unverified@example.test"]
        self.assertEqual((active["is_active"], active["is_verified"], active["is_email_verified"], active["is_phone_verified"]),
                         (True, False, False, False))
        inactive = rows["inactive@example.test"]
        self.assertEqual((inactive["is_active"], inactive["is_email_verified"]), (False, True))

    def test_verification_flags_cannot_be_set_from_the_admin_users_api(self):
        admin = CustomUser.objects.create_user(email="admin-p2b@example.test", password=STRONG_PASSWORD, full_name="Admin",
                                               role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        target = CustomUser.objects.create_user(email="target@example.test", password=STRONG_PASSWORD, full_name="T",
                                                phone="0798888888", role=CustomUser.Role.EMPLOYEE)
        client = APIClient()
        client.force_authenticate(admin)
        client.patch(f"/api/admin/users/{target.pk}/", {"is_email_verified": True, "is_phone_verified": True}, format="json")
        target.refresh_from_db()
        self.assertFalse(target.is_email_verified)
        self.assertFalse(target.is_phone_verified)


@override_settings(
    PASSWORD_RESET_EMAIL_ASYNC=False,
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_BASE_URL="https://app.example.test",
)
class PasswordEmailLanguageTests(UnthrottledAuthMixin, APITestCase):
    def setUp(self):
        super().setUp()
        self.user = CustomUser.objects.create_user(email="reset@example.test", password=STRONG_PASSWORD, full_name="سارة",
                                                   phone="0799999999", role=CustomUser.Role.CUSTOMER)

    def forgot(self, language):
        mail.outbox = []
        response = APIClient().post("/api/auth/forgot-password/", {"email": self.user.email}, format="json",
                                    HTTP_ACCEPT_LANGUAGE=language)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        return mail.outbox[0]

    # 17. password reset email Arabic
    def test_reset_email_in_arabic(self):
        message = self.forgot("ar")
        self.assertEqual(message.subject, "إعادة تعيين كلمة المرور في خلّصني")
        self.assertIn("إعادة تعيين كلمة المرور", message.body)
        self.assertIn("https://app.example.test/reset-password/", message.body)
        self.assertIn("سارة", message.body)
        self.assertNotIn("We received", message.body)
        self.assertNotIn("&amp;", message.body)

    # 18. password reset email English
    def test_reset_email_in_english(self):
        message = self.forgot("en-US,en;q=0.9")
        self.assertEqual(message.subject, "Khalsni password reset")
        self.assertIn("We received a request to reset your Khalsni password.", message.body)
        self.assertIn("https://app.example.test/reset-password/", message.body)

    def test_reset_email_without_a_language_keeps_the_previous_english_text(self):
        mail.outbox = []
        APIClient().post("/api/auth/forgot-password/", {"email": self.user.email}, format="json")
        self.assertEqual(mail.outbox[0].subject, "Khalsni password reset")

    def test_password_changed_email_follows_the_reset_request_language(self):
        for language, subject, phrase in (
            ("ar", "تم تغيير كلمة المرور في خلّصني", "تم تغيير كلمة المرور"),
            ("en", "Khalsni password changed", "Your Khalsni password was changed successfully."),
        ):
            with self.subTest(language=language):
                reset_message = self.forgot(language)
                token = re.search(r"/reset-password/(\S+)", reset_message.body).group(1)
                mail.outbox = []
                new_password = f"Khalsni-New-{language}-2026!"
                with self.captureOnCommitCallbacks(execute=True):
                    response = APIClient().post(
                        f"/api/auth/reset-password/{token}/",
                        {"new_password": new_password, "confirm_new_password": new_password},
                        format="json",
                        HTTP_ACCEPT_LANGUAGE=language,
                    )
                self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
                self.assertEqual(len(mail.outbox), 1)
                self.assertEqual(mail.outbox[0].subject, subject)
                self.assertIn(phrase, mail.outbox[0].body)
                PasswordResetToken.objects.all().delete()
