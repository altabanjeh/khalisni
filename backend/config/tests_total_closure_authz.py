"""Total closure: negative authorization regression and customer messaging.

One fixture with two customers, two providers, an employee and an admin; every
test tries to cross a boundary that must hold (IDOR, internal notes, documents,
final files, notifications, staff/admin APIs, soft-deleted records, tracking,
signed and expired download tokens, provider identity to customers).
"""

import json
import shutil
import tempfile
from unittest import mock

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import signing
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from documents.models import Document
from documents.services import create_order_document
from notifications.models import Notification
from orders.models import Order, OrderNote
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory

PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


class TotalClosureAuthorizationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        make = CustomUser.objects.create_user
        cls.customer_a = make(email="tc-a@example.org", password="x-Pass-2026!", full_name="عميل أ", phone="+962791700001", role="customer")
        cls.customer_b = make(email="tc-b@example.org", password="x-Pass-2026!", full_name="عميل ب", phone="+962791700002", role="customer")
        cls.employee = make(email="tc-e@example.org", password="x-Pass-2026!", full_name="موظف", phone="+962791700003", role="employee", is_staff=True)
        cls.admin = make(email="tc-admin@example.org", password="x-Pass-2026!", full_name="مدير", phone="+962791700004", role="admin", is_staff=True, is_superuser=True)
        cls.provider_a_user = make(email="tc-pa@example.org", password="x-Pass-2026!", full_name="Provider Alpha", phone="+962791700005", role="provider")
        cls.provider_b_user = make(email="tc-pb@example.org", password="x-Pass-2026!", full_name="Provider Beta", phone="+962791700006", role="provider")
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="tc-cat", show_on_public_site=True)
        cls.service = Service.objects.create(category=category, name_ar="خدمة", name_en="Svc", slug="tc-svc", description_ar="و", show_on_public_site=True)
        cls.provider_a = ProviderProfile.objects.filter(user=cls.provider_a_user).first() or ProviderProfile.objects.create(
            user=cls.provider_a_user, provider_type="individual", city="Amman", is_available=True, is_approved=True)

    def setUp(self):
        self.media = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.media, ignore_errors=True)
        override = override_settings(MEDIA_ROOT=self.media)
        override.enable()
        self.addCleanup(override.disable)
        self.client = APIClient()
        self.order = Order.objects.create(customer=self.customer_a, service=self.service, city="عمّان",
                                          status=Order.Status.IN_PROGRESS, assigned_provider=self.provider_a)
        OrderNote.objects.create(order=self.order, user=self.employee, note="INTERNAL-SECRET-NOTE", visibility=OrderNote.Visibility.INTERNAL)
        self.document = create_order_document(order=self.order, uploaded_by=self.customer_a, document_type="CUSTOMER_UPLOAD",
                                              file_obj=SimpleUploadedFile("id.pdf", PDF, content_type="application/pdf"))
        self.final = Document.objects.create(order=self.order, uploaded_by=self.provider_a_user, document_type="FINAL_RESULT",
                                             is_final_document=True, original_filename="final.pdf",
                                             file=SimpleUploadedFile("final.pdf", PDF, content_type="application/pdf"))

    def as_user(self, user):
        self.client.force_authenticate(user)
        return self.client

    # --- customer / customer isolation -------------------------------------
    def test_customer_cannot_read_or_act_on_another_customers_order(self):
        client = self.as_user(self.customer_b)
        pk = self.order.pk
        self.assertEqual(client.get(f"/api/customer/orders/{pk}/").status_code, 404)
        self.assertEqual(client.post(f"/api/customer/orders/{pk}/cancel/", {"reason": "x"}, format="json").status_code, 404)
        self.assertEqual(client.post(f"/api/customer/orders/{pk}/rating/", {"score": 5}, format="json").status_code, 404)
        self.assertEqual(client.get(f"/api/customer/orders/{pk}/messages/").status_code, 404)
        self.assertEqual(client.post(f"/api/customer/orders/{pk}/messages/", {"message": "hi"}, format="json").status_code, 404)
        upload = client.post(f"/api/customer/orders/{pk}/documents/",
                             {"document_type": "CUSTOMER_UPLOAD", "file": SimpleUploadedFile("x.pdf", PDF, content_type="application/pdf")},
                             format="multipart")
        self.assertIn(upload.status_code, (403, 404))
        listed = client.get("/api/customer/orders/").json()
        rows = listed.get("results", listed) if isinstance(listed, dict) else listed
        self.assertNotIn(pk, [row["id"] for row in rows])

    def test_customer_cannot_download_another_customers_files_or_tokens(self):
        client = self.as_user(self.customer_b)
        for document in (self.document, self.final):
            self.assertIn(client.get(f"/api/documents/{document.pk}/download/").status_code, (403, 404))
            self.assertIn(client.get(f"/api/documents/{document.pk}/download-token/").status_code, (403, 404))

    # --- provider isolation --------------------------------------------------
    def test_unassigned_provider_cannot_open_or_update_the_order(self):
        client = self.as_user(self.provider_b_user)
        pk = self.order.pk
        self.assertEqual(client.get(f"/api/provider/orders/{pk}/").status_code, 404)
        self.assertEqual(client.patch(f"/api/provider/orders/{pk}/status/", {"status": "READY_FOR_DELIVERY"}, format="json").status_code, 404)
        self.assertIn(client.post(f"/api/provider/orders/{pk}/final-document/",
                                  {"document_type": "FINAL_RESULT", "file": SimpleUploadedFile("f.pdf", PDF, content_type="application/pdf")},
                                  format="multipart").status_code, (403, 404))
        self.assertIn(client.get(f"/api/documents/{self.document.pk}/download/").status_code, (403, 404))

    def test_assigned_provider_never_sees_internal_notes(self):
        body = json.dumps(self.as_user(self.provider_a_user).get(f"/api/provider/orders/{self.order.pk}/").json(), ensure_ascii=False)
        self.assertNotIn("INTERNAL-SECRET-NOTE", body)

    # --- customer view: internal notes, provider identity ---------------------
    def test_customer_never_sees_internal_notes_or_provider_identity(self):
        body = json.dumps(self.as_user(self.customer_a).get(f"/api/customer/orders/{self.order.pk}/").json(), ensure_ascii=False)
        self.assertNotIn("INTERNAL-SECRET-NOTE", body)
        self.assertNotIn("Provider Alpha", body)
        self.assertNotIn("tc-pa@example.org", body)
        self.assertNotIn("assigned_provider", body)

    def test_tracking_needs_matching_phone_and_hides_internal_data(self):
        client = APIClient()
        number = self.order.order_number
        self.assertEqual(client.get("/api/orders/track/", {"order_number": number, "phone": "0791700002"}).status_code, 404)
        self.assertIn(client.get("/api/orders/track/", {"order_number": number}).status_code, (400, 404))  # phone is mandatory
        ok = client.get("/api/orders/track/", {"order_number": number, "phone": "0791700001"})  # local form of +962791700001
        self.assertEqual(ok.status_code, 200)
        body = json.dumps(ok.json(), ensure_ascii=False)
        for secret in ("INTERNAL-SECRET-NOTE", "Provider Alpha", "rejection_reason", "verification_note"):
            self.assertNotIn(secret, body)

    # --- notifications -----------------------------------------------------
    def test_notifications_are_private_to_their_recipient(self):
        note = Notification.objects.create(recipient=self.customer_a, title="t", message="m", notification_type="order", context_data={})
        client = self.as_user(self.customer_b)
        listed = client.get("/api/notifications/").json()
        rows = listed.get("results", listed) if isinstance(listed, dict) else listed
        self.assertNotIn(note.pk, [row["id"] for row in rows])
        for method, path in (("post", f"/api/notifications/{note.pk}/read/"), ("patch", f"/api/notifications/{note.pk}/")):
            status_code = getattr(client, method)(path, {}, format="json").status_code
            self.assertIn(status_code, (403, 404, 405))
        note.refresh_from_db()
        self.assertFalse(note.is_read)

    # --- staff/admin APIs ----------------------------------------------------
    def test_customer_and_provider_are_refused_staff_and_admin_apis(self):
        for user in (self.customer_a, self.provider_a_user):
            client = self.as_user(user)
            for path in ("/api/admin/orders/", f"/api/admin/orders/{self.order.pk}/", "/api/admin/users/", "/api/admin/services/",
                         "/api/staff/documents/", "/api/admin/workflow-rules/"):
                self.assertIn(client.get(path).status_code, (401, 403, 404), (user.role, path))
            self.assertIn(client.post(f"/api/admin/orders/{self.order.pk}/notes/", {"note": "x", "visibility": "CUSTOMER"}, format="json").status_code, (403, 404))
            self.assertIn(client.post(f"/api/staff/documents/{self.document.pk}/verify/", {"is_verified": True}, format="json").status_code, (403, 404))

    def test_employee_is_refused_admin_only_apis(self):
        client = self.as_user(self.employee)
        self.assertIn(client.get("/api/admin/users/").status_code, (403, 404))
        self.assertIn(client.post("/api/admin/services/", {"name_ar": "x"}, format="json").status_code, (403, 404))

    def test_anonymous_is_refused_everything_private(self):
        client = APIClient()
        for path in (f"/api/customer/orders/{self.order.pk}/", f"/api/documents/{self.final.pk}/download/", "/api/notifications/",
                     f"/api/customer/orders/{self.order.pk}/messages/", "/api/admin/orders/"):
            self.assertIn(client.get(path).status_code, (401, 403, 404), path)

    # --- soft-deleted records --------------------------------------------------
    def test_soft_deleted_document_is_not_served(self):
        Document.objects.filter(pk=self.document.pk).update(is_deleted=True)
        client = self.as_user(self.customer_a)
        self.assertIn(client.get(f"/api/documents/{self.document.pk}/download/").status_code, (403, 404))
        self.assertIn(client.get(f"/api/documents/{self.document.pk}/download-token/").status_code, (403, 404))

    # --- signed download tokens ------------------------------------------------
    def test_download_tokens_are_bound_to_the_document_and_expire(self):
        client = self.as_user(self.customer_a)
        token_response = client.get(f"/api/documents/{self.document.pk}/download-token/")
        self.assertEqual(token_response.status_code, 200)
        token = token_response.json()["token"]
        anonymous = APIClient()
        self.assertEqual(anonymous.get(f"/api/documents/{self.document.pk}/download/", {"token": token}).status_code, 200)
        # A token for one document does not open another.
        self.assertIn(anonymous.get(f"/api/documents/{self.final.pk}/download/", {"token": token}).status_code, (401, 403, 404))
        # A forged token is refused.
        self.assertIn(anonymous.get(f"/api/documents/{self.document.pk}/download/", {"token": token + "x"}).status_code, (401, 403, 404))
        # An expired token is refused.
        with mock.patch("django.core.signing.time.time", return_value=__import__("time").time() + 3600):
            self.assertIn(anonymous.get(f"/api/documents/{self.document.pk}/download/", {"token": token}).status_code, (401, 403, 404))


