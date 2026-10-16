"""Release unblocking pass: D05/D06 validation (no content invented), deploy checks,
the read-only public-content report, and D03 legacy system text."""

import shutil
import tempfile
from io import StringIO

from django.core.checks import run_checks
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from core.reserved_domains import is_reserved_email
from documents.models import Document
from documents.presentation import localized_verification_note
from documents.services import create_order_document
from notifications.models import Notification
from orders.models import Order, OrderStatusLog
from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT
from public_site.models import PublicPageContent
from services.models import Service, ServiceCategory, ServiceRequiredDocument

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def content_row(**overrides):
    values = {
        **DEFAULT_PUBLIC_PAGE_CONTENT,
        "version_name": "Release check",
        "contact_phone": "+962 6 560 9000", "email": "support@khalisni.local", "office_address": "عمّان",
        "active_content": True,
    }
    values.update(overrides)
    return PublicPageContent.objects.create(**values)


class ReservedDomainTests(TestCase):
    def test_reserved_domains_are_recognised(self):
        for address in ("support@khalisni.local", "a@host.localhost", "x@example.test", "y@site.example",
                        "z@foo.invalid", "n@localhost", "NO-REPLY@KHALISNI.LOCAL"):
            self.assertTrue(is_reserved_email(address), address)
        for address in ("support@khalisni.com", "info@khalsni.jo", "", "not-an-address"):
            self.assertFalse(is_reserved_email(address), address)


class PublicContactValidationTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            email="ub-admin@example.org", password="Password@123", full_name="Admin", phone="0791500001",
            role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        self.client = APIClient()

    def test_public_api_hides_a_reserved_domain_email_without_changing_the_row(self):
        row = content_row()
        data = self.client.get("/api/public-site/homepage/").json()
        self.assertEqual(data["content"]["email"], "")
        self.assertEqual(data["content"]["contact_phone"], "+962 6 560 9000")
        row.refresh_from_db()
        self.assertEqual(row.email, "support@khalisni.local")

    def test_public_api_keeps_a_deliverable_email(self):
        content_row(email="support@khalsni.jo")
        data = self.client.get("/api/public-site/homepage/").json()
        self.assertEqual(data["content"]["email"], "support@khalsni.jo")

    def test_admin_cannot_publish_a_reserved_domain_email(self):
        content_row(email="")
        self.client.force_authenticate(self.admin)
        current = self.client.get("/api/admin/public-site/content/").json()
        payload = {key: value for key, value in current.items() if value is not None and key not in {"hero_image", "hero_image_url"}}
        refused = self.client.put("/api/admin/public-site/content/", {**payload, "email": "info@khalisni.local"}, format="json")
        self.assertEqual(refused.status_code, 400, refused.content)
        self.assertIn("email", refused.json())
        accepted = self.client.put("/api/admin/public-site/content/", {**payload, "email": "support@khalsni.jo"}, format="json")
        self.assertEqual(accepted.status_code, 200, accepted.content)
        blank = self.client.put("/api/admin/public-site/content/", {**payload, "email": ""}, format="json")
        self.assertEqual(blank.status_code, 200, blank.content)

    def test_privacy_policy_is_stored_and_served_in_both_languages(self):
        content_row(privacy_policy_ar="نص سياسة تجريبي للاختبار فقط.", privacy_policy_en="Test-only policy text.")
        data = self.client.get("/api/public-site/homepage/").json()["content"]
        self.assertEqual(data["privacy_policy_ar"], "نص سياسة تجريبي للاختبار فقط.")
        self.assertEqual(data["privacy_policy_en"], "Test-only policy text.")

    def test_one_language_policy_is_refused(self):
        with self.assertRaises(Exception):
            content_row(privacy_policy_ar="نص عربي فقط", privacy_policy_en="")


class PublicContentReportTests(TestCase):
    def run_report(self, *args):
        out = StringIO()
        call_command("check_public_content", *args, stdout=out)
        return out.getvalue()

    def test_report_lists_placeholders_and_missing_policy_and_changes_nothing(self):
        row = content_row()
        before = PublicPageContent.objects.values().get(pk=row.pk)
        output = self.run_report()
        self.assertIn("reserved domain", output)
        self.assertIn("D06 approved privacy policy text is missing", output)
        self.assertIn("D05 whatsapp_number is blank", output)
        self.assertEqual(PublicPageContent.objects.values().get(pk=row.pk), before)

    def test_strict_mode_fails_while_items_are_open(self):
        content_row()
        with self.assertRaises(CommandError):
            self.run_report("--strict")

    @override_settings(DEFAULT_FROM_EMAIL="no-reply@khalsni.jo")
    def test_strict_mode_passes_once_owner_values_are_present(self):
        content_row(email="support@khalsni.jo", whatsapp_number="+962790000001", office_address_en="Amman",
                    privacy_policy_ar="نص معتمد للاختبار.", privacy_policy_en="Approved test text.")
        self.assertIn("No open items", self.run_report("--strict"))


class SenderDeployCheckTests(TestCase):
    @override_settings(DEFAULT_FROM_EMAIL="no-reply@khalisni.local")
    def test_reserved_sender_is_a_deploy_warning(self):
        ids = {message.id for message in run_checks(include_deployment_checks=True)}
        self.assertIn("khalsni.W001", ids)

    @override_settings(DEFAULT_FROM_EMAIL="no-reply@khalsni.jo")
    def test_real_sender_passes(self):
        ids = {message.id for message in run_checks(include_deployment_checks=True)}
        self.assertNotIn("khalsni.W001", ids)


