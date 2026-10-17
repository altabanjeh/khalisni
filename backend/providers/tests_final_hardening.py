"""Final pre-release hardening: provider creation must never answer 500."""

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from providers.models import ProviderProfile


class ProviderCreateValidationTests(APITestCase):
    def setUp(self):
        self.client = APIClient(raise_request_exception=False)
        self.admin = CustomUser.objects.create_user(
            email="admin-final@example.com",
            password="Password@123",
            full_name="Admin",
            phone="0791110001",
            role=CustomUser.Role.ADMIN,
        )
        self.employee = CustomUser.objects.create_user(
            email="employee-final@example.com",
            password="Password@123",
            full_name="Employee",
            phone="0791110002",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.client.force_authenticate(self.admin)

    def payload(self, **overrides):
        data = {
            "full_name": "New Provider",
            "email": "new-provider@example.com",
            "phone": "0791110003",
            "password": "Provider@Strong-2026",
            "provider_type": "Agent",
            "city": "Amman",
        }
        data.update(overrides)
        return {key: value for key, value in data.items() if value is not None}

    def post(self, data, fmt="json"):
        return self.client.post("/api/admin/providers/", data, format=fmt)

    def test_create_without_password_is_a_structured_400(self):
        response = self.post(self.payload(password=None))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertIn("password", response.json())
        self.assertFalse(CustomUser.objects.filter(email="new-provider@example.com").exists())

    def test_blank_password_is_a_structured_400(self):
        for blank in ("", "   "):
            response = self.post(self.payload(password=blank))
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, (blank, response.content))
            self.assertIn("password", response.json())
        self.assertFalse(CustomUser.objects.filter(email="new-provider@example.com").exists())

    def test_weak_password_is_refused_by_the_password_validators(self):
        response = self.post(self.payload(password="123"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertIn("password", response.json())

    def test_valid_create_succeeds_and_the_password_works(self):
        response = self.post(self.payload())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        self.assertNotIn("password", response.json())
        user = CustomUser.objects.get(email="new-provider@example.com")
        self.assertEqual(user.role, CustomUser.Role.PROVIDER)
        self.assertEqual(user.phone, "+962791110003")
        self.assertTrue(user.check_password("Provider@Strong-2026"))
        self.assertTrue(ProviderProfile.objects.filter(user=user).exists())

    def test_update_without_a_new_password_is_allowed_and_keeps_the_password(self):
        created = self.post(self.payload()).json()
        response = self.client.patch(f"/api/admin/providers/{created['id']}/", {"city": "Irbid"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        user = CustomUser.objects.get(email="new-provider@example.com")
        self.assertEqual(user.provider_profile.city, "Irbid")
        self.assertTrue(user.check_password("Provider@Strong-2026"))
        full = self.client.put(
            f"/api/admin/providers/{created['id']}/",
            self.payload(password=None, city="Zarqa"),
            format="json",
        )
        self.assertEqual(full.status_code, status.HTTP_200_OK, full.content)

    def test_duplicate_email_is_a_400_not_an_integrity_error(self):
        self.assertEqual(self.post(self.payload()).status_code, status.HTTP_201_CREATED)
        response = self.post(self.payload(phone="0791110009"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.content)
        self.assertIn("email", response.json())

    def test_malformed_payloads_never_answer_500(self):
        cases = [
            {},
            {"password": "Provider@Strong-2026"},
            self.payload(full_name=None),
            self.payload(email=None),
            self.payload(phone=None),
            self.payload(email="not-an-email"),
            self.payload(phone="abc"),
            self.payload(password=["a", "b"]),
            self.payload(full_name={"x": 1}),
            self.payload(service_category_ids="nope"),
            self.payload(service_category_ids=[999999]),
            self.payload(account_active="maybe"),
            self.payload(provider_type="x" * 500),
        ]
        for case in cases:
            response = self.post(case)
            self.assertLess(response.status_code, 500, (case, response.content[:300]))
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, (case, response.content[:300]))
        for raw in ("[]", '"text"', "{bad json", "null"):
            response = self.client.post("/api/admin/providers/", raw, content_type="application/json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, (raw, response.content[:300]))
        self.assertFalse(CustomUser.objects.filter(role=CustomUser.Role.PROVIDER).exists())

    def test_permissions_are_unchanged_employee_cannot_create(self):
        self.client.force_authenticate(self.employee)
        response = self.post(self.payload())
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_405_METHOD_NOT_ALLOWED))
        self.client.force_authenticate(None)
        self.assertEqual(self.post(self.payload()).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(CustomUser.objects.filter(email="new-provider@example.com").exists())