class CustomerMessagingTests(APITestCase):
    def setUp(self):
        make = CustomUser.objects.create_user
        self.customer = make(email="msg-c@example.org", password="x-Pass-2026!", full_name="عميل", phone="+962791700011", role="customer")
        self.employee = make(email="msg-e@example.org", password="x-Pass-2026!", full_name="Staff Person", phone="+962791700012", role="employee", is_staff=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="msg-cat", show_on_public_site=True)
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="msg-svc", description_ar="و", show_on_public_site=True)
        self.order = Order.objects.create(customer=self.customer, service=service, city="عمّان", assigned_employee=self.employee,
                                          status=Order.Status.UNDER_REVIEW)
        self.client = APIClient()

    def test_customer_message_reaches_staff_and_staff_reply_reaches_customer_without_identity(self):
        self.client.force_authenticate(self.customer)
        sent = self.client.post(f"/api/customer/orders/{self.order.pk}/messages/", {"message": "متى يجهز الطلب؟"}, format="json")
        self.assertEqual(sent.status_code, 201, sent.content)
        self.assertEqual(sent.json()["author_role"], "customer")
        self.assertTrue(Notification.objects.filter(recipient=self.employee, template_key="customer_message_received").exists())
        # Staff reply through the existing customer-visible note.
        self.client.force_authenticate(self.employee)
        reply = self.client.post(f"/api/admin/orders/{self.order.pk}/notes/", {"note": "خلال يومين", "visibility": "CUSTOMER"}, format="json")
        self.assertEqual(reply.status_code, 201, reply.content)
        OrderNote.objects.create(order=self.order, user=self.employee, note="internal only", visibility=OrderNote.Visibility.INTERNAL)
        self.client.force_authenticate(self.customer)
        thread = self.client.get(f"/api/customer/orders/{self.order.pk}/messages/").json()
        self.assertEqual([item["author_role"] for item in thread], ["customer", "staff"])
        self.assertNotIn("internal only", json.dumps(thread, ensure_ascii=False))
        self.assertNotIn("Staff Person", json.dumps(thread, ensure_ascii=False))

    def test_blank_or_too_long_messages_are_refused_in_arabic(self):
        self.client.force_authenticate(self.customer)
        self.client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        self.assertEqual(self.client.post(f"/api/customer/orders/{self.order.pk}/messages/", {"message": "  "}, format="json").status_code, 400)
        long = self.client.post(f"/api/customer/orders/{self.order.pk}/messages/", {"message": "x" * 2001}, format="json")
        self.assertEqual(long.status_code, 400)


