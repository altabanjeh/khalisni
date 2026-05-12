from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from documents.models import Document
from orders.models import Order, OrderStatusLog
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory
from django.core.files.uploadedfile import SimpleUploadedFile


class ReportsPermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="reports-category")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="reports-service",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        customer = CustomUser.objects.create_user(
            email="reports-customer@example.com",
            password="Password@123",
            full_name="Reports Customer",
            phone="0793000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.employee = CustomUser.objects.create_user(
            email="reports-employee@example.com",
            password="Password@123",
            full_name="Reports Employee",
            phone="0793000002",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.admin = CustomUser.objects.create_user(
            email="reports-admin@example.com",
            password="Password@123",
            full_name="Reports Admin",
            phone="0793000003",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.other_employee = CustomUser.objects.create_user(
            email="reports-employee2@example.com",
            password="Password@123",
            full_name="Reports Employee 2",
            phone="0793000004",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="reports-provider@example.com",
            password="Password@123",
            full_name="Reports Provider",
            phone="0793000005",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )
        self.customer = customer
        self.service = service
        Order.objects.create(customer=customer, service=service, city="Amman")

    def test_employee_gets_limited_dashboard(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("cards", response.data)
        self.assertNotIn("provider_performance", response.data)
        self.assertNotIn("revenue_estimate", response.data["cards"])

    def test_admin_gets_full_dashboard(self):
        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("provider_performance", response.data)
        self.assertIn("revenue_estimate", response.data["cards"])

    def test_employee_cannot_access_admin_system_settings(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/system-settings/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_employee_dashboard_returns_scoped_work_queues(self):
        waiting_review = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.NEW,
        )
        resubmitted = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee,
        )
        OrderStatusLog.objects.create(
            order=resubmitted,
            old_status=Order.Status.WAITING_CUSTOMER,
            new_status=Order.Status.UNDER_REVIEW,
            changed_by=self.employee,
            note="Customer uploaded missing documents",
        )
        verification_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_employee=self.employee,
            assigned_provider=self.provider,
            expected_delivery_date=timezone.localdate(),
        )
        Document.objects.create(
            order=verification_order,
            uploaded_by=self.provider_user,
            uploaded_by_role=Document.UploadedByRole.PROVIDER,
            document_type="FINAL_RESULT",
            file=SimpleUploadedFile("final.pdf", b"pdf", content_type="application/pdf"),
            original_filename="final.pdf",
            file_size=3,
            mime_type="application/pdf",
            is_final_document=True,
        )
        delayed_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee,
            expected_delivery_date=timezone.localdate() - timedelta(days=1),
        )
        near_deadline_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.employee,
            expected_delivery_date=timezone.localdate() + timedelta(days=1),
        )
        other_employee_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Irbid",
            status=Order.Status.UNDER_REVIEW,
            assigned_employee=self.other_employee,
        )

        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/employee/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["summary"]["waiting_review"], 1)
        self.assertEqual(response.data["summary"]["missing_documents_returned"], 1)
        self.assertEqual(response.data["summary"]["waiting_internal_verification"], 1)
        self.assertEqual(response.data["summary"]["returned_from_provider"], 1)
        self.assertGreaterEqual(response.data["summary"]["assigned_workload"], 3)
        waiting_ids = {row["id"] for row in response.data["queues"]["waiting_review"]}
        self.assertIn(waiting_review.id, waiting_ids)
        self.assertNotIn(other_employee_order.id, {row["id"] for row in response.data["queues"]["assigned_workload"]})
        self.assertIn(delayed_order.id, {row["id"] for row in response.data["queues"]["delayed"]})
        self.assertIn(near_deadline_order.id, {row["id"] for row in response.data["queues"]["near_deadline"]})

    def test_employee_summary_report_returns_actor_scoped_metrics(self):
        tracked_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            assigned_employee=self.employee,
        )
        other_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            assigned_employee=self.other_employee,
        )
        OrderStatusLog.objects.create(
            order=tracked_order,
            old_status=Order.Status.NEW,
            new_status=Order.Status.UNDER_REVIEW,
            changed_by=self.employee,
            note="Started review",
        )
        OrderStatusLog.objects.create(
            order=tracked_order,
            old_status=Order.Status.UNDER_REVIEW,
            new_status=Order.Status.WAITING_CUSTOMER,
            changed_by=self.employee,
            note="Need more docs",
        )
        OrderStatusLog.objects.create(
            order=tracked_order,
            old_status=Order.Status.READY_FOR_DELIVERY,
            new_status=Order.Status.IN_PROGRESS,
            changed_by=self.employee,
            note="Returned to provider",
        )
        OrderStatusLog.objects.create(
            order=tracked_order,
            old_status=Order.Status.READY_FOR_DELIVERY,
            new_status=Order.Status.COMPLETED,
            changed_by=self.employee,
            note="Completed order",
        )
        OrderStatusLog.objects.create(
            order=other_order,
            old_status=Order.Status.READY_FOR_DELIVERY,
            new_status=Order.Status.COMPLETED,
            changed_by=self.other_employee,
            note="Completed by other employee",
        )

        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/employee/reports/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totals"]["orders_reviewed"], 1)
        self.assertEqual(response.data["totals"]["missing_document_requests"], 1)
        self.assertEqual(response.data["totals"]["provider_returns"], 1)
        self.assertEqual(response.data["totals"]["completed_orders"], 1)
        self.assertEqual(sum(item["total"] for item in response.data["completed_orders_by_day"]), 1)

    def test_scoped_summary_report_requires_authentication(self):
        response = self.client.get("/api/reports/summary/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_customer_summary_report_is_limited_to_own_orders(self):
        own_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            assigned_provider=self.provider,
        )
        other_order = Order.objects.create(
            customer=CustomUser.objects.create_user(
                email="reports-customer3@example.com",
                password="Password@123",
                full_name="Reports Customer 3",
                phone="0793000006",
                role=CustomUser.Role.CUSTOMER,
            ),
            service=self.service,
            city="Irbid",
            status=Order.Status.IN_PROGRESS,
            assigned_provider=self.provider,
        )

        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/reports/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"], "customer")
        self.assertEqual(response.data["visible_orders"], 2)
        completed_ids = {row["id"] for row in response.data["completed_orders"]["orders"]}
        self.assertIn(own_order.id, completed_ids)
        self.assertNotIn(other_order.id, completed_ids)

    def test_provider_summary_report_is_limited_to_assigned_work(self):
        own_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.READY_FOR_DELIVERY,
            assigned_provider=self.provider,
        )
        other_provider_user = CustomUser.objects.create_user(
            email="reports-provider2@example.com",
            password="Password@123",
            full_name="Reports Provider 2",
            phone="0793000007",
            role=CustomUser.Role.PROVIDER,
        )
        other_provider = ProviderProfile.objects.create(
            user=other_provider_user,
            provider_type="Agent",
            city="Irbid",
            is_approved=True,
        )
        other_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Irbid",
            status=Order.Status.COMPLETED,
            assigned_provider=other_provider,
        )

        self.client.force_authenticate(self.provider_user)
        response = self.client.get("/api/reports/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"], "provider")
        self.assertEqual(response.data["visible_orders"], 1)
        self.assertEqual(response.data["provider_performance"]["assigned_orders"], 1)
        completed_ids = {row["id"] for row in response.data["completed_orders"]["orders"]}
        self.assertNotIn(other_order.id, completed_ids)
        self.assertEqual(response.data["completed_orders"]["total"], 0)
        delayed_ids = {row["id"] for row in response.data["delayed_orders"]["orders"]}
        self.assertNotIn(other_order.id, delayed_ids)
        self.assertEqual(response.data["provider_performance"]["ready_for_delivery"], 1)

    def test_admin_summary_report_sees_global_operational_totals(self):
        completed_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.COMPLETED,
            assigned_employee=self.employee,
            assigned_provider=self.provider,
        )
        delayed_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Zarqa",
            status=Order.Status.IN_PROGRESS,
            assigned_employee=self.other_employee,
            assigned_provider=self.provider,
            expected_delivery_date=timezone.localdate() - timedelta(days=1),
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get("/api/reports/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["scope"], "admin")
        self.assertGreaterEqual(response.data["visible_orders"], 3)
        self.assertGreaterEqual(response.data["completed_orders"]["total"], 1)
        self.assertGreaterEqual(response.data["delayed_orders"]["total"], 1)
        employee_names = {row["employee_name"] for row in response.data["employee_workload"]}
        provider_names = {row["provider_name"] for row in response.data["provider_performance"]}
        self.assertIn(self.employee.full_name, employee_names)
        self.assertIn(self.provider_user.full_name, provider_names)
        self.assertIsNotNone(completed_order.pk)
        self.assertIsNotNone(delayed_order.pk)
