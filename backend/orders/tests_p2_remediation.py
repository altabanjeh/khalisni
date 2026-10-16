"""Regression tests for the P2 objective remediation: B10-6 (admin pagination) and D03 (system text)."""

import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from documents.services import create_order_document
from notifications.models import Notification
from orders.models import Order, OrderStatusLog
from orders.services import recover_invalid_missing_document_request, review_order
from orders.system_events import SYSTEM_EVENT_CODES, system_event_for_note
from providers.models import ProviderProfile
from services.models import RequiredDocumentDefinition, Service, ServiceCategory, ServiceRequiredDocument

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
DOC = "client-audit-qa-202610-authorization"


class P2Base(APITestCase):
    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        media_override = override_settings(MEDIA_ROOT=self.media)
        media_override.enable()
        self.addCleanup(media_override.disable)
        self.category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="p2-category")
        self.service = Service.objects.create(
            category=self.category, name_ar="خدمة", name_en="Service", slug="p2-service", description_ar="وصف",
        )
        ServiceRequiredDocument.objects.create(
            service=self.service, document_type=DOC, name_ar="تفويض تجريبي", name_en="Test authorization",
            is_required=True, allowed_extensions=[".pdf"], display_order=1,
        )
        make = CustomUser.objects.create_user
        self.customer = make(email="p2-customer@example.test", password="Password@123", full_name="Customer",
                             phone="0791100001", role=CustomUser.Role.CUSTOMER)
        self.employee = make(email="p2-employee@example.test", password="Password@123", full_name="Employee",
                             phone="0791100002", role=CustomUser.Role.EMPLOYEE)
        self.admin = make(email="p2-admin@example.test", password="Password@123", full_name="Admin",
                          phone="0791100003", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True)
        self.client = APIClient()

    def as_user(self, user, language="ar"):
        self.client.force_authenticate(user)
        self.client.credentials(HTTP_ACCEPT_LANGUAGE=language)
        return self.client


class AdminServicePaginationTests(P2Base):
    """7-10: every service is reachable page by page, filters stay on the server."""

    def setUp(self):
        super().setUp()
        other = ServiceCategory.objects.create(name_ar="أخرى", name_en="Other", slug="p2-other")
        # 37 more services (38 in total, as in the audited catalogue), three with the same name.
        for index in range(37):
            Service.objects.create(
                category=other if index % 2 else self.category,
                name_ar="????" if index < 3 else f"خدمة {index:02d}",
                name_en=f"Service {index:02d}",
                slug=f"p2-service-{index:02d}",
                description_ar="وصف",
            )
        self.other = other

    def collect(self, url):
        client = self.as_user(self.admin)
        ids, pages = [], 0
        while url:
            response = client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            ids.extend(row["id"] for row in response.data["results"])
            url = response.data["next"]
            pages += 1
        return ids, pages

    # 7. all 38 services can be reached
    def test_every_service_reachable_exactly_once(self):
        ids, pages = self.collect("/api/admin/services/")
        self.assertEqual(pages, 2)
        self.assertEqual(len(ids), 38)
        self.assertEqual(len(set(ids)), 38)
        self.assertEqual(set(ids), set(Service.objects.values_list("pk", flat=True)))

    # 8-9. next and previous pages
    def test_next_and_previous_links(self):
        client = self.as_user(self.admin)
        first = client.get("/api/admin/services/").data
        self.assertEqual((first["count"], len(first["results"]), first["previous"]), (38, 20, None))
        second = client.get(first["next"]).data
        self.assertEqual((len(second["results"]), second["next"]), (18, None))
        back = client.get(second["previous"]).data
        self.assertEqual([row["id"] for row in back["results"]], [row["id"] for row in first["results"]])

    # 10. filters and search stay correct across pages
    def test_category_search_and_deleted_filters_are_server_side(self):
        ids, _ = self.collect(f"/api/admin/services/?category={self.other.pk}")
        self.assertEqual(set(ids), set(Service.objects.filter(category=self.other).values_list("pk", flat=True)))
        client = self.as_user(self.admin)
        found = client.get("/api/admin/services/?search=p2-service-15").data
        self.assertEqual([row["slug"] for row in found["results"]], ["p2-service-15"])
        doomed = Service.objects.filter(category=self.other).first()
        Service.objects.filter(pk=doomed.pk).update(is_deleted=True)
        deleted = client.get("/api/admin/services/?include_deleted=true&is_deleted=true").data
        self.assertEqual([row["id"] for row in deleted["results"]], [doomed.pk])
        active = client.get("/api/admin/services/").data
        self.assertEqual(active["count"], 37)
        everything = client.get("/api/admin/services/?include_deleted=true").data
        self.assertEqual(everything["count"], 38)

    def test_service_documents_listing_is_stable_across_pages(self):
        for index, service in enumerate(Service.objects.exclude(pk=self.service.pk)[:25]):
            ServiceRequiredDocument.objects.create(
                service=service, document_type=f"doc-{index}", name_ar="صورة الهوية", name_en="ID",
                display_order=1,
            )
        client = self.as_user(self.admin)
        url, ids = "/api/admin/service-documents/", []
        while url:
            data = client.get(url).data
            ids.extend(row["id"] for row in data["results"])
            url = data["next"]
        self.assertEqual(len(ids), ServiceRequiredDocument.objects.count())
        self.assertEqual(len(set(ids)), len(ids))


