"""Hardening regression suite (KHS findings).

Each test asserts the SAFE behaviour for a weakness found during the release
hardening pass. Finding IDs refer to docs/hardening/KHALSNI_FINDINGS.csv.
"""

from unittest import mock

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile

from accounts.models import CustomUser
from config.tests_acceptance_adversarial import AdversarialBase, _pdf
from documents.models import Document
from notifications.models import Notification
from orders import services as order_services
from orders.models import Order, OrderNote, OrderStatusLog
from organizations.models import Organization, OrganizationMembership
from providers.models import ProviderProfile
from services.models import RequiredDocumentDefinition, ServiceProviderAssignment, ServiceRequiredDocument


class HardeningBase(AdversarialBase):
    def setUp(self):
        super().setUp()
        cache.clear()  # throttle counters must not leak between tests

    def _as(self, user):
        self.client.force_authenticate(user)

    def _start_review(self, order, actor=None):
        self._as(actor or self.admin)
        r = self.client.patch(f"/api/admin/orders/{order.pk}/status/", {"status": "UNDER_REVIEW"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def _approve_all(self, order, actor=None):
        self._as(actor or self.admin)
        for document in order.documents.filter(is_deleted=False, is_final_document=False, is_verified=False):
            r = self.client.post(f"/api/staff/documents/{document.pk}/verify/", {"is_verified": True}, format="json")
            self.assertEqual(r.status_code, 200, r.data)

    def _assign(self, order, provider=None, actor=None):
        self._as(actor or self.admin)
        return self.client.patch(
            f"/api/admin/orders/{order.pk}/assign/", {"provider_id": (provider or self.provider).pk}, format="json"
        )

    def _assigned_order(self, customer=None):
        order = self._order_for(customer or self.customer, self.svc)
        self._start_review(order)
        self._approve_all(order)
        r = self._assign(order)
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        return order

    def _in_progress_order(self, customer=None):
        order = self._assigned_order(customer)
        self._as(self.provider_user)
        r = self.client.patch(f"/api/provider/orders/{order.pk}/status/", {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        return order

    def _provider_final(self, order, user=None):
        self._as(user or self.provider_user)
        return self.client.post(
            f"/api/provider/orders/{order.pk}/final-document/",
            {"document_type": "FINAL_RESULT", "file": _pdf("final.pdf")},
            format="multipart",
        )

    def _ready_order(self, customer=None):
        order = self._in_progress_order(customer)
        r = self._provider_final(order)
        self.assertEqual(r.status_code, 201, r.data)
        order.refresh_from_db()
        return order

    def _completed_order(self, customer=None):
        order = self._ready_order(customer)
        self._as(self.admin)
        final = order.documents.get(is_final_document=True)
        r = self.client.post(f"/api/staff/documents/{final.pk}/verify/", {"is_verified": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        r = self.client.post(f"/api/admin/orders/{order.pk}/complete/", {}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        return order


class PublicTrackingGateTests(HardeningBase):
    """KHS-001: order number alone must never open tracking or a final file."""

    def setUp(self):
        super().setUp()
        self.order = self._completed_order()
        self.final = self.order.documents.get(is_final_document=True)
        CustomUser.objects.filter(pk=self.customer.pk).update(phone="")
        self._as(None)

    def test_track_with_blank_phone_is_not_found(self):
        for query in (f"order_number={self.order.order_number}&phone=", f"order_number={self.order.order_number}"):
            r = self.client.get(f"/api/orders/track/?{query}")
            self.assertEqual(r.status_code, 404, query)

    def test_final_document_with_blank_phone_is_not_found(self):
        for query in (f"order_number={self.order.order_number}&phone=", f"order_number={self.order.order_number}"):
            r = self.client.get(f"/api/documents/{self.final.pk}/download/?{query}")
            self.assertEqual(r.status_code, 404, query)

    def test_track_without_order_number_is_not_found(self):
        r = self.client.get("/api/orders/track/?phone=0790000000")
        self.assertEqual(r.status_code, 404)


class PublicDownloadGateTests(HardeningBase):
    def test_soft_deleted_final_document_is_not_served_publicly(self):
        order = self._completed_order()
        final = order.documents.get(is_final_document=True)
        Document.objects.filter(pk=final.pk).update(is_deleted=True)
        self._as(None)
        r = self.client.get(
            f"/api/documents/{final.pk}/download/?order_number={order.order_number}&phone={self.customer.phone}"
        )
        self.assertEqual(r.status_code, 404)

    def test_download_token_dies_with_the_document(self):
        order = self._completed_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.customer)
        token = self.client.get(f"/api/documents/{final.pk}/download-token/").data["token"]
        Document.objects.filter(pk=final.pk).update(is_deleted=True)
        self._as(None)
        r = self.client.get(f"/api/documents/{final.pk}/download/?token={token}")
        self.assertEqual(r.status_code, 404)


class FinalResultExposureTests(HardeningBase):
    """KHS-003: an unverified or rejected final result is not customer material."""

    def test_unverified_final_result_hidden_from_customer_and_tracking(self):
        order = self._ready_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertEqual(detail.status_code, 200)
        self.assertNotIn(final.pk, [d["id"] for d in detail.data["documents"]])
        self.assertIn(self.client.get(f"/api/documents/{final.pk}/download/").status_code, (403, 404))
        self.assertIn(self.client.get(f"/api/documents/{final.pk}/download-token/").status_code, (403, 404))
        self._as(None)
        track = self.client.get(f"/api/orders/track/?order_number={order.order_number}&phone={self.customer.phone}")
        self.assertEqual(track.status_code, 200)
        self.assertEqual(track.data["final_documents"], [])
        r = self.client.get(
            f"/api/documents/{final.pk}/download/?order_number={order.order_number}&phone={self.customer.phone}"
        )
        self.assertEqual(r.status_code, 404)

    def test_rejected_final_result_is_never_served_to_customer(self):
        order = self._ready_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.admin)
        r = self.client.post(
            f"/api/staff/documents/{final.pk}/verify/", {"is_verified": False, "note": "wrong file"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertNotIn(final.pk, [d["id"] for d in detail.data["documents"]])
        self.assertIn(self.client.get(f"/api/documents/{final.pk}/download/").status_code, (403, 404))

    def test_verified_final_result_of_completed_order_is_downloadable_by_owner_only(self):
        order = self._completed_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.customer)
        self.assertEqual(self.client.get(f"/api/documents/{final.pk}/download/").status_code, 200)
        self._as(self.other_customer)
        self.assertIn(self.client.get(f"/api/documents/{final.pk}/download/").status_code, (403, 404))
        self._as(self.other_provider_user)
        self.assertIn(self.client.get(f"/api/documents/{final.pk}/download/").status_code, (403, 404))
        self._as(None)
        self.assertEqual(self.client.get(f"/api/documents/{final.pk}/download/").status_code, 404)


class CustomerUploadMassAssignmentTests(HardeningBase):
    """KHS-002: the customer cannot mark an upload as the final result."""

    def test_customer_cannot_flag_upload_as_final_document(self):
        order = self._order_for(self.customer, self.svc)
        self._as(self.customer)
        r = self.client.post(
            f"/api/customer/orders/{order.pk}/documents/",
            {"document_type": "national_id", "file": _pdf("id2.pdf"), "is_final_document": "true",
             "verification_note": "approved by manager"},
            format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        document = Document.objects.get(pk=r.data["id"])
        self.assertFalse(document.is_final_document)
        self.assertNotEqual(document.verification_note, "approved by manager")

    def test_customer_cannot_upload_unknown_or_reserved_document_type(self):
        order = self._order_for(self.customer, self.svc)
        self._as(self.customer)
        for document_type in ("FINAL_RESULT", "not_a_requirement"):
            r = self.client.post(
                f"/api/customer/orders/{order.pk}/documents/",
                {"document_type": document_type, "file": _pdf("x.pdf")},
                format="multipart",
            )
            self.assertEqual(r.status_code, 400, document_type)


class CustomerUploadAfterIntakeTests(HardeningBase):
    """KHS-006: a late customer upload must not undo approved readiness."""

    def test_upload_during_provider_work_is_rejected_and_work_can_finish(self):
        order = self._in_progress_order()
        self._as(self.customer)
        r = self.client.post(
            f"/api/customer/orders/{order.pk}/documents/",
            {"document_type": "national_id", "file": _pdf("late.pdf")},
            format="multipart",
        )
        self.assertEqual(r.status_code, 400, r.data)
        self.assertEqual(self._provider_final(order).status_code, 201)

    def test_customer_detail_does_not_offer_upload_after_intake(self):
        order = self._in_progress_order()
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertFalse(detail.data["allowed_actions"]["can_upload_customer_document"])


class ProviderReassignmentIsolationTests(HardeningBase):
    """KHS-004: access follows the current assignment only."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.org_a = Organization.objects.create(
            name="Provider Org A", slug="prov-org-a", organization_type=Organization.OrganizationType.PROVIDER,
        )
        cls.org_b = Organization.objects.create(
            name="Provider Org B", slug="prov-org-b", organization_type=Organization.OrganizationType.PROVIDER,
        )
        cls.colleague = CustomUser.objects.create_user(
            email="adv-colleague@example.com", password="Password@123", full_name="Colleague",
            phone="0791230001", role=CustomUser.Role.PROVIDER,
        )
        ProviderProfile.objects.create(
            user=cls.colleague, company_name="PA2", provider_type="company", city="Amman", is_approved=True,
            organization=cls.org_a,
        )
        cls.membership = OrganizationMembership.objects.create(
            user=cls.colleague, organization=cls.org_a, role=OrganizationMembership.MembershipRole.PROVIDER_EMPLOYEE,
        )
        ProviderProfile.objects.filter(pk=cls.provider.pk).update(organization=cls.org_a)
        cls.provider.refresh_from_db()
        ServiceProviderAssignment.objects.create(service=cls.svc, provider=cls.other_provider, is_active=True)

    def _return_to_review(self, order):
        self._as(self.admin)
        r = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/", {"status": "UNDER_REVIEW", "note": "reassign"}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)

    def test_previous_provider_organization_loses_access_after_reassignment(self):
        order = self._ready_order()
        self._as(self.colleague)
        self.assertEqual(self.client.get(f"/api/provider/orders/{order.pk}/").status_code, 200)
        self._return_to_review(order)
        r = self._assign(order, provider=self.other_provider)
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        self.assertEqual(order.assigned_provider_id, self.other_provider.pk)
        self.assertIsNone(order.assigned_provider_organization_id)
        for user in (self.colleague, self.provider_user):
            self._as(user)
            self.assertEqual(self.client.get(f"/api/provider/orders/{order.pk}/").status_code, 404, user.email)
            self.assertNotIn(order.pk, [row["id"] for row in self.client.get("/api/provider/orders/").data["results"]])
        self._as(self.other_provider_user)
        self.assertEqual(self.client.get(f"/api/provider/orders/{order.pk}/").status_code, 200)

    def test_reassignment_across_provider_organizations_succeeds(self):
        ProviderProfile.objects.filter(pk=self.other_provider.pk).update(organization=self.org_b)
        order = self._ready_order()
        self._return_to_review(order)
        r = self._assign(order, provider=self.other_provider)
        self.assertEqual(r.status_code, 200, r.data)
        order.refresh_from_db()
        self.assertEqual(order.assigned_provider_organization_id, self.org_b.pk)

    def test_inactive_provider_membership_grants_no_access(self):
        order = self._assigned_order()
        OrganizationMembership.objects.filter(pk=self.membership.pk).update(is_active=False)
        self._as(self.colleague)
        self.assertEqual(self.client.get(f"/api/provider/orders/{order.pk}/").status_code, 404)
        r = self.client.patch(f"/api/provider/orders/{order.pk}/status/", {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(r.status_code, 404)


class TimelinePrivacyTests(HardeningBase):
    """KHS-005: internal transition reasons and staff identity stay internal."""

    SECRET = "INTERNAL-ONLY provider invoice dispute"

    def _order_with_internal_reason(self):
        order = self._ready_order()
        self._as(self.admin)
        r = self.client.patch(
            f"/api/admin/orders/{order.pk}/status/", {"status": "IN_PROGRESS", "note": self.SECRET}, format="json"
        )
        self.assertEqual(r.status_code, 200, r.data)
        return order

    def test_customer_detail_hides_internal_transition_reason(self):
        order = self._order_with_internal_reason()
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertNotIn(self.SECRET, str(detail.data))
        for row in detail.data["status_logs"]:
            self.assertNotIn("changed_by", row)

    def test_public_tracking_hides_internal_reason_and_staff_identity(self):
        order = self._order_with_internal_reason()
        self._as(None)
        track = self.client.get(f"/api/orders/track/?order_number={order.order_number}&phone={self.customer.phone}")
        self.assertEqual(track.status_code, 200)
        self.assertNotIn(self.SECRET, str(track.data))
        self.assertNotIn(self.admin.full_name, str(track.data))
        for row in track.data["timeline"]:
            self.assertNotIn("changed_by", row)

    def test_customer_facing_reasons_remain_visible(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._as(self.admin)
        r = self.client.post(f"/api/admin/orders/{order.pk}/reject/", {"reason": "Not eligible"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertIn("Not eligible", [row["note"] for row in detail.data["status_logs"]])

    def test_staff_still_see_full_timeline(self):
        order = self._order_with_internal_reason()
        self._as(self.admin)
        detail = self.client.get(f"/api/admin/orders/{order.pk}/")
        self.assertIn(self.SECRET, [row["note"] for row in detail.data["status_logs"]])
        self.assertIn("changed_by_name", detail.data["status_logs"][0])

    def test_internal_notes_never_reach_customer_or_provider(self):
        order = self._in_progress_order()
        OrderNote.objects.create(order=order, user=self.admin, note="STAFF-ONLY-NOTE", visibility="INTERNAL")
        Order.objects.filter(pk=order.pk).update(internal_notes="STAFF-ONLY-FIELD")
        self._as(self.customer)
        body = str(self.client.get(f"/api/customer/orders/{order.pk}/").data)
        self.assertNotIn("STAFF-ONLY", body)
        self._as(self.provider_user)
        body = str(self.client.get(f"/api/provider/orders/{order.pk}/").data)
        self.assertNotIn("STAFF-ONLY", body)


class StaleActionTests(HardeningBase):
    """KHS-007: a decision taken on a stale copy of the order is refused."""

    def _two_copies(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._approve_all(order)
        return Order.objects.get(pk=order.pk), Order.objects.get(pk=order.pk)

    def test_assignment_after_concurrent_rejection_is_refused(self):
        first, stale = self._two_copies()
        order_services.reject_order(order=first, actor=self.admin, reason="duplicate request")
        with self.assertRaises(ValidationError):
            order_services.assign_provider_to_order(order=stale, provider=self.provider, actor=self.admin)
        fresh = Order.objects.get(pk=first.pk)
        self.assertEqual(fresh.status, Order.Status.REJECTED)
        self.assertIsNone(fresh.assigned_provider_id)
        self.assertEqual(OrderStatusLog.objects.filter(order=fresh, new_status="ASSIGNED").count(), 0)

    def test_double_assignment_keeps_one_provider_and_one_log(self):
        first, stale = self._two_copies()
        order_services.assign_provider_to_order(order=first, provider=self.provider, actor=self.admin)
        ServiceProviderAssignment.objects.create(service=self.svc, provider=self.other_provider, is_active=True)
        with self.assertRaises(ValidationError):
            order_services.assign_provider_to_order(order=stale, provider=self.other_provider, actor=self.admin)
        fresh = Order.objects.get(pk=first.pk)
        self.assertEqual(fresh.assigned_provider_id, self.provider.pk)
        self.assertEqual(OrderStatusLog.objects.filter(order=fresh, new_status="ASSIGNED").count(), 1)
        self.assertEqual(
            Notification.objects.filter(order=fresh, template_key="provider_assigned", recipient=self.provider_user).count(), 1
        )

    def test_stale_cancel_after_completion_is_refused(self):
        order = self._ready_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.admin)
        self.client.post(f"/api/staff/documents/{final.pk}/verify/", {"is_verified": True}, format="json")
        first, stale = Order.objects.get(pk=order.pk), Order.objects.get(pk=order.pk)
        order_services.complete_order(order=first, actor=self.admin)
        with self.assertRaises(ValidationError):
            order_services.cancel_order(order=stale, actor=self.admin, reason="changed mind")
        self.assertEqual(Order.objects.get(pk=order.pk).status, Order.Status.COMPLETED)

    def test_failed_transition_leaves_no_partial_writes(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._approve_all(order)
        logs_before = OrderStatusLog.objects.filter(order=order).count()
        notifications_before = Notification.objects.filter(order=order).count()
        with mock.patch("orders.services.send_notification_event", side_effect=RuntimeError("storage down")):
            with self.assertRaises(RuntimeError):
                order_services.assign_provider_to_order(
                    order=Order.objects.get(pk=order.pk), provider=self.provider, actor=self.admin
                )
        fresh = Order.objects.get(pk=order.pk)
        self.assertEqual(fresh.status, Order.Status.UNDER_REVIEW)
        self.assertIsNone(fresh.assigned_provider_id)
        self.assertEqual(OrderStatusLog.objects.filter(order=order).count(), logs_before)
        self.assertEqual(Notification.objects.filter(order=order).count(), notifications_before)


class ClosedOrderDocumentReviewTests(HardeningBase):
    """KHS-008: document decisions stop when the order is closed."""

    def test_cannot_review_document_of_cancelled_order(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._as(self.admin)
        r = self.client.post(f"/api/admin/orders/{order.pk}/cancel/", {"reason": "customer asked"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        document = order.documents.first()
        for payload in ({"is_verified": True}, {"is_verified": False, "note": "late"}):
            r = self.client.post(f"/api/staff/documents/{document.pk}/verify/", payload, format="json")
            self.assertEqual(r.status_code, 400, payload)
        document.refresh_from_db()
        self.assertEqual(document.status, Document.DocumentStatus.UPLOADED)

    def test_cannot_reject_final_result_of_completed_order(self):
        order = self._completed_order()
        final = order.documents.get(is_final_document=True)
        self._as(self.admin)
        r = self.client.post(
            f"/api/staff/documents/{final.pk}/verify/", {"is_verified": False, "note": "oops"}, format="json"
        )
        self.assertEqual(r.status_code, 400)
        final.refresh_from_db()
        self.assertTrue(final.is_verified)


class HistoricalRequirementIntegrityTests(HardeningBase):
    """KHS-009: catalog edits do not rewrite the requirements of existing orders."""

    def test_new_catalog_requirement_does_not_block_in_flight_order(self):
        order = self._in_progress_order()
        definition = RequiredDocumentDefinition.objects.create(code="new_doc", name_ar="جديد", name_en="New", is_active=True)
        ServiceRequiredDocument.objects.create(
            service=self.svc, document_definition=definition, document_type="new_doc",
            name_ar="جديد", is_required=True, display_order=2,
        )
        self.assertEqual(self._provider_final(order).status_code, 201)
        self._as(self.admin)
        detail = self.client.get(f"/api/admin/orders/{order.pk}/")
        self.assertTrue(detail.data["allowed_actions"]["readiness"]["requirements_complete"])
        self.assertEqual(
            [row["document_type"] for row in detail.data["allowed_actions"]["readiness"]["documents"]], ["national_id"]
        )

    def test_new_orders_use_the_new_requirement(self):
        definition = RequiredDocumentDefinition.objects.create(code="new_doc2", name_ar="جديد", name_en="New", is_active=True)
        ServiceRequiredDocument.objects.create(
            service=self.svc, document_definition=definition, document_type="new_doc2",
            name_ar="جديد", is_required=True, display_order=2,
        )
        self._as(self.customer)
        r = self.client.post(
            "/api/orders/",
            {"service": str(self.svc.id), "full_name": "x", "phone": self.customer.phone, "city": "Amman",
             "consent": "true", "document_types": ["national_id"], "documents": [_pdf("id.pdf")]},
            format="multipart",
        )
        self.assertEqual(r.status_code, 400)

    def test_removed_catalog_requirement_stays_readable_and_enforced_on_old_order(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        ServiceRequiredDocument.objects.filter(service=self.svc, document_type="national_id").update(
            is_active=False, is_deleted=True
        )
        self._as(self.admin)
        detail = self.client.get(f"/api/admin/orders/{order.pk}/")
        readiness = detail.data["allowed_actions"]["readiness"]
        self.assertEqual([row["document_type"] for row in readiness["documents"]], ["national_id"])
        self.assertEqual(readiness["documents"][0]["name_ar"], "هوية")
        self.assertFalse(readiness["requirements_complete"])
        self.assertEqual(self._assign(order).status_code, 400)

    def test_missing_document_cycle_survives_requirement_removal(self):
        order = self._order_for(self.customer, self.svc)
        self._start_review(order)
        self._as(self.admin)
        document = order.documents.first()
        self.client.post(f"/api/staff/documents/{document.pk}/verify/", {"is_verified": False, "note": "blurry"}, format="json")
        r = self.client.post(
            f"/api/admin/orders/{order.pk}/request-documents/",
            {"note": "Please re-upload", "document_types": ["national_id"]}, format="json",
        )
        self.assertEqual(r.status_code, 200, r.data)
        ServiceRequiredDocument.objects.filter(service=self.svc, document_type="national_id").update(
            is_active=False, is_deleted=True
        )
        self._as(self.customer)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertIn("national_id", [row["document_type"] for row in detail.data["required_documents"]])
        r = self.client.post(
            f"/api/customer/orders/{order.pk}/documents/",
            {"document_type": "national_id", "file": _pdf("again.pdf")}, format="multipart",
        )
        self.assertEqual(r.status_code, 201, r.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)


class IdempotencyRaceTests(HardeningBase):
    """KHS-010: a retry that loses the race still gets the original order."""

    KEY = "6f1e7a52-6a1c-4d0e-9a52-0d5c8a4f7b11"

    def _post(self, **extra):
        payload = {"service": self.simple.id, "full_name": "Same", "phone": self.customer.phone,
                   "city": "Amman", "consent": True, **extra}
        return self.client.post("/api/orders/", payload, format="json", HTTP_IDEMPOTENCY_KEY=self.KEY)

    def test_retry_that_misses_the_precheck_returns_the_original_order(self):
        from orders.views import CreateOrderAPIView

        self._as(self.customer)
        first = self._post()
        self.assertEqual(first.status_code, 201, first.data)
        real = CreateOrderAPIView._existing_submission
        calls = {"n": 0}

        def miss_once(customer, key):
            calls["n"] += 1
            return None if calls["n"] == 1 else real(customer, key)

        with mock.patch.object(CreateOrderAPIView, "_existing_submission", staticmethod(miss_once)):
            second = self._post()
        self.assertEqual(second.status_code, 200, second.data)
        self.assertEqual(second.data["id"], first.data["id"])
        self.assertEqual(Order.objects.filter(customer=self.customer, submission_key=self.KEY).count(), 1)

    def test_same_key_other_customer_is_independent(self):
        self._as(self.customer)
        first = self._post()
        self._as(self.other_customer)
        second = self.client.post(
            "/api/orders/",
            {"service": self.simple.id, "full_name": "Other", "phone": self.other_customer.phone,
             "city": "Amman", "consent": True},
            format="json", HTTP_IDEMPOTENCY_KEY=self.KEY,
        )
        self.assertEqual(second.status_code, 201, second.data)
        self.assertNotEqual(second.data["id"], first.data["id"])

    def test_replay_and_conflict_semantics(self):
        self._as(self.customer)
        first = self._post()
        self.assertEqual(self._post().data["id"], first.data["id"])
        self.assertEqual(self._post(city="Irbid").status_code, 409)
        self.assertEqual(Order.objects.filter(customer=self.customer).count(), 1)
        self.assertEqual(Notification.objects.filter(order_id=first.data["id"], recipient=self.customer).count(), 1)
        self.assertEqual(OrderStatusLog.objects.filter(order_id=first.data["id"]).count(), 1)


class ProviderNoteTests(HardeningBase):
    def test_empty_provider_note_is_rejected(self):
        order = self._in_progress_order()
        self._as(self.provider_user)
        r = self.client.post(f"/api/provider/orders/{order.pk}/notes/", {"note": "   "}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(OrderNote.objects.filter(order=order).count(), 0)


class InvalidUploadTests(HardeningBase):
    def _upload(self, order, upload):
        self._as(self.customer)
        return self.client.post(
            f"/api/customer/orders/{order.pk}/documents/",
            {"document_type": "national_id", "file": upload}, format="multipart",
        )

    def test_invalid_uploads_are_rejected(self):
        order = self._order_for(self.customer, self.svc)
        cases = {
            "zero byte": SimpleUploadedFile("empty.pdf", b"", content_type="application/pdf"),
            "exe renamed to pdf": SimpleUploadedFile("tool.pdf", b"MZ\x90\x00binary", content_type="application/pdf"),
            "html as png": SimpleUploadedFile("page.png", b"<html><script>1</script>", content_type="image/png"),
            "wrong extension": SimpleUploadedFile("run.exe", b"%PDF-1.4", content_type="application/pdf"),
            "double extension": SimpleUploadedFile("scan.pdf.html", b"%PDF-1.4", content_type="application/pdf"),
            "mime mismatch": SimpleUploadedFile("scan.pdf", b"%PDF-1.4", content_type="text/html"),
        }
        before = Document.objects.filter(order=order).count()
        for label, upload in cases.items():
            self.assertEqual(self._upload(order, upload).status_code, 400, label)
        self.assertEqual(Document.objects.filter(order=order).count(), before)

    def test_oversized_upload_is_rejected(self):
        order = self._order_for(self.customer, self.svc)
        with self.settings(FILE_UPLOAD_MAX_SIZE=32):
            r = self._upload(order, SimpleUploadedFile("big.pdf", b"%PDF-1.4" + b"0" * 64, content_type="application/pdf"))
        self.assertEqual(r.status_code, 400)

    def test_stored_path_and_response_do_not_leak_filesystem(self):
        order = self._order_for(self.customer, self.svc)
        r = self._upload(order, SimpleUploadedFile("../../etc/passwd.pdf", b"%PDF-1.4 x", content_type="application/pdf"))
        self.assertEqual(r.status_code, 201, r.data)
        document = Document.objects.get(pk=r.data["id"])
        self.assertNotIn("..", document.file.name)
        self.assertNotIn("passwd", document.file.name)
        detail = self.client.get(f"/api/customer/orders/{order.pk}/")
        self.assertNotIn("secure_orders", str(detail.data))
