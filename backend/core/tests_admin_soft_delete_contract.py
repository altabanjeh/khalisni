"""SD-MOB: the delete / restore contract the web and mobile admin screens share.

Lists hide deleted rows unless ``include_deleted`` is set (paginated services
and users also narrow ``is_deleted`` on the server), DELETE carries
``delete_password`` + ``delete_reason`` in the body, ``restore`` undoes it,
and guard errors come back in Arabic for ``Accept-Language: ar``.
"""

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from public_site.models import Advertisement
from services.models import Service, ServiceCategory

PASSWORD = "Password@123"


def first_message(value):
    return str(value[0] if isinstance(value, list) else value)


class AdminSoftDeleteContractTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="sd-mob-admin@example.com",
            password=PASSWORD,
            full_name="SD Admin",
            phone="0795100001",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.employee = CustomUser.objects.create_user(
            email="sd-mob-employee@example.com",
            password=PASSWORD,
            full_name="SD Employee",
            phone="0795100002",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.target = CustomUser.objects.create_user(
            email="sd-mob-target@example.com",
            password=PASSWORD,
            full_name="SD Target",
            phone="0795100003",
            role=CustomUser.Role.PROVIDER,
        )
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="sd-mob-category")
        self.service = Service.objects.create(
            category=category, name_ar="خدمة للحذف", name_en="Delete me", slug="sd-mob-service",
            description_ar="تفاصيل", base_price=10, government_fee=1, service_fee=2, estimated_duration=1,
        )
        self.ad = Advertisement.objects.create(title_ar="إعلان للحذف", description_ar="وصف", is_active=True)

    def _delete(self, url, **body):
        return self.client.delete(url, body, format="json", HTTP_ACCEPT_LANGUAGE="ar")

    def test_advertisement_delete_keeps_reason_and_restore_brings_it_back(self):
        self.client.force_authenticate(self.admin)
        url = f"/api/admin/public-site/advertisements/{self.ad.pk}/"

        response = self._delete(url, delete_password=PASSWORD, delete_reason="إعلان منتهي")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.ad.refresh_from_db()
        self.assertTrue(self.ad.is_deleted)
        self.assertEqual(self.ad.delete_reason, "إعلان منتهي")

        ids = lambda data: [row["advertisement_id"] for row in (data["results"] if isinstance(data, dict) else data)]
        self.assertNotIn(self.ad.pk, ids(self.client.get("/api/admin/public-site/advertisements/").data))
        with_deleted = self.client.get("/api/admin/public-site/advertisements/", {"include_deleted": "true"}).data
        self.assertIn(self.ad.pk, ids(with_deleted))

        restored = self.client.post(f"{url}restore/")
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.assertFalse(restored.data["is_deleted"])
        self.ad.refresh_from_db()
        self.assertFalse(self.ad.is_deleted)
        self.assertEqual(self.ad.delete_reason, "")

    def test_user_delete_keeps_reason_and_deleted_filter_narrows_on_server(self):
        self.client.force_authenticate(self.admin)
        response = self._delete(f"/api/admin/users/{self.target.pk}/", delete_password=PASSWORD, delete_reason="حساب مكرر")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.target.refresh_from_db()
        self.assertTrue(self.target.is_deleted)
        self.assertEqual(self.target.delete_reason, "حساب مكرر")

        deleted_only = self.client.get("/api/admin/users/", {"include_deleted": "true", "is_deleted": "true"}).data
        rows = deleted_only["results"] if isinstance(deleted_only, dict) else deleted_only
        self.assertEqual([row["id"] for row in rows], [self.target.pk])

        restored = self.client.post(f"/api/admin/users/{self.target.pk}/restore/")
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.target.refresh_from_db()
        self.assertFalse(self.target.is_deleted)
        self.assertTrue(self.target.is_active)

    def test_service_deleted_filter_and_restore(self):
        self.client.force_authenticate(self.admin)
        response = self._delete(f"/api/admin/services/{self.service.pk}/", delete_password=PASSWORD, delete_reason="خدمة متوقفة")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        active = self.client.get("/api/admin/services/").data
        self.assertNotIn(self.service.pk, [row["id"] for row in active["results"]])
        deleted_only = self.client.get("/api/admin/services/", {"include_deleted": "true", "is_deleted": "true"}).data
        self.assertEqual([row["id"] for row in deleted_only["results"]], [self.service.pk])
        self.service.refresh_from_db()
        self.assertEqual(self.service.delete_reason, "خدمة متوقفة")

        restored = self.client.post(f"/api/admin/services/{self.service.pk}/restore/")
        self.assertEqual(restored.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertFalse(self.service.is_deleted)

    def test_guard_errors_are_arabic_for_the_mobile_client(self):
        self.client.force_authenticate(self.admin)
        url = f"/api/admin/public-site/advertisements/{self.ad.pk}/"

        missing = self._delete(url, delete_reason="سبب")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(first_message(missing.data["delete_password"]), "أدخل كلمة مرور حسابك الإداري الحالية لتأكيد الحذف.")

        wrong = self._delete(url, delete_password="Wrong@12345", delete_reason="سبب")
        self.assertEqual(wrong.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(first_message(wrong.data["delete_password"]), "كلمة مرور حسابك الإداري غير صحيحة.")
        self.ad.refresh_from_db()
        self.assertFalse(self.ad.is_deleted)

    def test_non_admin_cannot_delete_or_restore(self):
        self.service.soft_delete(user=self.admin, reason="x")
        self.client.force_authenticate(self.employee)
        self.assertEqual(
            self._delete(f"/api/admin/users/{self.target.pk}/", delete_password=PASSWORD, delete_reason="x").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.post(f"/api/admin/services/{self.service.pk}/restore/").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            self.client.post(f"/api/admin/public-site/advertisements/{self.ad.pk}/restore/").status_code,
            status.HTTP_403_FORBIDDEN,
        )


class ServiceDeletionMetadataTests(APITestCase):
    """The services Deleted view shows the reason, time and actor to admins who may
    delete/restore; catalogue managers (support) reading the same list do not get them."""

    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            email="sd-meta-admin@example.com", password=PASSWORD, full_name="مدير الحذف",
            phone="0795100011", role=CustomUser.Role.ADMIN, is_staff=True,
        )
        self.support = CustomUser.objects.create_user(
            email="sd-meta-support@example.com", password=PASSWORD, full_name="Support",
            phone="0795100012", role="support",
        )
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="sd-meta-category")
        self.deleted = Service.objects.create(category=category, name_ar="خدمة محذوفة", name_en="Deleted", slug="sd-meta-deleted", description_ar="و")
        self.live = Service.objects.create(category=category, name_ar="خدمة نشطة", name_en="Live", slug="sd-meta-live", description_ar="و")
        self.client.force_authenticate(self.admin)
        response = self.client.delete(f"/api/admin/services/{self.deleted.pk}/", {"delete_password": PASSWORD, "delete_reason": "خدمة متوقفة مؤقتاً"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_admin_sees_reason_time_and_actor(self):
        self.client.force_authenticate(self.admin)
        rows = self.client.get("/api/admin/services/", {"include_deleted": "true", "is_deleted": "true"}).data["results"]
        row = next(item for item in rows if item["id"] == self.deleted.pk)
        self.assertTrue(row["is_deleted"])
        self.assertEqual(row["delete_reason"], "خدمة متوقفة مؤقتاً")
        self.assertTrue(row["deleted_at"])
        self.assertEqual(row["deleted_by_name"], "مدير الحذف")

    def test_catalogue_manager_does_not_get_deletion_metadata(self):
        self.client.force_authenticate(self.support)
        response = self.client.get("/api/admin/services/", {"include_deleted": "true"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rows = response.data["results"]
        self.assertTrue(rows)
        for row in rows:
            for name in ("delete_reason", "deleted_at", "deleted_by_name"):
                self.assertNotIn(name, row)
