from django.conf import settings
from django.core.cache import cache
from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import CustomUser
from notifications.models import Notification
from public_site.models import Advertisement, MissingServiceRequest, PublicPageContent, SiteTheme
from services.models import Service, ServiceCategory


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
        self.support_user = CustomUser.objects.create_user(
            email="public-site-support@example.com",
            password="Password@123",
            full_name="Public Site Support",
            phone="0791234502",
            role=CustomUser.Role.SUPPORT,
        )
        self.category = ServiceCategory.objects.create(
            name_ar="خدمات عامة",
            name_en="General services",
            slug="general-services",
        )
        self.service = Service.objects.create(
            category=self.category,
            name_ar="تجديد جواز سفر",
            name_en="Passport renewal",
            slug="passport-renewal",
            description_ar="تجديد جواز السفر",
            description_en="Passport renewal",
            base_price=0,
            government_fee=0,
            service_fee=0,
            estimated_duration=3,
            is_online=True,
            provider_required=False,
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

    def test_public_missing_service_request_creates_notifications_for_admin_and_support(self):
        payload = {
            "service_name": "معاملة جديدة",
            "request_message": "أريد خدمة غير موجودة داخل التطبيق.",
            "requester_name": "عميل تجريبي",
            "requester_phone": "0795555555",
            "preferred_contact_channel": "whatsapp",
            "source": "homepage_chat",
        }

        response = self.client.post("/api/public-site/missing-service-requests/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        request_record = MissingServiceRequest.objects.get()
        self.assertTrue(request_record.request_number.startswith("MSR-"))
        self.assertEqual(
            set(Notification.objects.filter(template_key="missing_service_request_created").values_list("recipient_id", flat=True)),
            {self.admin_user.pk, self.support_user.pk},
        )

    def test_public_missing_service_request_requires_contact_for_anonymous_visitor(self):
        payload = {
            "service_name": "معاملة جديدة",
            "request_message": "أحتاج خدمة غير موجودة.",
            "source": "homepage_chat",
        }

        response = self.client.post("/api/public-site/missing-service-requests/", payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("requester_phone", response.data)

    def test_support_user_can_list_and_update_missing_service_requests(self):
        request_record = MissingServiceRequest.objects.create(
            service_name="خدمة تجريبية",
            request_message="تفاصيل الطلب",
            requester_phone="0797777777",
        )

        self.client.force_authenticate(self.support_user)
        list_response = self.client.get("/api/admin/public-site/missing-service-requests/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

        patch_response = self.client.patch(
            f"/api/admin/public-site/missing-service-requests/{request_record.pk}/",
            {
                "status": MissingServiceRequest.Status.SERVICE_EXISTS,
                "matched_service": self.service.pk,
                "response_message": "تمت مطابقة الطلب مع خدمة موجودة.",
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        request_record.refresh_from_db()
        self.assertEqual(request_record.status, MissingServiceRequest.Status.SERVICE_EXISTS)
        self.assertEqual(request_record.matched_service_id, self.service.pk)

    def test_customer_cannot_access_internal_missing_service_request_queue(self):
        customer_user = CustomUser.objects.create_user(
            email="customer-queue@example.com",
            password="Password@123",
            full_name="Queue Customer",
            phone="0796666666",
            role=CustomUser.Role.CUSTOMER,
        )
        self.client.force_authenticate(customer_user)

        response = self.client.get("/api/admin/public-site/missing-service-requests/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


@override_settings(
    REST_FRAMEWORK={
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}),
            "missing_service_request": "1/minute",
        },
    }
)
class PublicMissingServiceRequestThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        self._original_throttle_rates = dict(ScopedRateThrottle.THROTTLE_RATES)
        ScopedRateThrottle.THROTTLE_RATES = {
            **ScopedRateThrottle.THROTTLE_RATES,
            "missing_service_request": "1/minute",
        }
        self.client = APIClient()
        self.payload = {
            "service_name": "معاملة جديدة",
            "request_message": "أحتاج خدمة غير موجودة.",
            "requester_name": "عميل تجريبي",
            "requester_phone": "0795550000",
            "preferred_contact_channel": "whatsapp",
            "source": "homepage_chat",
        }

    def tearDown(self):
        ScopedRateThrottle.THROTTLE_RATES = self._original_throttle_rates
        cache.clear()
        super().tearDown()

    def test_public_missing_service_request_submission_is_rate_limited(self):
        first_response = self.client.post("/api/public-site/missing-service-requests/", self.payload, format="json")
        second_response = self.client.post("/api/public-site/missing-service-requests/", self.payload, format="json")

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
