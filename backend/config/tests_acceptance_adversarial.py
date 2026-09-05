"""Independent final-acceptance adversarial suite.

Written to try to BREAK the system: negative input, IDOR / object-level
authorization, mass assignment, invalid workflow transitions, auth edge cases,
soft-delete leakage, and data-integrity assertions after real workflows. Runs
against the real DRF stack + a real DB.
"""

import io

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from orders.models import Order, OrderStatusLog
from providers.models import ProviderProfile
from services.models import (
    RequiredDocumentDefinition, Service, ServiceCategory,
    ServiceProviderAssignment, ServiceRequiredDocument,
)

PDF = b"%PDF-1.4 adversarial"


def _pdf(name="d.pdf"):
    return SimpleUploadedFile(name, PDF, content_type="application/pdf")


class AdversarialBase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.cat = ServiceCategory.objects.create(name_ar="ت", name_en="C", slug="adv-cat", show_on_public_site=True)
        cls.hidden_cat = ServiceCategory.objects.create(name_ar="خ", name_en="H", slug="adv-hidden", show_on_public_site=False)
        cls.defn = RequiredDocumentDefinition.objects.create(code="national_id", name_ar="هوية", name_en="ID", is_active=True)
        cls.svc = Service.objects.create(
            category=cls.cat, name_ar="خدمة", name_en="Svc", slug="adv-svc",
            description_ar="d", description_en="d", estimated_duration=3,
            base_price="20.00", government_fee="10.00", service_fee="5.00",
            show_total_price_public=True, show_government_fee_public=False, show_company_fee_public=False,
            provider_required=True, requires_manual_review=True, show_on_public_site=True,
        )
        ServiceRequiredDocument.objects.create(
            service=cls.svc, document_definition=cls.defn, document_type="national_id",
            name_ar="هوية", is_required=True, display_order=1,
        )
        cls.simple = Service.objects.create(
            category=cls.cat, name_ar="بسيط", name_en="Simple", slug="adv-simple",
            description_ar="d", estimated_duration=1, base_price="1.00", provider_required=False,
            show_on_public_site=True,
        )
        cls.deleted_svc = Service.objects.create(
            category=cls.cat, name_ar="محذوف", name_en="Del", slug="adv-deleted",
            description_ar="d", estimated_duration=1, base_price="1.00", show_on_public_site=True,
        )
        cls.deleted_svc.soft_delete(reason="adversarial")

        def mk(role, key, **extra):
            return CustomUser.objects.create_user(
                email=f"adv-{key}@example.com", password="Password@123", full_name=f"Adv {key}",
                phone=f"07{9000000 + hash(key) % 900000}", role=role, **extra,
            )
        cls.customer = mk(CustomUser.Role.CUSTOMER, "cust")
        cls.other_customer = mk(CustomUser.Role.CUSTOMER, "cust2")
        cls.employee = mk(CustomUser.Role.EMPLOYEE, "emp", is_staff=True)
        cls.admin = mk(CustomUser.Role.ADMIN, "adm", is_staff=True, is_superuser=True)
        cls.provider_user = mk(CustomUser.Role.PROVIDER, "prov")
        cls.other_provider_user = mk(CustomUser.Role.PROVIDER, "prov2")
        cls.provider = ProviderProfile.objects.create(
            user=cls.provider_user, company_name="P", provider_type="company", city="Amman", is_approved=True,
        )
        cls.other_provider = ProviderProfile.objects.create(
            user=cls.other_provider_user, company_name="P2", provider_type="company", city="Amman", is_approved=True,
        )
        ServiceProviderAssignment.objects.create(service=cls.svc, provider=cls.provider, is_active=True)

    def _order_for(self, customer, service=None):
        service = service or self.simple
        self.client.force_authenticate(customer)
        required = list(
            service.document_requirements.filter(is_active=True, is_deleted=False, is_required=True)
            .values_list("document_type", flat=True)
        )
        if required:
            data = {"service": str(service.id), "full_name": customer.full_name, "phone": customer.phone,
                    "city": "Amman", "consent": "true"}
            data["document_types"] = required
            data["documents"] = [_pdf(f"{t}.pdf") for t in required]
            r = self.client.post("/api/orders/", data, format="multipart")
        else:
            r = self.client.post(
                "/api/orders/",
                {"service": service.id, "full_name": customer.full_name, "phone": customer.phone,
                 "city": "Amman", "consent": True},
                format="json",
            )
        self.assertEqual(r.status_code, 201, r.data)
        self.client.force_authenticate(None)
        return Order.objects.get(pk=r.data["id"])


