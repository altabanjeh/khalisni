"""Regression tests for security remediation defects D3 and D4."""

import inspect

from django.test import SimpleTestCase, TestCase
from rest_framework.test import APIClient

from accounts.models import CustomUser


class DebugDefaultTests(SimpleTestCase):
    """Defect D3: DEBUG must default to False when DJANGO_DEBUG is unset."""

    def test_get_bool_env_missing_key_returns_default(self):
        from config.settings import _get_bool_env

        self.assertFalse(_get_bool_env("KHALSNI_DEFINITELY_UNSET_VAR", False))
        self.assertTrue(_get_bool_env("KHALSNI_DEFINITELY_UNSET_VAR", True))

    def test_settings_source_defaults_debug_to_false(self):
        import config.settings as settings_module

        source = inspect.getsource(settings_module)
        self.assertIn('_get_bool_env("DJANGO_DEBUG", False)', source)
        # Security headers must be derived from `not DEBUG`, never hardcoded on.
        self.assertIn('_get_bool_env("DJANGO_SECURE_SSL_REDIRECT", not DEBUG)', source)


class TokenVersionRevocationTests(TestCase):
    """Defect D4: password reset / logout-all invalidate outstanding JWTs."""

    def setUp(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            email="tokver-customer@example.com",
            password="Password@123",
            full_name="Token Version Customer",
            phone="0796000123",
            role=CustomUser.Role.CUSTOMER,
        )

    def _login(self):
        response = self.client.post(
            "/api/auth/login/",
            {"email": self.user.email, "password": "Password@123"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        return response.data["access"], response.data["refresh"]

    def test_access_token_carries_token_version_claim(self):
        from rest_framework_simplejwt.tokens import AccessToken

        access, _ = self._login()
        decoded = AccessToken(access)
        self.assertEqual(decoded["token_version"], self.user.token_version)

    def test_logout_all_devices_revokes_existing_access_token(self):
        access, refresh = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        ok = self.client.get("/api/auth/me/")
        self.assertEqual(ok.status_code, 200)

        logout = self.client.post("/api/auth/logout/", {"refresh": refresh, "all_devices": True}, format="json")
        self.assertEqual(logout.status_code, 204)

        self.user.refresh_from_db()
        self.assertEqual(self.user.token_version, 2)

        # The previously valid access token must now be rejected.
        revoked = self.client.get("/api/auth/me/")
        self.assertEqual(revoked.status_code, 401)

    def test_plain_logout_does_not_bump_token_version(self):
        access, refresh = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.client.post("/api/auth/logout/", {"refresh": refresh}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.token_version, 1)
