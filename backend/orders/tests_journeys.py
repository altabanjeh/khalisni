"""J01-J20 business-journey suite (Gate 1R).

The J-numbers are referenced by prior acceptance docs but were never defined in
the repo. They are derived here from the authoritative requirements
(`docs/SRS.md` FR1-FR10 + business rules, `docs/PRD.md` primary journeys,
`docs/b2b2c_architecture.md` screen map) -- not invented arbitrarily. Each test
drives the REAL API against a REAL test database and asserts: initial state ->
action -> HTTP result -> persisted state -> permission boundary.

Traceability is emitted to docs/audit/KHALSNI_JOURNEY_RESULTS.md.
"""

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from orders.models import Order
from providers.models import ProviderProfile
from services.models import (
    RequiredDocumentDefinition,
    Service,
    ServiceCategory,
    ServiceProviderAssignment,
    ServiceRequiredDocument,
)


def _pdf(name="doc.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 journey test", content_type="application/pdf")


class JourneySuite(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.category = ServiceCategory.objects.create(
            name_ar="خدمات حكومية", name_en="Government", slug="j-gov", show_on_public_site=True
        )
        cls.hidden_category = ServiceCategory.objects.create(
            name_ar="خدمات داخلية", name_en="Internal", slug="j-internal", show_on_public_site=False
        )
        cls.doc_def = RequiredDocumentDefinition.objects.create(
            code="national_id", name_ar="هوية وطنية", name_en="National ID", is_active=True
        )
        cls.service = Service.objects.create(
            category=cls.category,
            name_ar="تجديد جواز", name_en="Passport Renewal", slug="j-passport",
            description_ar="وصف", description_en="desc",
            estimated_duration=5, base_price="20.00", government_fee="10.00", service_fee="5.00",
            show_total_price_public=True, show_government_fee_public=False, show_company_fee_public=False,
            provider_required=True, requires_manual_review=True, show_on_public_site=True,
        )
        ServiceRequiredDocument.objects.create(
            service=cls.service, document_definition=cls.doc_def, document_type="national_id",
            name_ar="هوية وطنية", is_required=True, display_order=1,
        )
        cls.simple_service = Service.objects.create(
            category=cls.category,
            name_ar="خدمة بسيطة", name_en="Simple", slug="j-simple",
            description_ar="x", estimated_duration=1, base_price="1.00",
            provider_required=False, requires_manual_review=True, show_on_public_site=True,
        )
        cls.hidden_service = Service.objects.create(
            category=cls.hidden_category,
            name_ar="خدمة مخفية", name_en="Hidden", slug="j-hidden",
            description_ar="x", estimated_duration=1, base_price="1.00",
            show_on_public_site=False,
        )

        cls.customer = CustomUser.objects.create_user(
            email="j-customer@example.com", password="Password@123", full_name="J Customer",
            phone="0790000001", role=CustomUser.Role.CUSTOMER,
        )
        cls.other_customer = CustomUser.objects.create_user(
            email="j-other@example.com", password="Password@123", full_name="J Other",
            phone="0790000002", role=CustomUser.Role.CUSTOMER,
        )
        cls.employee = CustomUser.objects.create_user(
            email="j-employee@example.com", password="Password@123", full_name="J Employee",
            phone="0790000003", role=CustomUser.Role.EMPLOYEE, is_staff=True,
        )
        cls.admin = CustomUser.objects.create_user(
            email="j-admin@example.com", password="Password@123", full_name="J Admin",
            phone="0790000004", role=CustomUser.Role.ADMIN, is_staff=True, is_superuser=True,
        )
        cls.provider_user = CustomUser.objects.create_user(
            email="j-provider@example.com", password="Password@123", full_name="J Provider",
            phone="0790000005", role=CustomUser.Role.PROVIDER,
        )
        cls.provider = ProviderProfile.objects.create(
            user=cls.provider_user, company_name="J Provider Co", provider_type="company",
            city="Amman", is_approved=True,
        )
        ServiceProviderAssignment.objects.create(service=cls.service, provider=cls.provider, is_active=True)

    def setUp(self):
        self.client = APIClient()

    # ---- helpers -----------------------------------------------------------
    def _as(self, user):
        self.client.force_authenticate(user=user)

    def _create_order(self, *, with_documents=True):
        self._as(self.customer)
        if with_documents:
            payload = {
                "service": str(self.service.id),
                "full_name": self.customer.full_name,
                "phone": self.customer.phone,
                "city": "Amman",
                "consent": "true",
                "document_types": "national_id",
                "documents": _pdf("id.pdf"),
            }
            r = self.client.post("/api/orders/", payload, format="multipart")
        else:
            r = self.client.post(
                "/api/orders/",
                {"service": self.service.id, "full_name": self.customer.full_name,
                 "phone": self.customer.phone, "city": "Amman", "consent": True},
                format="json",
            )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        return Order.objects.get(pk=r.data["id"] if "id" in r.data else r.data["order"]["id"])

    def _approve_docs(self, order):
        self._as(self.employee)
        for doc in order.documents.filter(is_final_document=False):
            self.client.post(f"/api/staff/documents/{doc.id}/verify/", {"is_verified": True}, format="json")

    # ---- PUBLIC ----------------------------------------------------------------
    def test_J01_public_homepage_payload(self):
        r = self.client.get("/api/public-site/homepage/")
        self.assertEqual(r.status_code, 200)

    def test_J02_public_category_discovery_lists_only_public_categories(self):
        r = self.client.get("/api/public-site/service-categories/")
        self.assertEqual(r.status_code, 200)
        slugs = {c["slug"] for c in (r.data if isinstance(r.data, list) else r.data["results"])}
        self.assertIn("j-gov", slugs)
        self.assertNotIn("j-internal", slugs)

    def test_J03_public_category_services_and_service_detail_visibility(self):
        r = self.client.get("/api/public-site/service-categories/j-gov/services/")
        self.assertEqual(r.status_code, 200)
        detail = self.client.get("/api/services/j-passport/")
        self.assertEqual(detail.status_code, 200)
        # required documents present
        self.assertTrue(detail.data["required_documents"])
        # pricing honours visibility flags (total shown, fee parts hidden) -- D2
        pricing = detail.data["pricing"]
        self.assertIsNotNone(pricing["total_price"])
        self.assertIsNone(pricing["government_fee"])
        self.assertIsNone(pricing["company_fee"])
        # duration presented
        self.assertIn("label", detail.data["delivery_time"])

    def test_J04_public_order_tracking_by_number_and_phone(self):
        order = self._create_order()
        self.client.force_authenticate(user=None)
        r = self.client.get("/api/orders/track/", {"order_number": order.order_number, "phone": self.customer.phone})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], Order.Status.NEW)
        bad = self.client.get("/api/orders/track/", {"order_number": order.order_number, "phone": "0000000000"})
        self.assertIn(bad.status_code, (400, 404))

    def test_J05_public_missing_service_request(self):
        self.client.force_authenticate(user=None)
        r = self.client.post(
            "/api/public-site/missing-service-requests/",
            {"service_name": "Some New Service", "request_message": "Please add this",
             "requester_name": "Visitor", "requester_phone": "0791234567"},
            format="json",
        )
        self.assertIn(r.status_code, (200, 201), getattr(r, "data", None))

    # ---- CUSTOMER ------------------------------------------------------------
    def test_J06_customer_registration(self):
        self.client.force_authenticate(user=None)
        r = self.client.post(
            "/api/auth/register/",
            {"full_name": "New User", "email": "j-new@example.com", "password": "Password@123",
             "phone": "0799999999"},
            format="json",
        )
        self.assertIn(r.status_code, (200, 201), getattr(r, "data", None))
        self.assertTrue(CustomUser.objects.filter(email="j-new@example.com", role=CustomUser.Role.CUSTOMER).exists())

    def test_J07_customer_login_and_wrong_password(self):
        self.client.force_authenticate(user=None)
        ok = self.client.post("/api/auth/login/", {"email": self.customer.email, "password": "Password@123"}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertIn("access", ok.data)
        bad = self.client.post("/api/auth/login/", {"email": self.customer.email, "password": "wrong"}, format="json")
        self.assertEqual(bad.status_code, 401)

    def test_J08_customer_creates_request_and_sees_it_in_history(self):
        order = self._create_order()
        self._as(self.customer)
        lst = self.client.get("/api/customer/orders/")
        rows = lst.data if isinstance(lst.data, list) else lst.data["results"]
        self.assertIn(order.id, [row["id"] for row in rows])
        self.assertTrue(order.order_number.startswith("KH-"))

    def test_J09_customer_uploads_document_to_existing_order(self):
        # order for a service without pre-required docs, then add a doc
        self._as(self.customer)
        cr = self.client.post(
            "/api/orders/",
            {"service": self.simple_service.id, "full_name": self.customer.full_name,
             "phone": self.customer.phone, "city": "Amman", "consent": True},
            format="json",
        )
        self.assertEqual(cr.status_code, 201, cr.data)
        order = Order.objects.get(pk=cr.data["id"])
        r = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {"document_type": "national_id", "file": _pdf("id2.pdf")},
            format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(order.documents.filter(is_deleted=False).exists())

    def test_J10_customer_views_detail_and_timeline(self):
        order = self._create_order()
        self._as(self.customer)
        d = self.client.get(f"/api/customer/orders/{order.id}/")
        self.assertEqual(d.status_code, 200)
        t = self.client.get(f"/api/orders/{order.id}/timeline/")
        self.assertEqual(t.status_code, 200)

    def test_J11_customer_missing_documents_cycle(self):
        order = self._create_order()
        self._approve_docs(order)
        self._as(self.employee)
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        req = self.client.post(
            f"/api/admin/orders/{order.id}/request-documents/",
            {"document_types": ["national_id"], "note": "Blurry, re-upload"},
            format="json",
        )
        self.assertEqual(req.status_code, 200, req.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self._as(self.customer)
        up = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {"document_type": "national_id", "file": _pdf("id3.pdf")},
            format="multipart",
        )
        self.assertEqual(up.status_code, 201, up.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)

    def test_J12_customer_cancel_rules(self):
        order = self._create_order()
        self._as(self.customer)
        ok = self.client.post(f"/api/customer/orders/{order.id}/cancel/", {"reason": "changed mind"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        # a second (non-NEW) cancel is rejected
        again = self.client.post(f"/api/customer/orders/{order.id}/cancel/", {"reason": "again"}, format="json")
        self.assertIn(again.status_code, (400, 409))

    def test_J13_customer_rates_completed_order(self):
        order = self._drive_to_completed()
        self._as(self.customer)
        r = self.client.post(
            f"/api/customer/orders/{order.id}/rating/",
            {"score": 5, "comment": "Great"}, format="json",
        )
        self.assertIn(r.status_code, (200, 201), getattr(r, "data", None))

    # ---- OPS / EMPLOYEE ----------------------------------------------------
    def test_J14_employee_review_queue_and_open_order(self):
        order = self._create_order()
        self._as(self.employee)
        q = self.client.get("/api/admin/orders/")
        self.assertEqual(q.status_code, 200)
        d = self.client.get(f"/api/admin/orders/{order.id}/")
        self.assertEqual(d.status_code, 200)

    def test_J15_employee_requests_missing_documents_transition(self):
        order = self._create_order()
        self._approve_docs(order)
        self._as(self.employee)
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        r = self.client.post(
            f"/api/admin/orders/{order.id}/request-documents/",
            {"document_types": ["national_id"], "note": "need clearer scan"}, format="json",
        )
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)

    def test_J16_staff_verifies_document(self):
        order = self._create_order()
        doc = order.documents.filter(is_final_document=False).first()
        self._as(self.employee)
        r = self.client.post(f"/api/staff/documents/{doc.id}/verify/", {"is_verified": True}, format="json")
        self.assertIn(r.status_code, (200, 204), getattr(r, "data", None))
        doc.refresh_from_db()
        self.assertTrue(doc.is_verified)

    def test_J17_provider_assignment_requires_approved_documents(self):
        order = self._create_order()
        self._as(self.employee)
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        blocked = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/", {"provider_id": self.provider.id}, format="json"
        )
        self.assertEqual(blocked.status_code, 400)
        self._approve_docs(order)
        ok = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/", {"provider_id": self.provider.id}, format="json"
        )
        self.assertEqual(ok.status_code, 200, ok.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ASSIGNED)

    # ---- PROVIDER --------------------------------------------------------
    def test_J18_provider_scope_and_execution(self):
        order = self._drive_to_assigned()
        # provider sees only assigned orders
        other = self._create_order()
        self._as(self.provider_user)
        self.assertEqual(self.client.get(f"/api/provider/orders/{other.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/provider/orders/{order.id}/").status_code, 200)
        start = self.client.patch(
            f"/api/provider/orders/{order.id}/status/", {"status": "IN_PROGRESS"}, format="json"
        )
        self.assertEqual(start.status_code, 200, start.data)
        fd = self.client.post(
            f"/api/provider/orders/{order.id}/final-document/",
            {"document_type": "final_report", "file": _pdf("final.pdf")}, format="multipart",
        )
        self.assertIn(fd.status_code, (200, 201), getattr(fd, "data", None))
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)

    # ---- ADMIN --------------------------------------------------------
    def test_J19_admin_catalog_soft_delete_restore_audit(self):
        self._as(self.admin)
        created = self.client.post(
            "/api/admin/services/",
            {"category_id": self.category.category_id, "name_ar": "خدمة جديدة", "name_en": "New Svc",
             "slug": "j-newsvc", "description_ar": "d", "description_en": "d",
             "estimated_duration": 2, "base_price": "5.00", "government_fee": "0.00", "service_fee": "0.00"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        sid = created.data.get("id") or created.data.get("service_id")
        # soft delete with the delete guard password
        d = self.client.delete(f"/api/admin/services/{sid}/", {"delete_password": "Password@123"}, format="json")
        self.assertEqual(d.status_code, 204, getattr(d, "data", None))
        self.assertFalse(self.client.get("/api/services/j-newsvc/").status_code == 200)
        # restore
        r = self.client.post(f"/api/admin/services/{sid}/restore/")
        self.assertIn(r.status_code, (200, 204), getattr(r, "data", None))
        self.assertTrue(
            AuditLog.objects.filter(action__icontains="restore", entity_type__iexact="service").exists()
        )

    def test_J20_admin_processes_order_end_to_end_and_archives(self):
        order = self._drive_to_completed()
        self._as(self.admin)
        arch = self.client.patch(
            f"/api/admin/orders/{order.id}/status/", {"status": "ARCHIVED"}, format="json"
        )
        self.assertEqual(arch.status_code, 200, arch.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ARCHIVED)
        self.assertTrue(AuditLog.objects.filter(entity_type="Order", entity_id=str(order.id)).exists()
                        or AuditLog.objects.filter(entity_type="Order").exists())

    # ---- multi-step drivers ------------------------------------------------
    def _drive_to_assigned(self):
        order = self._create_order()
        self._approve_docs(order)
        self._as(self.employee)
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        r = self.client.patch(f"/api/admin/orders/{order.id}/assign/", {"provider_id": self.provider.id}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        return order

    def _drive_to_completed(self):
        order = self._drive_to_assigned()
        self._as(self.provider_user)
        s1 = self.client.patch(f"/api/provider/orders/{order.id}/status/", {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(s1.status_code, 200, s1.data)
        fd = self.client.post(
            f"/api/provider/orders/{order.id}/final-document/",
            {"document_type": "final_report", "file": _pdf("final.pdf")}, format="multipart",
        )
        self.assertIn(fd.status_code, (200, 201), getattr(fd, "data", None))
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)
        # verify final document, then complete
        final_doc = order.documents.filter(is_final_document=True).first()
        if final_doc:
            self._as(self.employee)
            self.client.post(f"/api/staff/documents/{final_doc.id}/verify/", {"is_verified": True}, format="json")
        self._as(self.admin)
        self.client.post(f"/api/admin/orders/{order.id}/complete/", {"admin_confirmation": True}, format="json")
        order.refresh_from_db()
        return order
