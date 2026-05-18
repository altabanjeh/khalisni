from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from audit.models import AuditLog
from notifications.models import Notification
from orders.models import Order
from providers.models import ProviderProfile
from services.order_completion import create_related_service_notifications
from services.models import Service, ServiceCategory, ServiceRelation, ServiceRequiredDocument


class OrderAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.category = ServiceCategory.objects.create(
            name_ar="خدمات عامة",
            name_en="General Services",
            slug="general-services",
        )
        self.service = Service.objects.create(
            category=self.category,
            name_ar="خدمة تجريبية",
            name_en="Demo Service",
            slug="demo-service",
            description_ar="تفاصيل الخدمة",
            estimated_duration=3,
            base_price=10,
            government_fee=5,
            service_fee=5,
        )
        self.customer = CustomUser.objects.create_user(
            email="customer1@example.com",
            password="Password@123",
            full_name="Customer One",
            phone="0791111111",
            role=CustomUser.Role.CUSTOMER,
        )
        self.other_customer = CustomUser.objects.create_user(
            email="customer2@example.com",
            password="Password@123",
            full_name="Customer Two",
            phone="0792222222",
            role=CustomUser.Role.CUSTOMER,
        )
        self.admin_user = CustomUser.objects.create_user(
            email="admin@example.com",
            password="Password@123",
            full_name="Admin User",
            phone="0793333333",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.employee_user = CustomUser.objects.create_user(
            email="employee@example.com",
            password="Password@123",
            full_name="Employee User",
            phone="0793333444",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="provider@example.com",
            password="Password@123",
            full_name="Provider User",
            phone="0794444444",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Tester",
            city="Amman",
            is_approved=True,
        )
        self.provider.service_categories.add(self.category)

    def _pdf_upload(self, name):
        return SimpleUploadedFile(name, b"%PDF-1.4 test document", content_type="application/pdf")

    def _create_customer_order(self, *, customer=None, phone="0795555555"):
        customer = customer or self.customer
        self.client.force_authenticate(customer)
        payload = {
            "service": self.service.id,
            "full_name": customer.full_name,
            "phone": phone,
            "city": "Amman",
            "notes": "Please process quickly",
            "consent": True,
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Order.objects.get(order_number=response.data["order_number"])

    def test_customer_can_create_order(self):
        order = self._create_customer_order()
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())
        self.assertEqual(order.final_price, self.service.total_fee)
        self.assertEqual(order.service_name_snapshot, self.service.name_ar)
        self.assertEqual(order.service_category_name_snapshot, self.category.name_ar)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.phone, "0795555555")

    def test_anonymous_user_cannot_create_order(self):
        response = self.client.post(
            "/api/orders/",
            {
                "service": self.service.id,
                "full_name": "Guest Customer",
                "phone": "0799999990",
                "city": "Amman",
                "notes": "Please process quickly",
                "consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_order_submission_creates_notification_record(self):
        order = self._create_customer_order(phone="0799999991")

        notifications = Notification.objects.filter(order=order, template_key="order_submitted").order_by("recipient_id")
        self.assertEqual(notifications.count(), 2)
        self.assertEqual(
            set(notifications.values_list("recipient_id", flat=True)),
            {order.customer_id, self.admin_user.id},
        )
        self.assertTrue(all(item.title == "Order received" for item in notifications))
        self.assertTrue(all(item.context_data["dedupe_key"] == f"order_submitted:{order.pk}" for item in notifications))

    def test_order_is_blocked_when_required_prerequisite_is_missing(self):
        prerequisite_service = Service.objects.create(
            category=self.category,
            name_ar="Municipality Approval",
            name_en="Municipality Approval",
            slug="order-prerequisite-service",
            description_ar="Approval details",
            estimated_duration=2,
            base_price=5,
            government_fee=2,
            service_fee=1,
        )
        ServiceRelation.objects.create(
            source_service=prerequisite_service,
            target_service=self.service,
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_required=True,
            created_by=self.admin_user,
        )
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            "/api/orders/",
            {
                "service": self.service.id,
                "full_name": self.customer.full_name,
                "phone": self.customer.phone,
                "city": "Amman",
                "consent": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("prerequisites", response.data)

    def test_order_is_allowed_when_required_prerequisite_is_completed(self):
        prerequisite_service = Service.objects.create(
            category=self.category,
            name_ar="Municipality Approval",
            name_en="Municipality Approval",
            slug="completed-prerequisite-service",
            description_ar="Approval details",
            estimated_duration=2,
            base_price=5,
            government_fee=2,
            service_fee=1,
        )
        ServiceRelation.objects.create(
            source_service=prerequisite_service,
            target_service=self.service,
            relation_type=ServiceRelation.RelationType.PREREQUISITE,
            is_required=True,
            created_by=self.admin_user,
        )
        Order.objects.create(
            customer=self.customer,
            service=prerequisite_service,
            city="Amman",
            status=Order.Status.COMPLETED,
        )

        order = self._create_customer_order(phone="0791111199")

        self.assertEqual(order.service_id, self.service.id)

    def test_customer_order_requires_each_service_document_as_separate_upload(self):
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="national_id",
            name_ar="National ID",
            allowed_extensions=[".pdf"],
            display_order=1,
        )
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="authorization_letter",
            name_ar="Authorization Letter",
            allowed_extensions=[".pdf"],
            display_order=2,
        )
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            "/api/orders/",
            {
                "service": str(self.service.id),
                "full_name": self.customer.full_name,
                "phone": "0795656565",
                "city": "Amman",
                "consent": "true",
                "document_types": ["national_id", "authorization_letter"],
                "documents": [self._pdf_upload("national-id.pdf"), self._pdf_upload("authorization-letter.pdf")],
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(order_number=response.data["order_number"])
        self.assertEqual(order.documents.count(), 2)
        self.assertEqual(
            sorted(order.documents.values_list("document_type", flat=True)),
            ["authorization_letter", "national_id"],
        )

    def test_customer_order_rejects_generic_multi_upload_when_service_has_document_requirements(self):
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="national_id",
            name_ar="National ID",
            allowed_extensions=[".pdf"],
            display_order=1,
        )
        self.client.force_authenticate(self.customer)

        response = self.client.post(
            "/api/orders/",
            {
                "service": str(self.service.id),
                "full_name": self.customer.full_name,
                "phone": "0795757575",
                "city": "Amman",
                "consent": "true",
                "documents": [self._pdf_upload("national-id.pdf")],
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("documents", response.data)

    def test_customer_cannot_see_another_customer_order(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.other_customer)
        response = self.client.get(f"/api/customer/orders/{order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_status_change_creates_log(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Reviewed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)
        self.assertEqual(order.status_logs.filter(new_status=Order.Status.UNDER_REVIEW).count(), 1)

    def test_status_change_creates_audit_log(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Reviewed safely"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        audit_log = AuditLog.objects.get(action="start_review", entity_type="Order", entity_id=str(order.pk))
        self.assertEqual(audit_log.user_id, self.admin_user.id)
        self.assertEqual(audit_log.old_values["status"], Order.Status.NEW)
        self.assertEqual(audit_log.new_values["status"], Order.Status.UNDER_REVIEW)

    def test_rejected_order_requires_reason(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.admin_user)
        response = self.client.post(f"/api/admin/orders/{order.id}/reject/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_employee_can_access_review_orders(self):
        Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.employee_user)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_employee_review_queue_supports_safe_filters(self):
        matching_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.WAITING_CUSTOMER,
            priority=Order.Priority.HIGH,
            assigned_employee=self.employee_user,
            missing_document_types=["national_id"],
        )
        Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.admin_user,
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.get(
            f"/api/admin/orders/?status={Order.Status.WAITING_CUSTOMER}&priority={Order.Priority.HIGH}&service={self.service.id}&has_missing_documents=true&assigned_employee=me"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], matching_order.id)

    def test_employee_can_start_review_via_status_endpoint(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.employee_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Started review"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)

    def test_order_detail_includes_allowed_actions_for_employee(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.employee_user)

        response = self.client.get(f"/api/admin/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("allowed_actions", response.data)
        self.assertIn("available_status_transitions", response.data["allowed_actions"])
        self.assertIn(Order.Status.UNDER_REVIEW, response.data["allowed_actions"]["available_status_transitions"])

    def test_employee_sees_only_allowed_actions_for_current_status(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_employee=self.employee_user,
            assigned_provider=self.provider,
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.get(f"/api/admin/orders/{order.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        actions = response.data["allowed_actions"]
        self.assertEqual(sorted(actions["available_status_transitions"]), sorted([Order.Status.UNDER_REVIEW, Order.Status.IN_PROGRESS]))
        self.assertFalse(actions["can_assign_provider"])
        self.assertFalse(actions["can_request_documents"])
        self.assertTrue(actions["can_complete"])
        self.assertTrue(actions["can_send_manual_notification"])

    def test_request_missing_documents_persists_required_types(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.employee_user)
        response = self.client.post(
            f"/api/admin/orders/{order.id}/request-documents/",
            {
                "note": "Please upload the missing files.",
                "document_types": ["national_id", "authorization_letter"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, ["authorization_letter", "national_id"])

    def test_provider_assignment_requires_required_documents_to_be_approved(self):
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="national_id",
            name_ar="National ID",
            display_order=1,
        )
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.employee_user)

        assign_without_document = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {
                "provider_id": self.provider.id,
                "note": "Try before approval",
            },
            format="json",
        )
        self.assertEqual(assign_without_document.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("All required documents must be approved", str(assign_without_document.data["detail"][0]))

        self.client.force_authenticate(self.customer)
        upload_response = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {
                "document_type": "national_id",
                "file": self._pdf_upload("national-id.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        document = order.documents.get(document_type="national_id")

        self.client.force_authenticate(self.employee_user)
        assign_without_approval = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {
                "provider_id": self.provider.id,
                "note": "Try before verification",
            },
            format="json",
        )
        self.assertEqual(assign_without_approval.status_code, status.HTTP_400_BAD_REQUEST)

        verify_response = self.client.post(
            f"/api/staff/documents/{document.id}/verify/",
            {"is_verified": True, "note": "Approved"},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        assign_after_approval = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {
                "provider_id": self.provider.id,
                "note": "Ready for provider",
            },
            format="json",
        )
        self.assertEqual(assign_after_approval.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ASSIGNED)
        self.assertEqual(order.assigned_provider_id, self.provider.id)

        self.assertTrue(
            Notification.objects.filter(
                recipient=self.customer,
                order=order,
                title="Order assigned",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.provider_user,
                order=order,
                title="New assigned order",
            ).exists()
        )

    def test_customer_can_cancel_only_new_order(self):
        new_order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        reviewing_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.customer)

        cancel_new = self.client.post(
            f"/api/customer/orders/{new_order.id}/cancel/",
            {"reason": "Changed my mind"},
            format="json",
        )
        self.assertEqual(cancel_new.status_code, status.HTTP_200_OK)
        new_order.refresh_from_db()
        self.assertEqual(new_order.status, Order.Status.CANCELLED)

        cancel_reviewing = self.client.post(
            f"/api/customer/orders/{reviewing_order.id}/cancel/",
            {"reason": "Too late"},
            format="json",
        )
        self.assertEqual(cancel_reviewing.status_code, status.HTTP_400_BAD_REQUEST)

    def test_provider_cannot_mark_ready_for_delivery_without_final_document(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.IN_PROGRESS,
            assigned_provider=self.provider,
        )
        self.client.force_authenticate(self.provider_user)
        response = self.client.patch(
            f"/api/provider/orders/{order.id}/status/",
            {"status": Order.Status.READY_FOR_DELIVERY, "note": "Trying to skip upload"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_order_record_endpoint_allows_safe_updates_only(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.admin_user)

        update_response = self.client.patch(
            f"/api/admin/order-records/{order.id}/",
            {"city": "Zarqa"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.city, "Zarqa")

        blocked_response = self.client.patch(
            f"/api/admin/order-records/{order.id}/",
            {"status": Order.Status.COMPLETED},
            format="json",
        )
        self.assertEqual(blocked_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", blocked_response.data)

    def test_admin_order_record_endpoint_blocks_raw_create_and_delete_for_normal_admin(self):
        order = Order.objects.create(customer=self.customer, service=self.service, city="Amman")
        self.client.force_authenticate(self.admin_user)

        create_response = self.client.post(
            "/api/admin/order-records/",
            {
                "city": "Amman",
                "priority": Order.Priority.NORMAL,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        delete_response = self.client.delete(f"/api/admin/order-records/{order.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Order.objects.filter(pk=order.pk).exists())

    def test_finalized_order_cannot_be_edited_normally(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
        )
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(
            f"/api/admin/order-records/{order.id}/",
            {"city": "Zarqa"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_generic_status_endpoint_blocks_ready_and_completed_transitions(self):
        in_progress_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.IN_PROGRESS,
            assigned_provider=self.provider,
        )
        ready_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
        )
        self.client.force_authenticate(self.admin_user)

        ready_response = self.client.patch(
            f"/api/admin/orders/{in_progress_order.id}/status/",
            {"status": Order.Status.READY_FOR_DELIVERY, "note": "Trying to bypass final upload"},
            format="json",
        )
        self.assertEqual(ready_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", ready_response.data)

        complete_response = self.client.patch(
            f"/api/admin/orders/{ready_order.id}/status/",
            {"status": Order.Status.COMPLETED, "note": "Trying to bypass completion checks"},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", complete_response.data)

    def test_generic_status_endpoint_rejects_non_generic_transition(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.ASSIGNED, "note": "Wrong endpoint"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_complete_endpoint_requires_final_document_and_verification_without_override(self):
        missing_final_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
        )
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.IN_PROGRESS,
            assigned_provider=self.provider,
        )
        self.client.force_authenticate(self.admin_user)

        no_document_response = self.client.post(
            f"/api/admin/orders/{missing_final_order.id}/complete/",
            {"admin_confirmation": False},
            format="json",
        )
        self.assertEqual(no_document_response.status_code, status.HTTP_400_BAD_REQUEST)

        upload_response = self.client.post(
            f"/api/admin/orders/{order.id}/final-document/",
            {
                "document_type": "FINAL_RESULT",
                "file": self._pdf_upload("final-result.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)

        unverified_response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": False},
            format="json",
        )
        self.assertEqual(unverified_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verified", str(unverified_response.data["detail"][0]).lower())

        final_document = order.documents.get(is_final_document=True)
        verify_response = self.client.post(
            f"/api/staff/documents/{final_document.id}/verify/",
            {"is_verified": True, "note": "Verified"},
            format="json",
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        complete_response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": False},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.COMPLETED)

    def test_completion_creates_related_service_recommendation_notification(self):
        follow_up_service = Service.objects.create(
            category=self.category,
            name_ar="Food Safety Certificate",
            name_en="Food Safety Certificate",
            slug="food-safety-follow-up",
            description_ar="Follow-up service",
            estimated_duration=2,
            base_price=7,
            government_fee=3,
            service_fee=2,
        )
        ServiceRelation.objects.create(
            source_service=self.service,
            target_service=follow_up_service,
            relation_type=ServiceRelation.RelationType.RECOMMENDED_AFTER,
            is_required=False,
            created_by=self.admin_user,
        )
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
        )
        self.client.force_authenticate(self.admin_user)

        response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notification = Notification.objects.get(
            order=order,
            template_key="service_relation_recommendation",
            target_service=follow_up_service,
        )
        self.assertEqual(notification.recipient_id, self.customer.id)
        self.assertEqual(notification.title, "Related service recommended")
        self.assertIn("Food Safety Certificate", notification.message)

    def test_completion_recommendation_notifications_do_not_duplicate_unread_records(self):
        follow_up_service = Service.objects.create(
            category=self.category,
            name_ar="Signboard Permit",
            name_en="Signboard Permit",
            slug="signboard-permit-follow-up",
            description_ar="Follow-up service",
            estimated_duration=2,
            base_price=7,
            government_fee=3,
            service_fee=2,
        )
        ServiceRelation.objects.create(
            source_service=self.service,
            target_service=follow_up_service,
            relation_type=ServiceRelation.RelationType.OPTIONAL_BUNDLE,
            is_required=False,
            created_by=self.admin_user,
        )
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            assigned_provider=self.provider,
        )

        create_related_service_notifications(order=order, actor=self.admin_user)
        create_related_service_notifications(order=order, actor=self.admin_user)

        self.assertEqual(
            Notification.objects.filter(
                order=order,
                template_key="service_relation_recommendation",
                target_service=follow_up_service,
                is_read=False,
            ).count(),
            1,
        )

    def test_employee_cannot_complete_invalid_transition(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_document_upload_only_removes_uploaded_type(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.WAITING_CUSTOMER,
            missing_document_types=["authorization_letter", "national_id"],
        )
        self.client.force_authenticate(self.customer)

        first_upload = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {
                "document_type": "national_id",
                "file": self._pdf_upload("national-id.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(first_upload.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, ["authorization_letter"])

        second_upload = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {
                "document_type": "authorization_letter",
                "file": self._pdf_upload("authorization-letter.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(second_upload.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)
        self.assertEqual(order.missing_document_types, [])

    def test_assign_provider_blocked_while_waiting_customer(self):
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="national_id",
            name_ar="National ID",
            display_order=1,
        )
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.WAITING_CUSTOMER,
            assigned_employee=self.employee_user,
            missing_document_types=["national_id"],
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {"provider_id": self.provider.id, "note": "Should fail"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_return_to_provider_requires_reason(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
            assigned_employee=self.employee_user,
        )
        self.client.force_authenticate(self.employee_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.IN_PROGRESS, "note": ""},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("note", response.data)

    def test_admin_can_reopen_completed_order_with_reason(self):
        order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            completed_at=None,
        )
        self.client.force_authenticate(self.admin_user)

        response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {"status": Order.Status.UNDER_REVIEW, "note": "Reopened for correction"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)
        self.assertIsNone(order.completed_at)

    def test_full_order_flow_updates_statuses_for_each_actor(self):
        order = self._create_customer_order(phone="0796666666")
        self.assertEqual(order.status, Order.Status.NEW)
        self.assertEqual(order.final_price, self.service.total_fee)

        self.client.force_authenticate(self.admin_user)
        review_response = self.client.patch(
            f"/api/admin/orders/{order.id}/status/",
            {
                "status": Order.Status.UNDER_REVIEW,
                "note": "Initial review started",
            },
            format="json",
        )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)

        request_docs_response = self.client.post(
            f"/api/admin/orders/{order.id}/request-documents/",
            {
                "note": "Please upload your ID copy.",
                "document_types": ["national_id"],
            },
            format="json",
        )
        self.assertEqual(request_docs_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_CUSTOMER)
        self.assertEqual(order.missing_document_types, ["national_id"])

        self.client.force_authenticate(order.customer)
        upload_response = self.client.post(
            f"/api/customer/orders/{order.id}/documents/",
            {
                "document_type": "national_id",
                "file": self._pdf_upload("national-id.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.UNDER_REVIEW)
        self.assertEqual(order.missing_document_types, [])

        self.client.force_authenticate(self.admin_user)
        assign_response = self.client.patch(
            f"/api/admin/orders/{order.id}/assign/",
            {
                "provider_id": self.provider.id,
                "note": "Start immediately",
            },
            format="json",
        )
        self.assertEqual(assign_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.ASSIGNED)
        self.assertEqual(order.assigned_provider, self.provider)

        self.client.force_authenticate(self.provider_user)
        in_progress_response = self.client.patch(
            f"/api/provider/orders/{order.id}/status/",
            {
                "status": Order.Status.IN_PROGRESS,
                "note": "Started processing",
            },
            format="json",
        )
        self.assertEqual(in_progress_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.IN_PROGRESS)

        waiting_government_response = self.client.patch(
            f"/api/provider/orders/{order.id}/status/",
            {
                "status": Order.Status.WAITING_GOVERNMENT,
                "note": "Waiting on external office",
            },
            format="json",
        )
        self.assertEqual(waiting_government_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.WAITING_GOVERNMENT)

        final_document_response = self.client.post(
            f"/api/provider/orders/{order.id}/final-document/",
            {
                "document_type": "FINAL_RESULT",
                "file": self._pdf_upload("final-result.pdf"),
            },
            format="multipart",
        )
        self.assertEqual(final_document_response.status_code, status.HTTP_201_CREATED)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.READY_FOR_DELIVERY)
        self.assertTrue(order.documents.filter(is_final_document=True).exists())

        self.client.force_authenticate(self.admin_user)
        complete_response = self.client.post(
            f"/api/admin/orders/{order.id}/complete/",
            {"admin_confirmation": True},
            format="json",
        )
        self.assertEqual(complete_response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.COMPLETED)
        self.provider.refresh_from_db()
        self.assertEqual(self.provider.total_completed_orders, 1)

        track_response = self.client.get(
            f"/api/orders/track/?order_number={order.order_number}&phone={order.customer.phone}"
        )
        self.assertEqual(track_response.status_code, status.HTTP_200_OK)
        self.assertEqual(track_response.data["status"], Order.Status.COMPLETED)
        self.assertEqual(track_response.data["final_documents"][0]["document_type"], "FINAL_RESULT")

        status_history = list(order.status_logs.values_list("new_status", flat=True))
        self.assertEqual(
            status_history,
            [
                Order.Status.NEW,
                Order.Status.UNDER_REVIEW,
                Order.Status.WAITING_CUSTOMER,
                Order.Status.UNDER_REVIEW,
                Order.Status.ASSIGNED,
                Order.Status.IN_PROGRESS,
                Order.Status.WAITING_GOVERNMENT,
                Order.Status.READY_FOR_DELIVERY,
                Order.Status.COMPLETED,
            ],
        )

    def test_service_price_changes_apply_to_new_orders_only(self):
        existing_order = self._create_customer_order(phone="0797777777")
        existing_total = existing_order.final_price

        self.client.force_authenticate(self.admin_user)
        update_response = self.client.patch(
            f"/api/admin/services/{self.service.id}/",
            {
                "service_fee": "12.50",
                "government_fee": "7.50",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()

        new_order = self._create_customer_order(phone="0798888888")
        existing_order.refresh_from_db()

        self.assertEqual(existing_order.final_price, existing_total)
        self.assertEqual(new_order.final_price, self.service.total_fee)
        self.assertNotEqual(new_order.final_price, existing_total)
