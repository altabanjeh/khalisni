"""Final pre-release hardening: consent evidence immutability and the
verification-note exposure boundary."""

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.db import IntegrityError, connection, transaction
from django.db.models import ProtectedError
from django.urls import get_resolver
from django.utils import timezone

from documents.models import Document
from documents.serializers import ProviderDocumentSerializer
from orders.consent import CONSENT_TEXTS
from orders.models import Order, OrderConsent
from orders.tests_owner_decisions import OwnerDecisionBase, walk_keys

WEB_TEXT = CONSENT_TEXTS["order-consent-web-v1"]["ar"]


class ConsentImmutabilityTests(OwnerDecisionBase):
    def setUp(self):
        super().setUp()
        response = self.as_user(self.customer).post(
            "/api/orders/",
            {"service": self.service.pk, "full_name": "Customer", "phone": "0791200001", "city": "Amman",
             "consent": "true", "consent_version": "order-consent-web-v1", "consent_source": "web"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.order = Order.objects.get(pk=response.data["id"])
        self.record = OrderConsent.objects.get(order=self.order)

    def assertEvidenceIntact(self):
        self.assertEqual(OrderConsent.objects.filter(order=self.order).count(), 1)
        row = OrderConsent.objects.get(pk=self.record.pk)
        self.assertEqual((row.accepted, row.consent_text, row.consent_version), (True, WEB_TEXT, "order-consent-web-v1"))

    def test_update_is_refused_on_every_application_path(self):
        self.record.consent_text = "rewritten"
        with self.assertRaises(ValidationError):
            self.record.save()
        with self.assertRaises(ValidationError):
            OrderConsent.objects.filter(pk=self.record.pk).update(consent_text="rewritten")
        with self.assertRaises(ValidationError):
            OrderConsent._base_manager.filter(pk=self.record.pk).update(accepted=False)
        with self.assertRaises(ValidationError):
            self.order.consents.update(accepted=False)
        with self.assertRaises(ValidationError):
            OrderConsent.objects.bulk_update([self.record], ["consent_text"])
        self.assertEvidenceIntact()

    def test_model_delete_is_refused(self):
        with self.assertRaises(ValidationError):
            self.record.delete()
        self.assertEvidenceIntact()

    def test_bulk_application_deletion_is_refused(self):
        for queryset in (
            OrderConsent.objects.all(),
            OrderConsent.objects.filter(order=self.order),
            OrderConsent._base_manager.all(),
            self.order.consents.all(),
            self.customer.order_consents.all(),
        ):
            with self.assertRaises(ValidationError):
                queryset.delete()
        self.assertEvidenceIntact()

    def test_database_refuses_raw_update_and_delete(self):
        if connection.vendor not in {"sqlite", "postgresql"}:
            self.skipTest("No append-only trigger dialect for this database.")
        table = OrderConsent._meta.db_table
        for sql in (f"UPDATE {table} SET accepted = %s", f"DELETE FROM {table} WHERE consent_id = %s"):
            params = [False] if sql.startswith("UPDATE") else [self.record.pk]
            with self.assertRaises(IntegrityError), transaction.atomic(), connection.cursor() as cursor:
                cursor.execute(sql, params)
        self.assertEvidenceIntact()

    def test_hard_deleting_the_order_or_customer_cannot_cascade_into_evidence(self):
        with self.assertRaises(ProtectedError), transaction.atomic():
            self.order.delete()
        with self.assertRaises(ProtectedError), transaction.atomic():
            self.customer.delete()
        self.assertEvidenceIntact()

    def test_ordinary_order_archive_and_account_soft_delete_keep_the_evidence(self):
        # The admin "delete" of an order record archives it (orders/views.py).
        response = self.as_user(self.admin).delete(
            f"/api/admin/order-records/{self.order.pk}/",
            {"delete_password": "Password@123", "delete_reason": "QA archive"},
            format="json",
        )
        self.assertEqual(response.status_code, 204, getattr(response, "data", response.content))
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.ARCHIVED)
        self.assertEvidenceIntact()
        # Business soft delete of the customer account keeps the evidence too.
        self.customer.soft_delete(user=self.admin, reason="QA account removal")
        self.assertEvidenceIntact()

    def test_no_api_route_or_admin_screen_can_mutate_evidence(self):
        routes = []

        def collect(patterns, prefix=""):
            for pattern in patterns:
                text = prefix + str(pattern.pattern)
                if hasattr(pattern, "url_patterns"):
                    collect(pattern.url_patterns, text)
                else:
                    routes.append(text)

        collect(get_resolver().url_patterns)
        self.assertFalse([route for route in routes if "consent" in route.lower()])
        if admin.site.is_registered(OrderConsent):
            model_admin = admin.site._registry[OrderConsent]
            request = type("Request", (), {"user": self.admin})()
            self.assertFalse(model_admin.has_change_permission(request, self.record))
            self.assertFalse(model_admin.has_delete_permission(request, self.record))
        # Order write paths ignore a smuggled consent payload.
        patch = self.as_user(self.admin).patch(
            f"/api/admin/order-records/{self.order.pk}/",
            {"consent": {"accepted": False}, "consents": [], "consent_version": "x"},
            format="json",
        )
        self.assertLess(patch.status_code, 500)
        self.assertEvidenceIntact()


class VerificationNoteBoundaryTests(OwnerDecisionBase):
    NOTE = "Staff approval note for the final result."

    def setUp(self):
        super().setUp()
        self.order = self.order_for(
            self.customer, status=Order.Status.COMPLETED, completed_at=timezone.now(), assigned_provider=self.provider,
        )
        self.final = self.upload(self.order, name="final.pdf", uploaded_by=self.provider_user)
        Document.objects.filter(pk=self.final.pk).update(is_final_document=True)
        self.final.refresh_from_db()
        self.final.mark_verified(user=self.employee, note=self.NOTE)

    def test_public_tracking_never_receives_the_note(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/orders/track/", {"order_number": self.order.order_number, "phone": "0791200001"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["final_documents"], "the completed final result is listed")
        keys = {key for _, key, _ in walk_keys(response.json())}
        self.assertNotIn("verification_note", keys)
        self.assertNotIn(self.NOTE, response.content.decode())

    def test_owning_customer_behaviour_is_unchanged(self):
        response = self.as_user(self.customer).get(f"/api/customer/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 200)
        row = next(document for document in response.data["documents"] if document["id"] == self.final.pk)
        self.assertEqual(row["verification_note"], self.NOTE)

    def test_other_customers_never_receive_the_note(self):
        response = self.as_user(self.other_customer).get(f"/api/customer/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 404)
        listing = self.as_user(self.other_customer).get("/api/customer/orders/")
        self.assertNotIn(self.NOTE, listing.content.decode())

    def test_staff_keep_the_note_and_providers_follow_their_serializer(self):
        response = self.as_user(self.admin).get(f"/api/admin/orders/{self.order.pk}/")
        self.assertEqual(response.status_code, 200, response.data)
        row = next(document for document in response.data["documents"] if document["id"] == self.final.pk)
        self.assertEqual(row["verification_note"], self.NOTE)
        # Provider payloads never carried the note (documented provider fields).
        self.assertNotIn("verification_note", ProviderDocumentSerializer.Meta.fields)
