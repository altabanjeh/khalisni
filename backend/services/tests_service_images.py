"""Extra coverage for the managed service-image feature:

* oversized upload is rejected
* non-privileged users cannot modify a service image
* the upload pipeline re-encodes / down-scales large images (sanitisation + perf)
* the public API exposes a cache-busting image URL and stays valid with no image
* ``seed_service_images`` assigns images and is idempotent
"""
import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from services.models import Service, ServiceCategory

try:
    from PIL import Image

    _PIL = True
except Exception:  # pragma: no cover
    _PIL = False


def _jpeg(width=200, height=200, name="photo.jpg"):
    buf = io.BytesIO()
    Image.new("RGB", (width, height), (10, 107, 185)).save(buf, format="JPEG", quality=90)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


@override_settings(SECURE_SSL_REDIRECT=False)
class ServiceImagePipelineTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.media_root = tempfile.mkdtemp()
        self._ov = override_settings(MEDIA_ROOT=self.media_root)
        self._ov.enable()

        self.admin = CustomUser.objects.create_user(
            email="svc-img-admin@example.com", password="Password@123",
            full_name="Img Admin", phone="0794050001",
            role=CustomUser.Role.ADMIN, is_staff=True,
        )
        self.customer = CustomUser.objects.create_user(
            email="svc-img-customer@example.com", password="Password@123",
            full_name="Img Customer", phone="0794050002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.category = ServiceCategory.objects.create(
            name_ar="فئة الصور", name_en="Image Category", slug="img-pipeline-category",
            show_on_public_site=True, is_active=True,
        )
        self.service = Service.objects.create(
            category=self.category, name_ar="خدمة الصور", name_en="Image Service",
            slug="img-pipeline-service", description_ar="تفاصيل", estimated_duration=1,
            base_price=1, government_fee=1, service_fee=1,
            show_on_public_site=True, is_active=True,
        )

    def tearDown(self):
        self._ov.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    # -- validation ---------------------------------------------------------
    def test_oversized_image_is_rejected(self):
        self.client.force_authenticate(self.admin)
        big = SimpleUploadedFile("big.jpg", b"\xff\xd8\xff" + b"0" * (6 * 1024 * 1024), content_type="image/jpeg")
        resp = self.client.patch(f"/api/admin/services/{self.service.id}/", {"image": big}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", resp.data)
        self.service.refresh_from_db()
        self.assertFalse(self.service.image)

    def test_executable_disguised_as_image_is_rejected(self):
        self.client.force_authenticate(self.admin)
        bad = SimpleUploadedFile("payload.jpg", b"MZ\x90\x00\x03 not really an image", content_type="image/jpeg")
        resp = self.client.patch(f"/api/admin/services/{self.service.id}/", {"image": bad}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # -- authorization ----------------------------------------------------
    def test_customer_cannot_modify_service_image(self):
        self.client.force_authenticate(self.customer)
        resp = self.client.patch(
            f"/api/admin/services/{self.service.id}/",
            {"image": _jpeg()} if _PIL else {"clear_image": True},
            format="multipart",
        )
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_anonymous_cannot_modify_service_image(self):
        resp = self.client.patch(f"/api/admin/services/{self.service.id}/", {"clear_image": True}, format="json")
        self.assertIn(resp.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    # -- pipeline -------------------------------------------------------
    def test_large_image_is_downscaled_and_reencoded(self):
        if not _PIL:
            self.skipTest("Pillow not installed")
        self.client.force_authenticate(self.admin)
        resp = self.client.patch(
            f"/api/admin/services/{self.service.id}/",
            {"image": _jpeg(4000, 3000, "huge.jpg")},
            format="multipart",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        with self.service.image.open("rb") as fh:
            stored = Image.open(fh)
            stored.load()
        self.assertLessEqual(max(stored.size), 1600)

    def test_public_image_url_is_cache_busted(self):
        if not _PIL:
            self.skipTest("Pillow not installed")
        self.client.force_authenticate(self.admin)
        self.client.patch(
            f"/api/admin/services/{self.service.id}/", {"image": _jpeg(name="v.jpg")}, format="multipart"
        )
        detail = self.client.get(f"/api/services/{self.service.slug}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertRegex(detail.data["image_url"], r"/media/services/images/.+\?v=\d+")

    def test_service_without_image_serialises_safely(self):
        detail = self.client.get(f"/api/services/{self.service.slug}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["image_url"], "")
        self.assertIn("image", detail.data)


@override_settings(SECURE_SSL_REDIRECT=False)
class SeedServiceImagesCommandTests(APITestCase):
    def setUp(self):
        self.media_root = tempfile.mkdtemp()
        self._ov = override_settings(MEDIA_ROOT=self.media_root)
        self._ov.enable()
        self.category = ServiceCategory.objects.create(
            name_ar="العقارات والأراضي", name_en="Land and Survey", slug="land-and-survey",
            show_on_public_site=True, is_active=True,
        )
        self.mapped = Service.objects.create(
            category=self.category, name_ar="طلب سند تسجيل", name_en="Request Property Registration Certificate",
            slug="request-property-registration-certificate", description_ar="تفاصيل",
            estimated_duration=1, base_price=1, government_fee=1, service_fee=1,
            show_on_public_site=True, is_active=True,
        )
        self.unmapped = Service.objects.create(
            category=self.category, name_ar="خدمة أرض جديدة", name_en="Brand New Land Service",
            slug="brand-new-land-service-xyz", description_ar="تفاصيل",
            estimated_duration=1, base_price=1, government_fee=1, service_fee=1,
            show_on_public_site=True, is_active=True,
        )

    def tearDown(self):
        self._ov.disable()
        shutil.rmtree(self.media_root, ignore_errors=True)

    def test_seed_assigns_then_is_idempotent(self):
        call_command("seed_service_images", verbosity=0)
        self.mapped.refresh_from_db()
        self.unmapped.refresh_from_db()
        # exact slug asset
        self.assertTrue(self.mapped.image)
        self.assertIn("services/images/", self.mapped.image.name)
        # category fallback still yields an image
        self.assertTrue(self.unmapped.image)

        first_name = self.mapped.image.name
        call_command("seed_service_images", verbosity=0)
        self.mapped.refresh_from_db()
        self.assertEqual(self.mapped.image.name, first_name)  # unchanged on re-run

    def test_seed_force_overwrites(self):
        call_command("seed_service_images", verbosity=0)
        self.mapped.refresh_from_db()
        original = self.mapped.image.name
        call_command("seed_service_images", "--force", verbosity=0)
        self.mapped.refresh_from_db()
        self.assertTrue(self.mapped.image)
        self.assertNotEqual(self.mapped.image.name, original)
