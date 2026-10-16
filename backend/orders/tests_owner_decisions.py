"""Owner decisions F04 (rejection reason), B06 (provider identity), consent evidence
and phone identity in tracking and public download."""

import json
import shutil
import tempfile

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase
from rest_framework.throttling import ScopedRateThrottle

from accounts.models import CustomUser
from documents.models import Document
from documents.services import create_order_document, verify_document
from notifications.models import Notification
from orders.consent import CONSENT_TEXTS, UNVERSIONED
from orders.models import Order, OrderConsent, OrderNote
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
REASON = "Client-audit QA: the scan is unreadable, please upload a clearer copy."

# Keys that would identify the provider anywhere in a customer payload.
# ("rating" is not listed: an order detail carries the customer's own rating of the order.)
PROVIDER_KEYS = {"assigned_provider", "provider", "provider_id", "provider_name", "provider_type", "is_available"}


def walk_keys(value, path=""):
    """Yield (path, key, value) for every key of a JSON-like structure."""
    if isinstance(value, dict):
        for key, item in value.items():
            yield f"{path}.{key}", key, item
            yield from walk_keys(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_keys(item, f"{path}[{index}]")


class OwnerDecisionBase(APITestCase):
    def setUp(self):
        # Many tracking calls per test; the tracking throttle has its own tests.
        cache.clear()
        self.addCleanup(cache.clear)
        rates = dict(ScopedRateThrottle.THROTTLE_RATES)
        self.addCleanup(setattr, ScopedRateThrottle, "THROTTLE_RATES", rates)
        ScopedRateThrottle.THROTTLE_RATES = {**rates, "order_tracking": "1000/minute", "order_create": "1000/minute"}
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        media_override = override_settings(MEDIA_ROOT=self.media)
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.category = ServiceCategory.objects.create(
            name_ar="تصنيف", name_en="Category", slug="odi-category", is_active=True, show_on_public_site=True,
        )
        self.service = Service.objects.create(
            category=self.category, name_ar="خدمة", name_en="Service", slug="odi-service", description_ar="وصف",
            is_active=True, show_on_public_site=True, is_online=True,
        )
        make = CustomUser.objects.create_user
        self.customer = make(email="odi-customer@example.test", password="Password@123", full_name="Customer",
                             phone="0791200001", role=CustomUser.Role.CUSTOMER)
        self.other_customer = make(email="odi-other@example.test", password="Password@123", full_name="Other",
                                   phone="0791200002", role=CustomUser.Role.CUSTOMER)
        self.employee = make(email="odi-employee@example.test", password="Password@123", full_name="Employee",
                             phone="0791200003", role=CustomUser.Role.EMPLOYEE)
        self.admin = make(email="odi-admin@example.test", password="Password@123", full_name="Admin",
                          phone="0791200004", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        self.provider_user = make(email="odi-provider@example.test", password="Password@123",
                                  full_name="Provider Person Name", phone="0791200005", role=CustomUser.Role.PROVIDER)
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user, provider_type="Licensed office", city="Zarqa", is_approved=True, is_available=True,
        )
        self.client = APIClient()

    def as_user(self, user, language="ar"):
        self.client.force_authenticate(user)
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client

    def order_for(self, customer, **extra):
        return Order.objects.create(customer=customer, service=self.service, city="Amman", **extra)

    def upload(self, order, name="id.pdf", uploaded_by=None):
        return create_order_document(
            order=order, uploaded_by=uploaded_by or order.customer, document_type="customer_upload",
            file_obj=SimpleUploadedFile(name, PDF, content_type="application/pdf"),
        )


class RejectionReasonTests(OwnerDecisionBase):
    """F04: the customer who owns the order sees the exact staff reason; nobody else does."""

    def setUp(self):
        super().setUp()
        self.order = self.order_for(self.customer, status=Order.Status.UNDER_REVIEW)
        self.document = self.upload(self.order)
        verify_document(document=self.document, actor=self.employee, is_verified=False, note=REASON)

    def documents_in(self, data):
        return {row["id"]: row for row in data["documents"]}

    # Test 3
    def test_owning_customer_sees_the_exact_staff_reason(self):
        response = self.as_user(self.customer).get(f"/api/customer/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 200)
        row = self.documents_in(response.data)[self.document.pk]
        self.assertEqual(row["status"], Document.DocumentStatus.REJECTED)
        self.assertEqual(row["rejection_reason"], REASON)

    def test_staff_still_see_the_stored_reason(self):
        response = self.as_user(self.employee).get(f"/api/admin/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(self.documents_in(response.data)[self.document.pk]["rejection_reason"], REASON)
        listed = self.as_user(self.employee).get("/api/staff/documents/", {"status": "rejected"})
        self.assertEqual(listed.status_code, 200)
        rows = listed.data["results"] if isinstance(listed.data, dict) else listed.data
        self.assertEqual({row["id"]: row["rejection_reason"] for row in rows}[self.document.pk], REASON)

    # Test 4
    def test_another_customer_cannot_read_the_reason(self):
        response = self.as_user(self.other_customer).get(f"/api/customer/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 404)
        listed = self.as_user(self.other_customer).get("/api/customer/orders/")
        self.assertNotIn(REASON, json.dumps(listed.data, ensure_ascii=False, default=str))

    def test_serializer_drops_the_reason_for_a_non_owner(self):
        from documents.serializers import DocumentSerializer
        from rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("/")
        request.user = self.other_customer
        self.assertNotIn("rejection_reason", DocumentSerializer(self.document, context={"request": request}).data)
        request.user = self.customer
        self.assertEqual(DocumentSerializer(self.document, context={"request": request}).data["rejection_reason"], REASON)

    # Test 5
    def test_public_tracking_does_not_expose_the_reason(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": "0791200001"})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(REASON, json.dumps(response.data, ensure_ascii=False, default=str))
        self.assertNotIn("rejection_reason", {key for _path, key, _value in walk_keys(response.data)})

    def test_provider_visibility_is_unchanged(self):
        self.order.assigned_provider = self.provider
        self.order.save(update_fields=["assigned_provider"])
        response = self.as_user(self.provider_user).get(f"/api/provider/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn(REASON, json.dumps(response.data, ensure_ascii=False, default=str))

    def test_customer_notification_points_to_the_order(self):
        notification = Notification.objects.filter(recipient=self.customer, template_key="document_rejected").first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.order_id, self.order.pk)


class ProviderIdentityPrivacyTests(OwnerDecisionBase):
    """B06: no provider identity reaches any customer-facing payload."""

    def setUp(self):
        super().setUp()
        self.order = self.order_for(self.customer, status=Order.Status.IN_PROGRESS, assigned_provider=self.provider)
        OrderNote.objects.create(order=self.order, user=self.provider_user, note="Visible progress note",
                                 visibility=OrderNote.Visibility.CUSTOMER)
        Notification.objects.create(recipient=self.customer, actor=self.provider_user, order=self.order,
                                    title="t", message="m")

    def assert_no_provider_identity(self, data):
        dumped = json.dumps(data, ensure_ascii=False, default=str)
        for secret in ("Provider Person Name", "Licensed office", "Zarqa", self.provider_user.email, self.provider_user.phone):
            self.assertNotIn(secret, dumped)
        for path, key, value in walk_keys(data):
            self.assertNotIn(key, PROVIDER_KEYS, path)
            if key in {"user", "actor"}:
                self.assertNotIn(value, (self.provider_user.pk, self.provider.pk), path)

    # Test 7
    def test_customer_order_list_and_detail_have_no_provider_identity(self):
        client = self.as_user(self.customer)
        listed = client.get("/api/customer/orders/")
        self.assertEqual(listed.status_code, 200)
        self.assert_no_provider_identity(listed.data)
        detail = client.get(f"/api/customer/orders/{self.order.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertIn("Visible progress note", json.dumps(detail.data, ensure_ascii=False, default=str))
        self.assert_no_provider_identity(detail.data)

    def test_customer_notifications_have_no_provider_identity(self):
        response = self.as_user(self.customer).get("/api/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assert_no_provider_identity(response.data)

    # Test 8
    def test_tracking_has_no_provider_identity(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": "+962791200001"})
        self.assertEqual(response.status_code, 200)
        self.assert_no_provider_identity(response.data)

    # Test 9
    def test_staff_and_provider_apis_are_unaffected(self):
        staff = self.as_user(self.admin).get(f"/api/admin/orders/{self.order.pk}/")
        self.assertEqual(staff.status_code, 200)
        self.assertEqual(staff.data["assigned_provider"]["full_name"], "Provider Person Name")
        notes = {note["note"]: note for note in staff.data["notes"]}
        self.assertEqual(notes["Visible progress note"]["user_name"], "Provider Person Name")
        provider = self.as_user(self.provider_user).get(f"/api/provider/orders/{self.order.pk}/")
        self.assertEqual(provider.status_code, 200)


class ConsentEvidenceTests(OwnerDecisionBase):
    """24-27: accepted consent is stored as append-only evidence; old orders stay unknown."""

    def submit(self, *, language="ar", **fields):
        payload = {"service": self.service.pk, "full_name": "Customer", "phone": "0791200001", "city": "Amman", **fields}
        return self.as_user(self.customer, language).post("/api/orders/", payload, format="multipart")

    # Test 24
    def test_order_cannot_be_submitted_without_consent(self):
        for consent in ("false", None):
            fields = {} if consent is None else {"consent": consent}
            response = self.submit(**fields)
            self.assertEqual(response.status_code, 400, response.data)
            self.assertIn("consent", response.data)
        self.assertFalse(Order.objects.filter(customer=self.customer).exists())
        self.assertFalse(OrderConsent.objects.exists())

    # Tests 25 and 26
    def test_accepted_consent_creates_evidence_with_version_text_time_and_language(self):
        response = self.submit(language="en", consent="true", consent_version="order-consent-web-v1", consent_source="web")
        self.assertEqual(response.status_code, 201, response.data)
        order = Order.objects.get(pk=response.data["id"])
        record = OrderConsent.objects.get(order=order)
        self.assertTrue(record.accepted)
        self.assertEqual(record.customer, self.customer)
        self.assertEqual(record.consent_version, "order-consent-web-v1")
        self.assertEqual(record.consent_text, CONSENT_TEXTS["order-consent-web-v1"]["en"])
        self.assertEqual(record.language, "en")
        self.assertEqual(record.source, "web")
        self.assertIsNotNone(record.created_at)
        detail = self.as_user(self.employee).get(f"/api/admin/orders/{order.pk}/")
        self.assertEqual(detail.data["consent"]["status"], "recorded")
        self.assertEqual(detail.data["consent"]["version"], "order-consent-web-v1")

    def test_mobile_statement_and_unversioned_clients(self):
        mobile = self.submit(consent="true", consent_version="order-consent-mobile-v1", consent_source="mobile")
        self.assertEqual(mobile.status_code, 201, mobile.data)
        record = OrderConsent.objects.get(order_id=mobile.data["id"])
        self.assertEqual((record.language, record.source), ("ar", "mobile"))
        self.assertEqual(record.consent_text, CONSENT_TEXTS["order-consent-mobile-v1"]["ar"])
        # A client that names no statement: acceptance recorded, no text claimed.
        bare = self.submit(consent="true")
        self.assertEqual(bare.status_code, 201, bare.data)
        record = OrderConsent.objects.get(order_id=bare.data["id"])
        self.assertEqual((record.consent_version, record.consent_text, record.source), (UNVERSIONED, "", "unknown"))

    def test_unknown_statement_version_is_refused(self):
        response = self.submit(consent="true", consent_version="made-up-v9")
        self.assertEqual(response.status_code, 400)
        self.assertIn("consent_version", response.data)

    def test_consent_evidence_is_append_only(self):
        response = self.submit(consent="true", consent_version="order-consent-web-v1", consent_source="web")
        record = OrderConsent.objects.get(order_id=response.data["id"])
        record.consent_text = "rewritten"
        with self.assertRaises(ValidationError):
            record.save()
        with self.assertRaises(ValidationError):
            record.delete()
        self.assertEqual(OrderConsent.objects.get(pk=record.pk).consent_text, CONSENT_TEXTS["order-consent-web-v1"]["ar"])

    # Test 27
    def test_historical_orders_are_not_backfilled(self):
        legacy = self.order_for(self.customer)
        self.assertFalse(OrderConsent.objects.filter(order=legacy).exists())
        detail = self.as_user(self.customer).get(f"/api/customer/orders/{legacy.pk}/")
        self.assertEqual(detail.data["consent"], {"status": "legacy_unknown"})


class PhoneIdentityTrackingTests(OwnerDecisionBase):
    """19: tracking and public final-result download compare canonical numbers."""

    def setUp(self):
        super().setUp()
        self.order = self.order_for(self.customer)

    def test_customer_phone_is_stored_canonical(self):
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.phone, "+962791200001")

    # Test 19
    def test_tracking_works_with_every_equivalent_format(self):
        self.client.force_authenticate(None)
        for typed in ("0791200001", "079 120 0001", "+962791200001", "00962791200001", "+962 79 120 0001", "٠٧٩١٢٠٠٠٠١"):
            response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": typed})
            self.assertEqual(response.status_code, 200, typed)

    def test_tracking_rejects_a_different_number(self):
        self.client.force_authenticate(None)
        for typed in ("0791200002", "+442079460958", "not-a-phone"):
            response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": typed})
            self.assertEqual(response.status_code, 404, typed)

    def test_tracking_matches_a_legacy_unnormalized_stored_phone(self):
        CustomUser._base_manager.filter(pk=self.customer.pk).update(phone="079-120-0001")
        self.client.force_authenticate(None)
        response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": "+962791200001"})
        self.assertEqual(response.status_code, 200)

    def test_public_final_download_compares_canonical_numbers(self):
        self.order.status = Order.Status.COMPLETED
        from django.utils import timezone

        self.order.completed_at = timezone.now()
        self.order.save(update_fields=["status", "completed_at"])
        final = create_order_document(
            order=self.order, uploaded_by=self.admin, document_type="final_result",
            file_obj=SimpleUploadedFile("final.pdf", PDF, content_type="application/pdf"), is_final_document=True,
        )
        Document.objects.filter(pk=final.pk).update(is_verified=True, status=Document.DocumentStatus.APPROVED)
        self.client.force_authenticate(None)
        url = f"/api/documents/{final.pk}/download/"
        self.assertEqual(self.client.get(url, {"order_number": self.order.order_number, "phone": "00962791200001"}).status_code, 200)
        self.assertEqual(self.client.get(url, {"order_number": self.order.order_number, "phone": "0791200009"}).status_code, 404)

    def test_soft_deleted_documents_cannot_be_downloaded(self):
        document = self.upload(self.order)
        url = f"/api/documents/{document.pk}/download/"
        self.assertEqual(self.as_user(self.customer).get(url).status_code, 200)
        document.soft_delete(user=self.admin)
        self.assertEqual(self.as_user(self.customer).get(url).status_code, 404)
        self.assertEqual(self.as_user(self.admin).get(url).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(url, {"order_number": self.order.order_number, "phone": "0791200001"}).status_code, 404)

    def test_order_form_phone_is_canonical_and_same_number_is_no_change(self):
        response = self.as_user(self.customer).post(
            "/api/orders/",
            {"service": self.service.pk, "full_name": "Customer", "phone": "079 120 0001", "city": "Amman", "consent": "true"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.phone, "+962791200001")

    def test_order_form_rejects_an_invalid_phone(self):
        response = self.as_user(self.customer, "en").post(
            "/api/orders/",
            {"service": self.service.pk, "full_name": "Customer", "phone": "12", "city": "Amman", "consent": "true"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("phone", response.data)