class ProviderReassignmentTests(APITestCase):
    def setUp(self):
        make = CustomUser.objects.create_user
        self.customer = make(email="ra-c@example.org", password="x-Pass-2026!", full_name="ع", phone="+962791700021", role="customer")
        self.employee = make(email="ra-e@example.org", password="x-Pass-2026!", full_name="م", phone="+962791700022", role="employee", is_staff=True)
        self.admin = make(email="ra-a@example.org", password="x-Pass-2026!", full_name="مد", phone="+962791700025", role="admin", is_staff=True, is_superuser=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="ra-cat", show_on_public_site=True)
        self.service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="ra-svc", description_ar="و", show_on_public_site=True)
        def provider(email, phone):
            user = make(email=email, password="x-Pass-2026!", full_name=email, phone=phone, role="provider")
            profile = ProviderProfile.objects.filter(user=user).first() or ProviderProfile.objects.create(user=user, provider_type="individual", city="Amman")
            profile.is_available = True
            profile.is_approved = True
            profile.save()
            profile.service_categories.add(category)
            return profile
        self.p1 = provider("ra-p1@example.org", "+962791700023")
        self.p2 = provider("ra-p2@example.org", "+962791700024")
        self.order = Order.objects.create(customer=self.customer, service=self.service, city="عمّان", status=Order.Status.IN_PROGRESS,
                                          assigned_provider=self.p1)
        self.client = APIClient()

    def test_admin_reassigns_with_reason_and_previous_provider_loses_access(self):
        self.client.force_authenticate(self.admin)
        refused = self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p2.pk, "reason": " "}, format="json")
        self.assertEqual(refused.status_code, 400)
        done = self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p2.pk, "reason": "المزود الأول غير متاح"}, format="json")
        self.assertEqual(done.status_code, 200, done.content)
        self.order.refresh_from_db()
        self.assertEqual((self.order.assigned_provider_id, self.order.status), (self.p2.pk, Order.Status.ASSIGNED))
        self.assertTrue(self.order.assignment_history.filter(note__contains="المزود الأول غير متاح").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.p2.user, template_key="provider_assigned").exists())
        self.client.force_authenticate(self.p1.user)
        self.assertEqual(self.client.get(f"/api/provider/orders/{self.order.pk}/").status_code, 404)
        self.client.force_authenticate(self.p2.user)
        self.assertEqual(self.client.get(f"/api/provider/orders/{self.order.pk}/").status_code, 200)

    def test_reassignment_is_refused_for_non_staff_wrong_state_or_same_provider(self):
        self.client.force_authenticate(self.customer)
        self.assertIn(self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p2.pk, "reason": "x"}, format="json").status_code, (403, 404))
        self.client.force_authenticate(self.p1.user)
        self.assertIn(self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p2.pk, "reason": "x"}, format="json").status_code, (403, 404))
        self.client.force_authenticate(self.admin)
        same = self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p1.pk, "reason": "x"}, format="json")
        self.assertEqual(same.status_code, 400)
        Order.objects.filter(pk=self.order.pk).update(status=Order.Status.COMPLETED)
        late = self.client.post(f"/api/admin/orders/{self.order.pk}/reassign-provider/", {"provider_id": self.p2.pk, "reason": "x"}, format="json")
        self.assertEqual(late.status_code, 400)
        self.assertIn("يمكن تغيير مزود الخدمة فقط", json.dumps(late.json(), ensure_ascii=False))

    def test_allowed_actions_offer_reassignment_only_when_possible(self):
        self.client.force_authenticate(self.admin)
        detail = self.client.get(f"/api/admin/orders/{self.order.pk}/").json()
        self.assertTrue(detail["allowed_actions"]["can_reassign_provider"])
        Order.objects.filter(pk=self.order.pk).update(status=Order.Status.COMPLETED)
        detail = self.client.get(f"/api/admin/orders/{self.order.pk}/").json()
        self.assertFalse(detail["allowed_actions"]["can_reassign_provider"])


