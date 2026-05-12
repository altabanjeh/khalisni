from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from documents.models import Document
from notifications.models import Notification
from orders.models import Order
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceProviderAssignment, ServiceRequiredDocument


class OrderFlowEndToEndTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name_ar="خدمات",
            name_en="Services",
            slug="e2e-services",
        )

        self.flow_service = Service.objects.create(
            category=self.category,
            name_ar="خدمة متكاملة",
            name_en="End To End Service",
            slug="end-to-end-service",
            description_ar="تفاصيل الخدمة",
            description_en="Service details",
            estimated_duration=3,
            base_price=10,
            government_fee=4,
            service_fee=5,
            provider_required=True,
            requires_manual_review=True,
        )
        ServiceRequiredDocument.objects.create(
            service=self.flow_service,
            document_type="national_id",
            name_ar="هوية وطنية",
            name_en="National ID",
            is_required=True,
            provider_can_view_file=True,
            display_order=1,
        )
        ServiceRequiredDocument.objects.create(
            service=self.flow_service,
            document_type="authorization_letter",
            name_ar="تفويض",
            name_en="Authorization Letter",
            is_required=True,
            provider_can_view_file=False,
            display_order=2,
        )

        self.missing_docs_service = Service.objects.create(
            category=self.category,
            name_ar="خدمة مراجعة",
            name_en="Review Service",
            slug="review-service",
            description_ar="تفاصيل",
            description_en="Details",
            estimated_duration=2,
            base_price=8,
            government_fee=2,
            service_fee=3,
            provider_required=True,
            requires_manual_review=True,
        )

        self.config_service = Service.objects.create(
            category=self.category,
            name_ar="خدمة إدارة",
            name_en="Config Service",
            slug="config-service",
            description_ar="تفاصيل",
            description_en="Details",
            estimated_duration=1,
            base_price=5,
            government_fee=1,
            service_fee=2,
            provider_required=False,
            requires_manual_review=True,
        )

        self.customer = CustomUser.objects.create_user(
            email="e2e-customer@example.com",
            password="Password@123",
            full_name="E2E Customer",
            phone="0797000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.other_customer = CustomUser.objects.create_user(
            email="e2e-other-customer@example.com",
            password="Password@123",
            full_name="Other Customer",
            phone="0797000002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.employee = CustomUser.objects.create_user(
            email="e2e-employee@example.com",
            password="Password@123",
            full_name="E2E Employee",
            phone="0797000003",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.admin = CustomUser.objects.create_user(
            email="e2e-admin@example.com",
            password="Password@123",
            full_name="E2E Admin",
            phone="0797000004",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.super_admin = CustomUser.objects.create_superuser(
            email="e2e-super-admin@example.com",
            password="Password@123",
            full_name="E2E Super Admin",
        )
        self.provider_user = CustomUser.objects.create_user(
            email="e2e-provider@example.com",
            password="Password@123",
            full_name="E2E Provider",
            phone="0797000005",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )
        self.other_provider_user = CustomUser.objects.create_user(
            email="e2e-provider-2@example.com",
            password="Password@123",
            full_name="Other Provider",
            phone="0797000006",
            role=CustomUser.Role.PROVIDER,
        )
        self.other_provider = ProviderProfile.objects.create(
            user=self.other_provider_user,
            provider_type="Agent",
            city="Irbid",
            is_approved=True,
        )

        for service in (self.flow_service, self.missing_docs_service):
            ServiceProviderAssignment.objects.create(service=service, provider=self.provider, is_active=True)
            ServiceProviderAssignment.objects.create(service=service, provider=self.other_provider, is_active=True)

    def _as(self, user):
        self.client.force_authenticate(user=user)

    def _pdf_upload(self, name, *, content=b"%PDF-1.4 flow test"):
        return SimpleUploadedFile(name, content, content_type="application/pdf")

    def _create_public_order(self, *, service, phone, document_types=None, documents=None, city="Amman"):
        self._as(None)
        payload = {
            "service": str(service.id) if documents else service.id,
            "full_name": "Flow Customer",
            "phone": phone,
            "city": city,
            "notes": "Please process carefully",
            "consent": True if not documents else "true",
        }
        request_format = "json"
        if document_types is not None:
            payload["document_types"] = document_types
        if documents is not None:
            payload["documents"] = documents
            request_format = "multipart"

        response = self.client.post("/api/orders/", payload, format=request_format)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return Order.objects.get(order_number=response.data["order_number"])

    def _start_review(self, order, *, actor=None, note="Start review"):
        self._as(actor or self.employee)
        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": note},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        return response

    def _verify_document(self, document, *, actor=None, is_verified=True, note="Verified"):
        self._as(actor or self.employee)
        response = self.client.post(
            f"/api/staff/documents/{document.id}/verify/",
            {"is_verified": is_verified, "note": note},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        document.refresh_from_db()
        return response

    def _assign_provider(self, order, *, actor=None, note="Assign provider"):
        self._as(actor or self.employee)
        response = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {"provider_id": self.provider.id, "note": note},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        return response

    def _provider_start_work(self, order, *, note="Provider started"):
        self._as(self.provider_user)
        response = self.client.patch(
            f"/api/provider/orders/{order.id}/status/",
            {"status": Order.Status.IN_PROGRESS, "note": note},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        return response

    def _provider_upload_final(self, order, *, filename="final-result.pdf"):
        self._as(self.provider_user)
        response = self.client.post(
            f"/api/provider/orders/{order.id}/final-document/",
            {
                "document_type": "FINAL_RESULT",
                "file": self._pdf_upload(filename),
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        order.refresh_from_db()
        return response

    def _complete_order(self, order, *, actor=None, admin_confirmation=False):
        self._as(actor or self.employee)
        response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": admin_confirmation},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        order.refresh_from_db()
        return response

    def test_scenario_1_normal_successful_order_flow(self):
        order = self._create_public_order(
            service=self.flow_service,
            phone=self.customer.phone,
            document_types=["national_id", "authorization_letter"],
            documents=[self._pdf_upload("national-id.pdf"), self._pdf_upload("authorization-letter.pdf")],
        )
        order.internal_notes = "Internal operations note"
        order.save(update_fields=["internal_notes", "updated_at"])

        self.assertEqual(order.status, Order.Status.NEW)
        self.assertEqual(order.documents.filter(is_final_document=False).count(), 2)

        self._as(order.customer)
        customer_detail = self.client.get(f"/api/customer/orders/{order.id}/")
        self.assertEqual(customer_detail.status_code, status.HTTP_200_OK)
        self.assertNotIn("internal_notes", customer_detail.data)

        self._start_review(order, note="Order under review")
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)

        for document in order.documents.filter(is_final_document=False).order_by("document_type"):
            self._verify_document(document, note=f"Approved {document.document_type}")
            self.assertTrue(document.is_verified)

        self._assign_provider(order, note="Approved for provider assignment")
        self.assertEqual(order.status, Order.Status.ASSIGNED)
        self.assertEqual(order.assigned_provider_id, self.provider.id)

        self._as(self.provider_user)
        provider_detail = self.client.get(f"/api/provider/orders/{order.id}/")
        self.assertEqual(provider_detail.status_code, status.HTTP_200_OK)
        self.assertNotIn("customer", provider_detail.data)
        self.assertNotIn("internal_notes", provider_detail.data)
        self.assertEqual(
            sorted(item["document_type"] for item in provider_detail.data["documents"]),
            ["national_id"],
        )

        self._provider_start_work(order)
        self.assertEqual(order.status, Order.Status.IN_PROGRESS)

        self._provider_upload_final(order)
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)
        final_document = order.documents.filter(is_final_document=True).latest("created_at")
        self.assertTrue(final_document.is_final_document)

        self._verify_document(final_document, note="Final result approved")
        final_document.refresh_from_db()
        self.assertTrue(final_document.is_verified)
        self.assertTrue(order.documents.filter(is_final_document=True).exists())

        self._complete_order(order)
        self.assertEqual(order.status, Order.Status.COMPLETED)

        self._as(order.customer)
        track_response = self.client.get(
            f"/api/orders/track/?order_number={order.order_number}&phone={order.customer.phone}"
        )
        self.assertEqual(track_response.status_code, status.HTTP_200_OK)
        self.assertEqual(track_response.data["status"], Order.Status.COMPLETED)
        self.assertEqual(len(track_response.data["final_documents"]), 1)
        self.assertEqual(track_response.data["final_documents"][0]["document_type"], "FINAL_RESULT")

        status_history = list(order.status_logs.values_list("new_status", flat=True))
        self.assertEqual(
            status_history,
            [
                Order.Status.NEW,
                Order.Status.UNDER_REVIEW,
                Order.Status.ASSIGNED,
                Order.Status.IN_PROGRESS,
                Order.Status.READY_FOR_DELIVERY,
                Order.Status.COMPLETED,
            ],
        )

        self.assertEqual(Notification.objects.filter(order=order, template_key="order_submitted").count(), 3)
        self.assertEqual(Notification.objects.filter(order=order, template_key="order_under_review").count(), 1)
        self.assertEqual(Notification.objects.filter(order=order, template_key="provider_assigned").count(), 2)
        self.assertEqual(Notification.objects.filter(order=order, template_key="provider_started_work").count(), 1)
        self.assertEqual(Notification.objects.filter(order=order, template_key="provider_completed_work").count(), 4)
        self.assertEqual(Notification.objects.filter(order=order, template_key="order_ready_for_delivery").count(), 1)
        self.assertEqual(Notification.objects.filter(order=order, template_key="order_completed").count(), 2)
        self.assertEqual(Notification.objects.filter(order=order, template_key="document_verified").count(), 3)

        for action in [
            "create_order",
            "start_review",
            "assign_provider",
            "provider_status_update",
            "complete_order",
        ]:
            self.assertTrue(
                AuditLog.objects.filter(action=action, entity_type="Order", entity_id=str(order.id)).exists(),
                action,
            )
        self.assertTrue(
            AuditLog.objects.filter(
                action="provider_upload_final_document",
                entity_type="Document",
                entity_id=str(final_document.id),
            ).exists()
        )

    def test_scenario_2_missing_document_flow(self):
        order = self._create_public_order(
            service=self.missing_docs_service,
            phone="0797111111",
        )
        self._start_review(order, note="Need extra files")

        self._as(self.employee)
        request_response = self.client.post(
            f"/api/admin/orders/{order.id}/request-documents/",
            {
                "note": "Please upload both required files.",
                "document_types": ["national_id", "authorization_letter"],
            },
            format="json",
        )
        self.assertEqual(request_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, ["authorization_letter", "national_id"])

        self._as(order.customer)
        first_upload = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {"document_type": "national_id", "file": self._pdf_upload("national-id.pdf")},
            format="multipart",
        )
        self.assertEqual(first_upload.status_code, status.HTTP_201_CREATED, first_upload.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, ["authorization_letter"])

        self._as(self.employee)
        blocked_assign = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {"provider_id": self.provider.id, "note": "Should still be blocked"},
            format="json",
        )
        self.assertEqual(blocked_assign.status_code, status.HTTP_400_BAD_REQUEST)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)

        self._as(order.customer)
        second_upload = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {"document_type": "authorization_letter", "file": self._pdf_upload("authorization-letter.pdf")},
            format="multipart",
        )
        self.assertEqual(second_upload.status_code, status.HTTP_201_CREATED, second_upload.data)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)
        self.assertEqual(order.missing_document_types, [])

        self._assign_provider(order, note="Missing documents resolved")
        self.assertEqual(order.status, Order.Status.ASSIGNED)
        self.assertEqual(Notification.objects.filter(order=order, template_key="client_uploaded_missing_document").count(), 6)

    def test_scenario_3_provider_return_flow(self):
        order = self._create_public_order(
            service=self.flow_service,
            phone="0797222222",
            document_types=["national_id", "authorization_letter"],
            documents=[self._pdf_upload("national-id.pdf"), self._pdf_upload("authorization-letter.pdf")],
        )
        self._start_review(order)
        for document in order.documents.filter(is_final_document=False):
            self._verify_document(document)
        self._assign_provider(order)
        self._provider_start_work(order)
        self._provider_upload_final(order, filename="first-final.pdf")
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)

        final_document = order.documents.filter(is_final_document=True).latest("created_at")
        self._as(self.employee)
        missing_reason_response = self.client.post(
            f"/api/staff/documents/{final_document.id}/verify/",
            {"is_verified": False, "note": ""},
            format="json",
        )
        self.assertEqual(missing_reason_response.status_code, status.HTTP_400_BAD_REQUEST)

        reject_response = self.client.post(
            f"/api/staff/documents/{final_document.id}/verify/",
            {"is_verified": False, "note": "Please fix the provider result formatting."},
            format="json",
        )
        self.assertEqual(reject_response.status_code, status.HTTP_200_OK, reject_response.data)
        final_document.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(final_document.status, Document.DocumentStatus.REJECTED)
        self.assertEqual(order.status, Order.Status.IN_PROGRESS)

        self._as(self.provider_user)
        provider_detail = self.client.get(f"/api/provider/orders/{order.id}/")
        self.assertEqual(provider_detail.status_code, status.HTTP_200_OK)
        self.assertTrue(
            any(
                item["new_status"] == Order.Status.IN_PROGRESS
                and "Please fix the provider result formatting." in (item.get("note") or "")
                for item in provider_detail.data["status_logs"]
            )
        )

        other_provider_order = Order.objects.create(
            customer=self.other_customer,
            service=self.missing_docs_service,
            city="Irbid",
            status=Order.Status.ASSIGNED,
            assigned_provider=self.other_provider,
        )
        hidden_response = self.client.get(f"/api/provider/orders/{other_provider_order.id}/")
        self.assertEqual(hidden_response.status_code, status.HTTP_404_NOT_FOUND)

        self._provider_upload_final(order, filename="corrected-final.pdf")
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)
        corrected_final = order.documents.filter(is_final_document=True).latest("created_at")
        self._verify_document(corrected_final, note="Corrected result approved")
        self._complete_order(order)
        self.assertEqual(order.status, Order.Status.COMPLETED)

        self.assertEqual(Notification.objects.filter(order=order, template_key="document_rejected").count(), 1)
        self.assertTrue(
            AuditLog.objects.filter(
                action="reject_document",
                entity_type="Document",
                entity_id=str(final_document.id),
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="return_order_after_final_document_rejection",
                entity_type="Order",
                entity_id=str(order.id),
            ).exists()
        )

    def test_scenario_4_unauthorized_access_controls(self):
        own_order = Order.objects.create(
            customer=self.customer,
            service=self.missing_docs_service,
            city="Amman",
        )
        own_order.internal_notes = "Private internal detail"
        own_order.customer_notes = "Customer visible note"
        own_order.assigned_provider = self.provider
        own_order.status = Order.Status.ASSIGNED
        own_order.save()
        other_customer_order = Order.objects.create(
            customer=self.other_customer,
            service=self.missing_docs_service,
            city="Irbid",
        )
        unassigned_order = Order.objects.create(
            customer=self.other_customer,
            service=self.missing_docs_service,
            city="Zarqa",
        )
        ready_order = Order.objects.create(
            customer=self.customer,
            service=self.missing_docs_service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
        )

        self._as(self.customer)
        other_customer_response = self.client.get(f"/api/customer/orders/{other_customer_order.id}/")
        self.assertEqual(other_customer_response.status_code, status.HTTP_404_NOT_FOUND)

        own_customer_response = self.client.get(f"/api/customer/orders/{own_order.id}/")
        self.assertEqual(own_customer_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("internal_notes", own_customer_response.data)

        self._as(self.provider_user)
        unassigned_response = self.client.get(f"/api/provider/orders/{unassigned_order.id}/")
        self.assertEqual(unassigned_response.status_code, status.HTTP_404_NOT_FOUND)
        assigned_response = self.client.get(f"/api/provider/orders/{own_order.id}/")
        self.assertEqual(assigned_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("internal_notes", assigned_response.data)
        self.assertNotIn("notes", assigned_response.data)

        self._as(self.employee)
        settings_response = self.client.get("/api/admin/system-settings/")
        self.assertEqual(settings_response.status_code, status.HTTP_403_FORBIDDEN)

        self._as(self.admin)
        protected_status_response = self.client.patch(
            f"/api/admin/order-records/{own_order.id}/",
            {"status": Order.Status.COMPLETED},
            format="json",
        )
        self.assertEqual(protected_status_response.status_code, status.HTTP_400_BAD_REQUEST)

        generic_complete_response = self.client.patch(
            f"/api/admin/orders/{ready_order.id}/status/",
            {"status": Order.Status.COMPLETED, "note": "Bypass"},
            format="json",
        )
        self.assertEqual(generic_complete_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_scenario_5_admin_configuration_rule_change_affects_new_orders_only(self):
        old_completed_order = Order.objects.create(
            customer=self.customer,
            service=self.config_service,
            city="Amman",
            status=Order.Status.COMPLETED,
            completed_at=timezone.now(),
        )

        self._as(self.admin)
        create_rule_response = self.client.post(
            "/api/admin/service-documents/",
            {
                "service_id": self.config_service.id,
                "document_type": "national_id",
                "name_ar": "هوية",
                "name_en": "National ID",
                "is_required": True,
                "allowed_extensions": [".pdf"],
                "max_file_size": 1024 * 1024,
                "requires_verification": True,
                "client_can_replace_file": True,
                "provider_can_view_file": False,
                "display_order": 1,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(create_rule_response.status_code, status.HTTP_201_CREATED, create_rule_response.data)
        rule_id = create_rule_response.data["id"]

        update_rule_response = self.client.patch(
            f"/api/admin/service-documents/{rule_id}/",
            {"provider_can_view_file": True},
            format="json",
        )
        self.assertEqual(update_rule_response.status_code, status.HTTP_200_OK, update_rule_response.data)
        self.assertTrue(
            AuditLog.objects.filter(entity_type="ServiceRequiredDocument", entity_id=str(rule_id)).exists()
        )

        self._as(None)
        new_order_response = self.client.post(
            "/api/orders/",
            {
                "service": self.config_service.id,
                "full_name": "Config Customer",
                "phone": "0797333333",
                "city": "Amman",
                "notes": "No docs attached",
                "consent": True,
            },
            format="json",
        )
        self.assertEqual(new_order_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("documents", new_order_response.data)

        old_completed_order.refresh_from_db()
        self.assertEqual(old_completed_order.status, Order.Status.COMPLETED)

        self._as(self.admin)
        delete_audit_response = self.client.delete("/api/admin/audit-logs/")
        self.assertIn(
            delete_audit_response.status_code,
            {status.HTTP_405_METHOD_NOT_ALLOWED, status.HTTP_404_NOT_FOUND},
        )

    def test_scenario_6_cancellation_and_reopening_rules(self):
        active_order = Order.objects.create(
            customer=self.customer,
            service=self.missing_docs_service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee,
        )
        completed_order = Order.objects.create(
            customer=self.customer,
            service=self.config_service,
            city="Amman",
            status=Order.Status.COMPLETED,
            completed_at=timezone.now(),
            assigned_employee=self.employee,
        )

        self._as(self.admin)
        cancel_missing_reason = self.client.post(
            f"/api/admin/orders/{active_order.id}/cancel/",
            {"reason": ""},
            format="json",
        )
        self.assertEqual(cancel_missing_reason.status_code, status.HTTP_400_BAD_REQUEST)

        cancel_response = self.client.post(
            f"/api/admin/orders/{active_order.id}/cancel/",
            {"reason": "Client requested cancellation"},
            format="json",
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_200_OK, cancel_response.data)
        active_order.refresh_from_db()
        self.assertEqual(active_order.status, Order.Status.CANCELLED)

        completed_edit_response = self.client.patch(
            f"/api/admin/order-records/{completed_order.id}/",
            {"city": "Irbid"},
            format="json",
        )
        self.assertEqual(completed_edit_response.status_code, status.HTTP_400_BAD_REQUEST)

        self._as(self.employee)
        employee_reopen_response = self.client.patch(
            f"/api/admin/orders/{completed_order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Try to reopen"},
            format="json",
        )
        self.assertEqual(employee_reopen_response.status_code, status.HTTP_400_BAD_REQUEST)

        self._as(self.admin)
        missing_reason_reopen = self.client.patch(
            f"/api/admin/orders/{completed_order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": ""},
            format="json",
        )
        self.assertEqual(missing_reason_reopen.status_code, status.HTTP_400_BAD_REQUEST)

        reopen_response = self.client.patch(
            f"/api/admin/orders/{completed_order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Reopened for correction"},
            format="json",
        )
        self.assertEqual(reopen_response.status_code, status.HTTP_200_OK, reopen_response.data)
        completed_order.refresh_from_db()
        self.assertEqual(completed_order.status, Order.Status.UNDER_REVIEW)
        self.assertIsNone(completed_order.completed_at)
