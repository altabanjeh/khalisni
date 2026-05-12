from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import CustomUser
from public_site.models import Advertisement, PublicPageContent, SiteTheme


class PublicSiteAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = CustomUser.objects.create_user(
            email="public-site-admin@example.com",
            password="Password@123",
            full_name="Public Site Admin",
            phone="0791234500",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.employee_user = CustomUser.objects.create_user(
            email="public-site-employee@example.com",
            password="Password@123",
            full_name="Public Site Employee",
            phone="0791234501",
            role=CustomUser.Role.EMPLOYEE,
        )

    def test_public_advertisements_endpoint_returns_only_current_active_ads(self):
        now = timezone.now()
        visible = Advertisement.objects.create(
            title_ar="Visible",
            description_ar="Visible description",
            advertisement_type=Advertisement.Type.GENERAL,
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(days=1),
            is_active=True,
        )
        Advertisement.objects.create(
            title_ar="Future",
            description_ar="Future description",
            advertisement_type=Advertisement.Type.GENERAL,
            start_date=now + timedelta(days=1),
            end_date=now + timedelta(days=2),
            is_active=True,
        )

        response = self.client.get("/api/public-site/advertisements/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["advertisement_id"], visible.pk)

    def test_active_theme_endpoint_returns_active_theme(self):
        SiteTheme.objects.create(
            name="Inactive Theme",
            primary_color="#111111",
            secondary_color="#222222",
            background_color="#ffffff",
            text_color="#000000",
            header_background_color="#ffffff",
            footer_background_color="#000000",
            active_theme=False,
        )
        active_theme = SiteTheme.objects.create(
            name="Active Theme",
            primary_color="#0b67b2",
            secondary_color="#147fd1",
            background_color="#f4faff",
            text_color="#0f3554",
            header_background_color="#ffffff",
            footer_background_color="#0f3554",
            active_theme=True,
        )

        response = self.client.get("/api/public-site/theme/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["theme_id"], active_theme.pk)
        self.assertTrue(response.data["active_theme"])

    def test_only_admin_can_write_public_site_content(self):
        PublicPageContent.objects.create(
            version_name="Main Content",
            hero_title_ar="عنوان",
            hero_title_en="Title",
            hero_subtitle_ar="نص",
            hero_subtitle_en="Text",
            primary_button_text="ابدأ",
            primary_button_url="/create-order",
            secondary_button_text="تتبع",
            secondary_button_url="/track-order",
            how_it_works_text="الخطوات",
            contact_phone="+962790000000",
            whatsapp_number="+962790000000",
            email="info@example.com",
            office_address="Amman",
            footer_text="Footer",
            active_content=True,
        )

        payload = {
            "version_name": "Updated Content",
            "hero_title_ar": "عنوان محدث",
            "hero_title_en": "Updated Title",
            "hero_subtitle_ar": "نص محدث",
            "hero_subtitle_en": "Updated text",
            "primary_button_text": "ابدأ الآن",
            "primary_button_url": "/create-order",
            "secondary_button_text": "تتبع طلبك",
            "secondary_button_url": "/track-order",
            "how_it_works_text": "خطوات محدثة",
            "contact_phone": "+962790000000",
            "whatsapp_number": "+962790000000",
            "email": "hello@example.com",
            "office_address": "Amman",
            "footer_text": "Updated footer",
            "active_content": True,
        }

        self.client.force_authenticate(self.employee_user)
        forbidden_response = self.client.put("/api/admin/public-site/content/", payload, format="json")
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.admin_user)
        allowed_response = self.client.put("/api/admin/public-site/content/", payload, format="json")
        self.assertEqual(allowed_response.status_code, status.HTTP_200_OK)
        self.assertEqual(allowed_response.data["version_name"], "Updated Content")

    def test_expired_advertisements_are_not_shown_publicly(self):
        now = timezone.now()
        Advertisement.objects.create(
            title_ar="Expired",
            description_ar="Expired description",
            advertisement_type=Advertisement.Type.OFFER,
            start_date=now - timedelta(days=2),
            end_date=now - timedelta(hours=1),
            is_active=True,
        )

        response = self.client.get("/api/public-site/advertisements/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_inactive_advertisements_are_not_shown_publicly(self):
        now = timezone.now()
        Advertisement.objects.create(
            title_ar="Inactive",
            description_ar="Inactive description",
            advertisement_type=Advertisement.Type.GENERAL,
            start_date=now - timedelta(hours=1),
            end_date=now + timedelta(days=1),
            is_active=False,
        )

        response = self.client.get("/api/public-site/advertisements/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