class TimelineSystemEventTests(P2Base):
    """16 (API side): system notes carry a code; typed notes do not."""

    def test_new_system_note_is_stored_with_a_code(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        review_order(order=order, actor=self.employee)
        log = order.status_logs.get(new_status=Order.Status.UNDER_REVIEW)
        self.assertEqual(log.note, "Order under review")
        self.assertEqual(log.system_event, "order_under_review")
        data = self.as_user(self.admin).get(f"/api/admin/orders/{order.pk}/").data
        entry = next(item for item in data["status_logs"] if item["new_status"] == Order.Status.UNDER_REVIEW)
        self.assertEqual((entry["system_event"], entry["system_event_params"]), ("order_under_review", {}))

    def test_typed_note_is_never_coded(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        review_order(order=order, actor=self.employee, note="Order under review please")
        self.assertEqual(order.status_logs.get(new_status=Order.Status.UNDER_REVIEW).system_event, "")
        self.assertEqual(system_event_for_note("review"), ("", {}))

    def test_legacy_row_without_a_stored_code_is_recognised_at_read_time(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        log = OrderStatusLog.objects.create(order=order, old_status="IN_PROGRESS", new_status="READY_FOR_DELIVERY",
                                            note="Provider completed work and uploaded final result")
        OrderStatusLog.objects.filter(pk=log.pk).update(system_event="")  # shape of a pre-migration row
        data = self.as_user(self.employee).get(f"/api/admin/orders/{order.pk}/").data
        entry = next(item for item in data["status_logs"] if item["id"] == log.pk)
        self.assertEqual(entry["system_event"], "provider_completed_work")
        self.assertEqual(entry["note"], "Provider completed work and uploaded final result")

    def test_recovery_note_keeps_the_typed_reason_as_a_parameter(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman",
                                     status=Order.Status.WAITING_CUSTOMER)
        recover_invalid_missing_document_request(order=order, actor=self.admin, reason="طلب قديم")
        log = order.status_logs.latest("created_at")
        self.assertEqual(log.system_event, "missing_request_recovered")
        data = self.as_user(self.admin).get(f"/api/admin/orders/{order.pk}/").data
        entry = next(item for item in data["status_logs"] if item["id"] == log.pk)
        self.assertEqual(entry["system_event_params"], {"reason": "طلب قديم"})

    def test_customer_sees_codes_only_where_notes_are_customer_facing(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        review_order(order=order, actor=self.employee)
        data = self.as_user(self.customer).get(f"/api/customer/orders/{order.pk}/").data
        entry = next(item for item in data["status_logs"] if item["new_status"] == Order.Status.UNDER_REVIEW)
        self.assertEqual((entry["note"], entry["system_event"]), ("", ""))

    def test_every_code_is_presented_by_the_web_client(self):
        from pathlib import Path

        from django.conf import settings

        source = Path(settings.BASE_DIR).parent / "frontend" / "src" / "utils" / "timelinePresentation.js"
        if not source.exists():
            self.skipTest("frontend sources not present")
        text = source.read_text(encoding="utf-8")
        missing = [code for code in SYSTEM_EVENT_CODES if f"{code}:" not in text]
        self.assertEqual(missing, [])


class DocumentNameTests(P2Base):
    """15 (API side): documents carry their configured name, never only the code."""

    def make_documents(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        upload = create_order_document(order=order, uploaded_by=self.customer, document_type=DOC,
                                       file_obj=SimpleUploadedFile("a.pdf", PDF, content_type="application/pdf"))
        final = create_order_document(order=order, uploaded_by=self.employee, document_type="final-result",
                                      is_final_document=True,
                                      file_obj=SimpleUploadedFile("r.pdf", PDF, content_type="application/pdf"))
        unknown = create_order_document(order=order, uploaded_by=self.customer, document_type="legacy-code",
                                        file_obj=SimpleUploadedFile("u.pdf", PDF, content_type="application/pdf"))
        return order, upload, final, unknown

    def test_staff_queue_has_names_for_every_document(self):
        RequiredDocumentDefinition.objects.create(code="legacy-code", name_ar="وثيقة قديمة", name_en="Legacy document")
        order, upload, final, unknown = self.make_documents()
        data = self.as_user(self.employee).get("/api/staff/documents/").data
        rows = {row["id"]: row for row in data.get("results", data)}
        self.assertEqual(rows[upload.pk]["document_type_label"], {"ar": "تفويض تجريبي", "en": "Test authorization"})
        self.assertEqual(rows[final.pk]["document_type_label"], {"ar": "النتيجة النهائية", "en": "Final result"})
        self.assertEqual(rows[unknown.pk]["document_type_label"], {"ar": "وثيقة قديمة", "en": "Legacy document"})

    def test_unknown_code_gets_a_generic_name_not_the_code(self):
        order, upload, final, unknown = self.make_documents()
        data = self.as_user(self.customer).get(f"/api/customer/orders/{order.pk}/").data
        rows = {row["id"]: row for row in data["documents"]}
        self.assertEqual(rows[unknown.pk]["document_type_label"], {"ar": "مستند", "en": "Document"})


class LegacyNotificationTests(P2Base):
    """D03: notifications stored in English before bilingual content render in Arabic."""

    def notify(self, title, message):
        return Notification.objects.create(recipient=self.customer, title=title, message=message,
                                           notification_type="order", context_data={})

    def test_exact_legacy_sentences_render_in_arabic_and_stay_english_in_english(self):
        self.notify("Order received", "Your order KH-2026-000001 was created successfully.")
        self.notify("Order completed", "Order KH-2026-000003 is completed.")
        self.notify("Final result uploaded", "Order KH-2026-000003 is ready for verification.")
        arabic = self.as_user(self.customer).get("/api/notifications/").data
        rows = {row["title"]: row["message"] for row in arabic.get("results", arabic)}
        self.assertEqual(rows["تم استلام الطلب"], "تم إنشاء الطلب KH-2026-000001 بنجاح.")
        self.assertEqual(rows["اكتمل الطلب"], "اكتمل الطلب KH-2026-000003.")
        self.assertIn("KH-2026-000003", rows["تم رفع النتيجة النهائية"])
        english = self.as_user(self.customer, "en").get("/api/notifications/").data
        titles = {row["title"] for row in english.get("results", english)}
        self.assertEqual(titles, {"Order received", "Order completed", "Final result uploaded"})
        # The stored rows are not rewritten.
        self.assertEqual(set(Notification.objects.values_list("title", flat=True)), titles)

    def test_typed_text_is_never_translated(self):
        self.notify("More documents required", "Please upload a clearer ID copy.")
        self.notify("Custom title", "Order KH-2026-000003 is completed, thanks!")
        rows = self.as_user(self.customer).get("/api/notifications/").data
        rows = {row["title"]: row["message"] for row in rows.get("results", rows)}
        self.assertEqual(rows["مستندات إضافية مطلوبة"], "Please upload a clearer ID copy.")
        self.assertEqual(rows["Custom title"], "Order KH-2026-000003 is completed, thanks!")


class LocalizedLabelTests(P2Base):
    def test_provider_approval_label_follows_language(self):
        user = CustomUser.objects.create_user(email="p2-provider@example.test", password="Password@123",
                                              full_name="Provider", phone="0791100009", role=CustomUser.Role.PROVIDER)
        ProviderProfile.objects.create(user=user, provider_type="individual", city="Amman", is_approved=True)
        arabic = self.as_user(self.admin).get("/api/admin/providers/").data
        english = self.as_user(self.admin, "en").get("/api/admin/providers/").data
        self.assertEqual(arabic["results"][0]["approval_status_label"], "معتمد")
        self.assertEqual(english["results"][0]["approval_status_label"], "Approved")

    def test_admin_service_duration_in_both_languages(self):
        Service.objects.filter(pk=self.service.pk).update(estimated_duration=3)
        row = next(item for item in self.as_user(self.admin).get("/api/admin/services/").data["results"]
                   if item["id"] == self.service.pk)
        self.assertTrue(row["duration_display_ar"].startswith("المدة المتوقعة"))
        self.assertTrue(row["duration_display_en"].startswith("Expected completion"))
        self.assertEqual(row["duration_display"], row["duration_display_en"])  # unchanged for existing clients