class LegacySystemTextTests(APITestCase):
    """D03: every legacy system sentence found in the real legacy data renders in
    Arabic at read time; typed text is unchanged; rows are not rewritten."""

    STATUS_NOTES = {
        "Order under review": "order_under_review",
        "Provider completed work and uploaded final result": "provider_completed_work",
        "Order completed": "order_completed",
    }
    TYPED_STATUS_NOTES = ("review", "assign", "start", "wait")  # typed through the API by debug accounts
    NOTIFICATIONS = (
        ("Order received", "Your order KH-2026-000001 was created successfully."),
        ("New assigned order", "Order KH-2026-000002 was assigned to you."),
        ("Final result uploaded", "Order KH-2026-000003 is ready for verification."),
        ("Order completed", "Order KH-2026-000003 is completed."),
        ("More documents required", "يرجى رفع صورة أوضح للهوية الشخصية"),
    )
    ENGLISH = ("Order received", "was created successfully", "was assigned to you", "ready for verification",
               "is completed", "Final result uploaded", "New assigned order", "More documents required")

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=self.media)
        override.enable()
        self.addCleanup(override.disable)
        make = CustomUser.objects.create_user
        self.customer = make(email="ub-customer@example.org", password="Password@123", full_name="Customer",
                             phone="0791500002", role=CustomUser.Role.CUSTOMER)
        self.admin = make(email="ub-admin2@example.org", password="Password@123", full_name="Admin",
                          phone="0791500003", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="ub-category")
        self.service = Service.objects.create(category=category, name_ar="خدمة", name_en="Service", slug="ub-service", description_ar="وصف")
        self.order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client = APIClient()

    def as_user(self, user, language="ar"):
        self.client.force_authenticate(user)
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client

    def test_legacy_notifications_render_in_arabic_and_rows_stay_unchanged(self):
        for title, message in self.NOTIFICATIONS:
            Notification.objects.create(recipient=self.customer, title=title, message=message, notification_type="order", context_data={})
        stored = list(Notification.objects.order_by("pk").values_list("title", "message"))
        first = self.as_user(self.customer).get("/api/notifications/").json()
        second = self.as_user(self.customer).get("/api/notifications/").json()
        self.assertEqual(first, second, "reading is idempotent")
        text = str(first)
        for phrase in self.ENGLISH:
            self.assertNotIn(phrase, text)
        self.assertIn("يرجى رفع صورة أوضح للهوية الشخصية", text)  # typed staff text unchanged
        self.assertEqual(list(Notification.objects.order_by("pk").values_list("title", "message")), stored)

    def test_legacy_status_notes_get_codes_and_typed_words_do_not(self):
        for note in (*self.STATUS_NOTES, *self.TYPED_STATUS_NOTES):
            log = OrderStatusLog.objects.create(order=self.order, old_status="NEW", new_status="UNDER_REVIEW", note=note)
            OrderStatusLog.objects.filter(pk=log.pk).update(system_event="")  # pre-0017 shape
        logs = self.as_user(self.admin).get(f"/api/admin/orders/{self.order.pk}/").json()["status_logs"]
        codes = {entry["note"]: entry["system_event"] for entry in logs}
        for note, code in self.STATUS_NOTES.items():
            self.assertEqual(codes[note], code)
        for note in self.TYPED_STATUS_NOTES:
            self.assertEqual(codes[note], "")
        self.assertEqual(set(OrderStatusLog.objects.values_list("system_event", flat=True)), {""}, "rows are not rewritten")

    def test_auto_approval_note_is_localized_and_typed_notes_are_not(self):
        ServiceRequiredDocument.objects.create(service=self.service, document_type="ub-id", name_ar="هوية", name_en="ID",
                                               is_required=True, requires_verification=False, allowed_extensions=[".pdf"], display_order=1)
        # The order snapshots the service requirements at creation.
        self.order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        document = create_order_document(order=self.order, uploaded_by=self.customer, document_type="ub-id",
                                         file_obj=SimpleUploadedFile("id.pdf", PDF, content_type="application/pdf"))
        self.assertEqual(document.verification_note, "Approved automatically by service rule.")
        arabic = self.as_user(self.customer).get(f"/api/customer/orders/{self.order.pk}/").json()["documents"]
        english = self.as_user(self.customer, "en").get(f"/api/customer/orders/{self.order.pk}/").json()["documents"]
        self.assertEqual(arabic[0]["verification_note"], "اعتُمد تلقائياً وفق قاعدة الخدمة.")
        self.assertEqual(english[0]["verification_note"], "Approved automatically by service rule.")
        staff = self.as_user(self.admin).get(f"/api/admin/orders/{self.order.pk}/").json()["documents"]
        self.assertEqual(staff[0]["verification_note"], "اعتُمد تلقائياً وفق قاعدة الخدمة.")
        document.refresh_from_db()
        self.assertEqual(document.verification_note, "Approved automatically by service rule.")
        self.assertEqual(localized_verification_note("Approved by Sara after a call", None), "Approved by Sara after a call")
        self.assertEqual(Document.objects.count(), 1)