class NegativeInputTests(AdversarialBase):
    def test_order_create_missing_service(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/orders/", {"full_name": "x", "phone": "0790000000", "city": "A", "consent": True}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_order_create_nonexistent_service_id(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/orders/", {"service": 999999, "full_name": "x", "phone": "0790000000", "city": "A", "consent": True}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_order_create_on_soft_deleted_service_is_rejected(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/orders/", {"service": self.deleted_svc.id, "full_name": "x", "phone": "0790000000", "city": "A", "consent": True}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_order_create_without_consent_rejected(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post("/api/orders/", {"service": self.simple.id, "full_name": "x", "phone": "0790000000", "city": "A"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_xss_payload_in_order_fields_is_stored_escaped_not_executed(self):
        payload = '<script>alert(1)</script>'
        self.client.force_authenticate(self.customer)
        r = self.client.post(
            "/api/orders/",
            {"service": self.simple.id, "full_name": payload, "phone": "0790000000", "city": "A", "consent": True},
            format="json",
        )
        # It may be accepted (stored) or rejected; either is safe. If stored, the
        # API returns it as data (JSON), not as executable HTML.
        self.assertEqual(r.status_code, 201, r.data)
        order = Order.objects.get(pk=r.data["id"])
        order.customer.refresh_from_db()
        self.assertEqual(order.customer.full_name, payload)  # stored verbatim as data
        detail = self.client.get(f"/api/customer/orders/{order.id}/")
        self.assertEqual(detail.status_code, 200)
        # API responds with JSON, never text/html -> payload cannot execute
        self.assertEqual(detail["Content-Type"].split(";")[0], "application/json")

    def test_oversized_full_name_rejected(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post(
            "/api/orders/",
            {"service": self.simple.id, "full_name": "x" * 5000, "phone": "0790000000", "city": "A", "consent": True},
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_upload_wrong_extension_rejected(self):
        order = self._order_for(self.customer, self.svc if False else self.simple)
        self.client.force_authenticate(self.customer)
        bad = SimpleUploadedFile("evil.exe", b"MZ\x90\x00", content_type="application/octet-stream")
        r = self.client.post(f"/api/customer/orders/{order.id}/documents/", {"document_type": "national_id", "file": bad}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_upload_content_extension_mismatch_rejected(self):
        order = self._order_for(self.customer)
        self.client.force_authenticate(self.customer)
        fake = SimpleUploadedFile("id.pdf", b"<html><script>x</script></html>", content_type="application/pdf")
        r = self.client.post(f"/api/customer/orders/{order.id}/documents/", {"document_type": "national_id", "file": fake}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_track_order_malformed_params(self):
        self.client.force_authenticate(None)
        r = self.client.get("/api/orders/track/", {"order_number": "'; DROP TABLE orders;--", "phone": "x"})
        self.assertIn(r.status_code, (400, 404))


class MassAssignmentTests(AdversarialBase):
    def test_order_create_cannot_set_status_or_price(self):
        self.client.force_authenticate(self.customer)
        r = self.client.post(
            "/api/orders/",
            {"service": self.simple.id, "full_name": "x", "phone": "0790000000", "city": "A", "consent": True,
             "status": "COMPLETED", "final_price": "0.00", "assigned_provider": self.provider.id},
            format="json",
        )
        self.assertEqual(r.status_code, 201, r.data)
        order = Order.objects.get(pk=r.data["id"])
        self.assertEqual(order.status, Order.Status.NEW)
        self.assertIsNone(order.assigned_provider_id)
        self.assertNotEqual(order.final_price, 0)  # server computed / left null, not client 0

    def test_rating_cannot_target_another_customers_order(self):
        order = self._order_for(self.other_customer)
        self.client.force_authenticate(self.customer)
        r = self.client.post(f"/api/customer/orders/{order.id}/rating/", {"score": 5, "comment": "x"}, format="json")
        self.assertEqual(r.status_code, 404)


class IdorTests(AdversarialBase):
    def test_customer_cannot_read_or_mutate_others_order(self):
        victim = self._order_for(self.other_customer)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(f"/api/customer/orders/{victim.id}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/customer/orders/{victim.id}/cancel/", {"reason": "x"}, format="json").status_code, 404)
        self.assertEqual(self.client.post(f"/api/customer/orders/{victim.id}/documents/", {"document_type": "national_id", "file": _pdf()}, format="multipart").status_code, 404)

    def test_provider_cannot_touch_unassigned_order(self):
        order = self._order_for(self.customer, self.svc)
        # move to ASSIGNED for the *other* provider path is complex; just assert read/act deny
        self.client.force_authenticate(self.other_provider_user)
        self.assertEqual(self.client.get(f"/api/provider/orders/{order.id}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/provider/orders/{order.id}/status/", {"status": "IN_PROGRESS"}, format="json").status_code, 404)

    def test_customer_cannot_hit_admin_or_staff_endpoints(self):
        self.client.force_authenticate(self.customer)
        for path in ["/api/admin/orders/", "/api/admin/users/", "/api/admin/services/", "/api/admin/audit-logs/",
                     "/api/staff/documents/", "/api/admin/system-settings/"]:
            self.assertIn(self.client.get(path).status_code, (401, 403, 404), path)

    def test_employee_cannot_delete_catalog_records(self):
        self.client.force_authenticate(self.employee)
        r = self.client.delete(f"/api/admin/services/{self.simple.id}/", {"delete_password": "Password@123"}, format="json")
        self.assertIn(r.status_code, (401, 403))
        self.simple.refresh_from_db()
        self.assertFalse(self.simple.is_deleted)

    def test_document_download_denied_cross_customer(self):
        order = self._order_for(self.other_customer)
        self.client.force_authenticate(self.other_customer)
        up = self.client.post(f"/api/customer/orders/{order.id}/documents/", {"document_type": "national_id", "file": _pdf()}, format="multipart")
        self.assertEqual(up.status_code, 201, up.data)
        doc_id = Document.objects.filter(order=order).first().pk
        self.client.force_authenticate(self.customer)
        r = self.client.get(f"/api/documents/{doc_id}/download/")
        self.assertIn(r.status_code, (403, 404))


class InvalidWorkflowTests(AdversarialBase):
    def test_generic_status_endpoint_rejects_non_whitelisted_transition(self):
        order = self._order_for(self.customer, self.svc)
        self.client.force_authenticate(self.admin)
        r = self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "COMPLETED"}, format="json")
        self.assertEqual(r.status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.NEW)

    def test_assign_before_review_rejected(self):
        order = self._order_for(self.customer, self.svc)
        self.client.force_authenticate(self.employee)
        r = self.client.patch(f"/api/admin/orders/{order.id}/assign/", {"provider_id": self.provider.id}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_reject_without_reason_rejected(self):
        order = self._order_for(self.customer, self.svc)
        self.client.force_authenticate(self.employee)
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        r = self.client.post(f"/api/admin/orders/{order.id}/reject/", {}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_complete_without_final_doc_or_confirmation_rejected(self):
        order = self._order_for(self.customer, self.svc)
        self.client.force_authenticate(self.admin)
        # even if we could get it to READY_FOR_DELIVERY, complete needs the flag;
        # from NEW it must simply fail.
        r = self.client.post(f"/api/admin/orders/{order.id}/complete/", {}, format="json")
        self.assertEqual(r.status_code, 400)


class AuthEdgeTests(AdversarialBase):
    def test_garbage_bearer_token_is_401_not_500(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not.a.real.token")
        r = self.client.get("/api/customer/orders/")
        self.assertEqual(r.status_code, 401)

    def test_register_duplicate_email_rejected(self):
        self.client.force_authenticate(None)
        r = self.client.post("/api/auth/register/", {"full_name": "X", "email": self.customer.email, "password": "Password@123", "phone": "0791112223"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_password_reset_token_reuse_rejected(self):
        from accounts.models import PasswordResetToken
        import hashlib
        raw = "reuse-token-value-123456"
        PasswordResetToken.objects.create(
            user=self.customer, token_hash=hashlib.sha256(raw.encode()).hexdigest(),
            expires_at=__import__("django.utils.timezone", fromlist=["now"]).now() + __import__("datetime").timedelta(hours=1),
        )
        first = self.client.post(f"/api/auth/reset-password/{raw}/", {"password": "NewPass@12345", "password_confirm": "NewPass@12345"}, format="json")
        second = self.client.post(f"/api/auth/reset-password/{raw}/", {"password": "NewPass@99999", "password_confirm": "NewPass@99999"}, format="json")
        self.assertIn(second.status_code, (400, 404))


class SoftDeleteLeakageTests(AdversarialBase):
    def test_public_endpoints_never_return_soft_deleted_service(self):
        listing = self.client.get("/api/services/")
        rows = listing.data if isinstance(listing.data, list) else listing.data["results"]
        self.assertNotIn("adv-deleted", [x["slug"] for x in rows])
        self.assertEqual(self.client.get("/api/services/adv-deleted/").status_code, 404)

    def test_public_categories_exclude_hidden(self):
        r = self.client.get("/api/public-site/service-categories/")
        rows = r.data if isinstance(r.data, list) else r.data["results"]
        self.assertNotIn("adv-hidden", [x["slug"] for x in rows])


class DataIntegrityTests(AdversarialBase):
    def test_full_flow_persists_consistent_state(self):
        # customer -> order (with doc) -> review -> approve doc -> assign -> in-progress
        # -> final doc -> verify -> complete -> archive
        self.client.force_authenticate(self.customer)
        cr = self.client.post(
            "/api/orders/",
            {"service": str(self.svc.id), "full_name": self.customer.full_name, "phone": self.customer.phone,
             "city": "Amman", "consent": "true", "document_types": "national_id", "documents": _pdf("id.pdf")},
            format="multipart",
        )
        self.assertEqual(cr.status_code, 201, cr.data)
        order = Order.objects.get(pk=cr.data["id"])
        self.assertRegex(order.order_number, r"^KH-\d{4}-\d{6}$")
        self.assertTrue(order.service_name_snapshot)
        self.assertTrue(order.organization_id)
        self.assertEqual(order.documents.filter(is_final_document=False).count(), 1)

        self.client.force_authenticate(self.employee)
        doc = order.documents.first()
        self.client.post(f"/api/staff/documents/{doc.id}/verify/", {"is_verified": True}, format="json")
        self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "UNDER_REVIEW"}, format="json")
        a = self.client.patch(f"/api/admin/orders/{order.id}/assign/", {"provider_id": self.provider.id}, format="json")
        self.assertEqual(a.status_code, 200, a.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ASSIGNED)
        self.assertEqual(order.assigned_provider_id, self.provider.id)

        self.client.force_authenticate(self.provider_user)
        self.client.patch(f"/api/provider/orders/{order.id}/status/", {"status": "IN_PROGRESS"}, format="json")
        fd = self.client.post(f"/api/provider/orders/{order.id}/final-document/", {"document_type": "final_report", "file": _pdf("final.pdf")}, format="multipart")
        self.assertIn(fd.status_code, (200, 201), getattr(fd, "data", None))
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)

        final_doc = order.documents.filter(is_final_document=True).first()
        self.client.force_authenticate(self.employee)
        self.client.post(f"/api/staff/documents/{final_doc.id}/verify/", {"is_verified": True}, format="json")
        self.client.force_authenticate(self.admin)
        c = self.client.post(f"/api/admin/orders/{order.id}/complete/", {"admin_confirmation": True}, format="json")
        self.assertEqual(c.status_code, 200, c.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.COMPLETED)
        self.assertIsNotNone(order.completed_at)

        # integrity assertions
        logs = OrderStatusLog.objects.filter(order=order).count()
        self.assertGreaterEqual(logs, 4)
        self.assertTrue(AuditLog.objects.filter(entity_type="Order").exists())
        self.assertEqual(order.documents.filter(is_final_document=True).count(), 1)  # no dup finals

        # customer sees the completed state
        self.client.force_authenticate(self.customer)
        cd = self.client.get(f"/api/customer/orders/{order.id}/")
        self.assertEqual(cd.data["status"], Order.Status.COMPLETED)

        # archive
        self.client.force_authenticate(self.admin)
        ar = self.client.patch(f"/api/admin/orders/{order.id}/status/", {"status": "ARCHIVED"}, format="json")
        self.assertEqual(ar.status_code, 200, ar.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ARCHIVED)
        self.assertIsNotNone(order.archived_at)