class OverdueAndComplaintTests(APITestCase):
    def setUp(self):
        make = CustomUser.objects.create_user
        self.customer = make(email="oc-c@example.org", password="x-Pass-2026!", full_name="ع", phone="+962791700031", role="customer")
        self.other = make(email="oc-o@example.org", password="x-Pass-2026!", full_name="آ", phone="+962791700032", role="customer")
        self.employee = make(email="oc-e@example.org", password="x-Pass-2026!", full_name="م", phone="+962791700033", role="employee", is_staff=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="oc-cat", show_on_public_site=True)
        self.service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="oc-svc", description_ar="و", show_on_public_site=True)
        self.order = Order.objects.create(customer=self.customer, service=self.service, city="عمّان", assigned_employee=self.employee,
                                          status=Order.Status.UNDER_REVIEW)
        self.client = APIClient()

    def test_overdue_orders_alert_staff_once_and_skip_finished_or_undated(self):
        from datetime import timedelta
        from io import StringIO

        from django.core.management import call_command
        from django.utils import timezone

        Order.objects.filter(pk=self.order.pk).update(expected_delivery_date=timezone.localdate() - timedelta(days=2))
        finished = Order.objects.create(customer=self.customer, service=self.service, city="x", status=Order.Status.COMPLETED)
        Order.objects.filter(pk=finished.pk).update(expected_delivery_date=timezone.localdate() - timedelta(days=5))
        undated = Order.objects.create(customer=self.customer, service=self.service, city="x", status=Order.Status.UNDER_REVIEW)
        Order.objects.filter(pk=undated.pk).update(expected_delivery_date=None)
        out = StringIO()
        call_command("notify_overdue_orders", "--dry-run", stdout=out)
        self.assertIn(self.order.order_number, out.getvalue())
        self.assertNotIn(finished.order_number, out.getvalue())
        self.assertNotIn(undated.order_number, out.getvalue())
        self.assertFalse(Notification.objects.filter(template_key="order_overdue").exists())
        call_command("notify_overdue_orders", stdout=StringIO())
        call_command("notify_overdue_orders", stdout=StringIO())
        self.assertEqual(Notification.objects.filter(template_key="order_overdue", recipient=self.employee).count(), 1)

    def test_customer_complaint_is_followed_up_by_staff_and_private(self):
        self.client.force_authenticate(self.customer)
        filed = self.client.post(f"/api/customer/orders/{self.order.pk}/complaints/", {"description": "تأخر الطلب"}, format="json")
        self.assertEqual(filed.status_code, 201, filed.content)
        self.assertTrue(Notification.objects.filter(recipient=self.employee, template_key="customer_complaint_received").exists())
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/customer/orders/{self.order.pk}/complaints/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/customer/orders/{self.order.pk}/complaints/", {"description": "x"}, format="json").status_code, 404)
        self.assertIn(self.client.get(f"/api/admin/orders/{self.order.pk}/complaints/").status_code, (403, 404))
        self.client.force_authenticate(self.employee)
        listed = self.client.get(f"/api/admin/orders/{self.order.pk}/complaints/").json()
        self.assertEqual(len(listed), 1)
        url = f"/api/admin/orders/{self.order.pk}/complaints/{listed[0]['id']}/resolve/"
        resolved = self.client.post(url, {"resolution_note": "تمت المتابعة"}, format="json")
        self.assertEqual(resolved.status_code, 200, resolved.content)
        self.assertEqual(self.client.post(url, {"resolution_note": "x"}, format="json").status_code, 400)
        self.client.force_authenticate(self.customer)
        mine = self.client.get(f"/api/customer/orders/{self.order.pk}/complaints/").json()
        self.assertTrue(mine[0]["is_resolved"])
        thread = self.client.get(f"/api/customer/orders/{self.order.pk}/messages/").json()
        self.assertEqual(thread[-1]["message"], "تمت المتابعة")


