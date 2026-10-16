"""Regression tests for the P1 remediation of audit findings B02, F02 and F05."""

import json
import struct
import zlib
from io import StringIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from notifications.models import Notification
from orders.models import MissingDocumentRequest, Order, OrderStatusLog
from orders.services import request_missing_documents, review_order
from services.models import Service, ServiceCategory, ServiceRequiredDocument

DOC = "authorization"
PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def _png():
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00"))
        + chunk(b"IEND", b"")
    )


class P1RemediationBase(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="p1-category")
        self.service = Service.objects.create(
            category=category, name_ar="خدمة", name_en="Service", slug="p1-service", description_ar="وصف",
        )
        self.requirement = ServiceRequiredDocument.objects.create(
            service=self.service, document_type=DOC, name_ar="تفويض", name_en="Authorization",
            is_required=True, allowed_extensions=[".pdf"], max_file_size=50_000, display_order=1,
        )
        make = CustomUser.objects.create_user
        self.customer = make(email="p1-customer@example.test", password="Password@123", full_name="Customer",
                             phone="0791000001", role=CustomUser.Role.CUSTOMER)
        self.employee = make(email="p1-employee@example.test", password="Password@123", full_name="Employee",
                             phone="0791000002", role=CustomUser.Role.EMPLOYEE)
        self.admin = make(email="p1-admin@example.test", password="Password@123", full_name="Admin",
                          phone="0791000003", role=CustomUser.Role.ADMIN, is_staff=True)
        self.provider = make(email="p1-provider@example.test", password="Password@123", full_name="Provider",
                             phone="0791000004", role=CustomUser.Role.PROVIDER)

    def waiting_order(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        review_order(order=order, actor=self.employee, note="review")
        request_missing_documents(order=order, actor=self.employee, note_text="Upload the PDF.",
                                  missing_document_types=[DOC])
        order.refresh_from_db()
        return order

    def legacy_waiting_order(self, missing_types=None):
        # Shape of the original KH-2026-000001 record: waiting, but no open request.
        return Order.objects.create(
            customer=self.customer, service=self.service, city="Amman",
            status=Order.Status.WAITING_CUSTOMER, missing_document_types=list(missing_types or []),
        )

    def upload(self, order, name, content, content_type):
        self.client.force_authenticate(self.customer)
        return self.client.post(
            f"/api/customer/orders/{order.pk}/documents/",
            {"document_type": DOC, "file": SimpleUploadedFile(name, content, content_type=content_type)},
            format="multipart",
        )


class B02RequirementFileRulesTests(P1RemediationBase):
    def assert_rejected_without_side_effects(self, order, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, [DOC])
        self.assertFalse(Document.objects.filter(order=order).exists())
        self.assertTrue(order.missing_document_requests.filter(is_resolved=False).exists())
        self.assertFalse(OrderStatusLog.objects.filter(order=order, new_status=Order.Status.UNDER_REVIEW,
                                                       old_status=Order.Status.WAITING_CUSTOMER).exists())
        self.assertFalse(Notification.objects.filter(order=order, template_key="client_uploaded_missing_document").exists())

    def test_pdf_on_pdf_only_requirement_is_accepted_and_resumes_review(self):
        order = self.waiting_order()
        response = self.upload(order, "authorization.pdf", PDF, "application/pdf")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)

    def test_png_on_pdf_only_requirement_is_rejected_without_side_effects(self):
        order = self.waiting_order()
        response = self.upload(order, "authorization.png", _png(), "image/png")
        self.assertIn("Unsupported file extension for this document.", str(response.data["file"]))
        self.assert_rejected_without_side_effects(order, response)

    def test_png_renamed_to_pdf_is_rejected(self):
        order = self.waiting_order()
        response = self.upload(order, "authorization.pdf", _png(), "application/pdf")
        self.assert_rejected_without_side_effects(order, response)

    def test_html_renamed_to_pdf_is_still_rejected(self):
        order = self.waiting_order()
        response = self.upload(order, "authorization.pdf", b"<html><script>x</script></html>", "application/pdf")
        self.assert_rejected_without_side_effects(order, response)

    def test_executable_is_still_rejected(self):
        order = self.waiting_order()
        response = self.upload(order, "authorization.exe", b"MZ" + b"\x00" * 64, "application/octet-stream")
        self.assert_rejected_without_side_effects(order, response)

    def test_requirement_size_limit_is_enforced(self):
        order = self.waiting_order()
        oversized = PDF + b"%" + b"0" * 60_000  # above the requirement's 50 KB, below the global limit
        response = self.upload(order, "authorization.pdf", oversized, "application/pdf")
        self.assertIn("This document exceeds the allowed file size.", str(response.data["file"]))
        self.assert_rejected_without_side_effects(order, response)

    def test_order_creation_keeps_the_same_requirement_rules(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post("/api/orders/", {
            "service": self.service.pk, "full_name": "Customer", "phone": "0791000001", "city": "Amman",
            "consent": "true", "document_types": DOC,
            "documents": SimpleUploadedFile("authorization.png", _png(), content_type="image/png"),
        }, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["document_errors"][DOC], "Unsupported file extension for this document.")
        self.assertFalse(Order.objects.filter(customer=self.customer).exists())


class F02LegacyMissingRequestTests(P1RemediationBase):
    def actions(self, user, order):
        self.client.force_authenticate(user)
        path = f"/api/customer/orders/{order.pk}/" if user.role == CustomUser.Role.CUSTOMER else f"/api/admin/orders/{order.pk}/"
        return self.client.get(path).data["allowed_actions"]

    def test_allowed_actions_flag_legacy_request_as_invalid(self):
        legacy = self.legacy_waiting_order()
        customer_actions = self.actions(self.customer, legacy)
        self.assertIs(customer_actions["missing_document_request_valid"], False)
        self.assertFalse(customer_actions["can_recover_missing_document_request"])
        self.assertTrue(self.actions(self.employee, legacy)["can_recover_missing_document_request"])
        self.assertTrue(self.actions(self.admin, legacy)["can_recover_missing_document_request"])

    def test_valid_request_is_not_recoverable_and_still_works(self):
        order = self.waiting_order()
        self.assertIs(self.actions(self.customer, order)["missing_document_request_valid"], True)
        self.assertFalse(self.actions(self.employee, order)["can_recover_missing_document_request"])
        self.client.force_authenticate(self.employee)
        response = self.client.post(f"/api/admin/orders/{order.pk}/recover-missing-documents/", {"reason": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(self.upload(order, "authorization.pdf", PDF, "application/pdf").status_code, status.HTTP_201_CREATED)

    def test_staff_recovery_returns_order_to_review_with_audit_trail(self):
        legacy = self.legacy_waiting_order(["legal_authorization"])
        self.client.force_authenticate(self.employee)
        url = f"/api/admin/orders/{legacy.pk}/recover-missing-documents/"
        self.assertEqual(self.client.post(url, {"reason": ""}, format="json").status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.post(url, {"reason": "Legacy request named no configured document"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.UNDER_REVIEW)
        self.assertEqual(legacy.missing_document_types, [])
        log = OrderStatusLog.objects.get(order=legacy, old_status=Order.Status.WAITING_CUSTOMER)
        self.assertEqual(log.new_status, Order.Status.UNDER_REVIEW)
        self.assertEqual(log.changed_by, self.employee)
        self.assertIn("Legacy request named no configured document", log.note)
        detail = AuditLog.objects.get(action="recover_missing_document_request_detail", entity_id=str(legacy.pk))
        self.assertEqual(detail.user, self.employee)
        self.assertEqual(detail.old_values["missing_document_types"], ["legal_authorization"])
        self.assertEqual(detail.new_values["status"], Order.Status.UNDER_REVIEW)
        self.assertTrue(AuditLog.objects.filter(action="recover_missing_document_request", entity_id=str(legacy.pk)).exists())

    def test_customer_and_provider_cannot_recover(self):
        legacy = self.legacy_waiting_order()
        for user in (self.customer, self.provider):
            self.client.force_authenticate(user)
            response = self.client.post(f"/api/admin/orders/{legacy.pk}/recover-missing-documents/", {"reason": "x"}, format="json")
            self.assertIn(response.status_code, {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND})
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.WAITING_CUSTOMER)

    def test_audit_command_is_dry_run_by_default(self):
        legacy = self.legacy_waiting_order()
        self.waiting_order()
        out = StringIO()
        call_command("audit_missing_document_requests", "--json", stdout=out)
        report = json.loads(out.getvalue())
        self.assertTrue(report["dry_run"])
        self.assertEqual([row["order_number"] for row in report["orders"]], [legacy.order_number])
        self.assertEqual(report["orders"][0]["classification"], "no_request_no_recorded_types")
        self.assertNotIn(self.customer.phone, out.getvalue())
        call_command("audit_missing_document_requests", "--order", legacy.order_number, "--action", "return-to-review", stdout=StringIO())
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.WAITING_CUSTOMER)

    def test_audit_command_repairs_only_with_explicit_choice(self):
        legacy = self.legacy_waiting_order()
        with self.assertRaises(CommandError):
            call_command("audit_missing_document_requests", "--apply", "--order", legacy.order_number, stdout=StringIO())
        with self.assertRaises(CommandError):  # recorded types missing: never guesses a document
            call_command("audit_missing_document_requests", "--apply", "--order", legacy.order_number,
                         "--action", "recreate-request", "--actor", self.admin.email, "--reason", "x", stdout=StringIO())
        call_command("audit_missing_document_requests", "--apply", "--order", legacy.order_number,
                     "--action", "return-to-review", "--actor", self.admin.email, "--reason", "Ops repair", stdout=StringIO())
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.UNDER_REVIEW)

    def test_audit_command_recreates_request_from_recorded_configured_types(self):
        legacy = self.legacy_waiting_order([DOC])
        call_command("audit_missing_document_requests", "--apply", "--order", legacy.order_number,
                     "--action", "recreate-request", "--actor", self.admin.email, "--reason", "Restore request", stdout=StringIO())
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(MissingDocumentRequest.objects.get(order=legacy, is_resolved=False).document_types, [DOC])
        self.assertEqual(self.upload(legacy, "authorization.pdf", PDF, "application/pdf").status_code, status.HTTP_201_CREATED)
        legacy.refresh_from_db()
        self.assertEqual(legacy.status, Order.Status.UNDER_REVIEW)


class F05WorkflowReasonCodeTests(P1RemediationBase):
    def transitions(self, user, order):
        self.client.force_authenticate(user)
        return {row["action"]: row for row in self.client.get(f"/api/admin/orders/{order.pk}/").data["allowed_actions"]["workflow_transitions"]}

    def test_blocked_reasons_carry_stable_codes(self):
        order = self.waiting_order()
        rows = self.transitions(self.admin, order)
        self.assertTrue(rows["cancel_order"]["available"])
        self.assertTrue(rows["cancel_order"]["reason_required"])
        self.assertEqual(rows["cancel_order"]["blocked"], [])
        resume = rows["resume_review"]
        self.assertFalse(resume["available"])
        self.assertEqual(resume["blocked"], [{"code": "requested_documents_pending", "params": {"document_types": [DOC]}}])
        self.assertEqual(len(resume["blocked_reasons"]), 1)  # English text kept for existing clients

    def test_role_block_is_coded(self):
        order = self.waiting_order()
        Order.objects.filter(pk=order.pk).update(status=Order.Status.ASSIGNED)  # only the rule list is read
        start = self.transitions(self.admin, order)["provider_start_work"]
        self.assertEqual(start["blocked"][0]["code"], "role_not_allowed")
        self.assertEqual(start["blocked"][0]["params"]["allowed_roles"], ["provider"])

    def test_admin_cancel_of_waiting_order_matches_allowed_action(self):
        order = self.waiting_order()
        self.client.force_authenticate(self.admin)
        response = self.client.post(f"/api/admin/orders/{order.pk}/cancel/", {"reason": "Customer withdrew"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)
        self.assertEqual(self.transitions(self.admin, order).get("cancel_order"), None)