class DeliveryMethodTests(APITestCase):
    def setUp(self):
        make = CustomUser.objects.create_user
        self.customer = make(email="dm-c@example.org", password="x-Pass-2026!", full_name="ع", phone="+962791700041", role="customer")
        self.other = make(email="dm-o@example.org", password="x-Pass-2026!", full_name="آ", phone="+962791700042", role="customer")
        self.employee = make(email="dm-e@example.org", password="x-Pass-2026!", full_name="م", phone="+962791700043", role="employee", is_staff=True)
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="dm-cat", show_on_public_site=True)
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="dm-svc", description_ar="و", show_on_public_site=True)
        self.order = Order.objects.create(customer=self.customer, service=service, city="عمّان", assigned_employee=self.employee,
                                          status=Order.Status.UNDER_REVIEW)
        self.client = APIClient()

    def test_staff_record_paper_delivery_and_customer_sees_it(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(f"/api/customer/orders/{self.order.pk}/delivery/").json()["delivery_method"], "electronic")
        self.client.force_authenticate(self.employee)
        url = f"/api/admin/orders/{self.order.pk}/delivery/"
        self.assertEqual(self.client.put(url, {"delivery_method": "paper_pickup", "delivery_instructions": ""}, format="json").status_code, 400)
        ok = self.client.put(url, {"delivery_method": "paper_pickup", "delivery_instructions": "استلم الأصل من مكتب خلصني مع الهوية"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertTrue(Notification.objects.filter(recipient=self.customer, template_key="order_delivery_updated").exists())
        self.client.force_authenticate(self.customer)
        seen = self.client.get(f"/api/customer/orders/{self.order.pk}/delivery/").json()
        self.assertEqual(seen["delivery_method_label_ar"], "تسليم ورقي - استلام")
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/customer/orders/{self.order.pk}/delivery/").status_code, 404)
        self.client.force_authenticate(self.customer)
        self.assertIn(self.client.put(url, {"delivery_method": "electronic"}, format="json").status_code, (403, 404))


class ProfileAndEnglishNameTests(APITestCase):
    def test_profile_national_id_of_another_account_is_a_localized_400(self):
        make = CustomUser.objects.create_user
        me = make(email="pn-a@example.org", password="x-Pass-2026!", full_name="أ", phone="+962791700051", role="customer")
        make(email="pn-b@example.org", password="x-Pass-2026!", full_name="ب", phone="+962791700052", role="customer", national_id="9901112223")
        client = APIClient()
        client.force_authenticate(me)
        client.credentials(HTTP_ACCEPT_LANGUAGE="ar")
        response = client.patch("/api/customer/profile/", {"national_id": "9901112223"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("national_id", response.json())
        self.assertNotIn("Constraint", json.dumps(response.json(), ensure_ascii=False))
        self.assertEqual(client.patch("/api/customer/profile/", {"national_id": "9909998887"}, format="json").status_code, 200)


class OrderPricingLeakTests(APITestCase):
    def test_customer_order_payload_hides_fee_components_that_do_not_sum_to_the_total(self):
        customer = CustomUser.objects.create_user(email="pl-c@example.org", password="x-Pass-2026!", full_name="ع", phone="+962791700061", role="customer")
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="pl-cat", show_on_public_site=True)
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="pl-svc", description_ar="و", show_on_public_site=True,
                                         price_type="fixed", base_price="32.00", government_fee="20.00", service_fee="12.00",
                                         show_total_price_public=True, show_government_fee_public=True, show_company_fee_public=True)
        order = Order.objects.create(customer=customer, service=service, city="عمّان")
        client = APIClient()
        client.force_authenticate(customer)
        brief = client.get(f"/api/customer/orders/{order.pk}/").json()["service"]
        self.assertNotIn("government_fee", brief)
        self.assertNotIn("service_fee", brief)


class BrandSpellingTests(APITestCase):
    def test_normalize_brand_keeps_domains_and_emails(self):
        from services.catalogue_rules import normalize_brand
        self.assertEqual(normalize_brand("فريق خلّصني"), "فريق خلصني")
        self.assertEqual(normalize_brand("Khalisni team"), "Khalsni team")
        self.assertEqual(normalize_brand("visit khalisni.com or no-reply@khalisni.com"), "visit khalisni.com or no-reply@khalisni.com")
        self.assertEqual(normalize_brand("Khalisni.com"), "Khalisni.com")

    def test_brand_migration_fixes_catalogue_text(self):
        import importlib
        from django.apps import apps as django_apps
        category = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="br-cat")
        service = Service.objects.create(category=category, name_ar="خ", name_en="S", slug="br-svc", description_ar="يقوم فريق خلّصني بالمتابعة.")
        importlib.import_module("services.migrations.0021_brand_spelling_in_catalogue").forwards(django_apps, None)
        service.refresh_from_db()
        self.assertEqual(service.description_ar, "يقوم فريق خلصني بالمتابعة.")


class SloganOverDemoHeadlineTests(APITestCase):
    def test_demo_row_gets_the_slogan_and_client_text_is_kept(self):
        import importlib
        from django.apps import apps as django_apps
        from public_site.defaults import DEFAULT_PUBLIC_PAGE_CONTENT
        from public_site.models import PublicPageContent
        migration = importlib.import_module("public_site.migrations.0012_slogan_over_demo_headline")
        base = {**DEFAULT_PUBLIC_PAGE_CONTENT, "active_content": False}
        demo = PublicPageContent.objects.create(**{**base, "version_name": "Khalsni Public Demo Homepage", "hero_title_ar": migration.DEMO_AR, "hero_title_en": migration.DEMO_EN})
        client = PublicPageContent.objects.create(**{**base, "version_name": "Client headline", "hero_title_ar": migration.DEMO_AR})
        migration.forwards(django_apps, None)
        demo.refresh_from_db(); client.refresh_from_db()
        self.assertEqual(demo.hero_title_ar, migration.SLOGAN_AR)
        self.assertEqual(demo.hero_title_en, migration.SLOGAN_EN)
        self.assertEqual(client.hero_title_ar, migration.DEMO_AR)
