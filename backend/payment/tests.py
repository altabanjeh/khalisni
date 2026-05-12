from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from orders.models import Order
from payment.models import Payment
from services.models import Service, ServiceCategory


class PaymentPermissionTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="pay-category")
        service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="pay-service",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="pay-customer@example.com",
            password="Password@123",
            full_name="Pay Customer",
            phone="0796000001",
            role=CustomUser.Role.CUSTOMER,
        )
        self.other_customer = CustomUser.objects.create_user(
            email="pay-other@example.com",
            password="Password@123",
            full_name="Pay Other",
            phone="0796000002",
            role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="pay-admin@example.com",
            password="Password@123",
            full_name="Pay Admin",
            phone="0796000003",
            role=CustomUser.Role.ADMIN,
            is_staff=True,
        )
        self.employee = CustomUser.objects.create_user(
            email="pay-employee@example.com",
            password="Password@123",
            full_name="Pay Employee",
            phone="0796000004",
            role=CustomUser.Role.EMPLOYEE,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        self.other_order = Order.objects.create(customer=self.other_customer, service=service, city="Irbid")
        self.payment = Payment.objects.create(order=self.order, paid_by=self.customer, amount=18, status=Payment.PaymentStatus.PENDING)

    def test_customer_sees_only_own_payments(self):
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/customer/payments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], self.payment.id)

    def test_employee_cannot_access_admin_payment_screen(self):
        self.client.force_authenticate(self.employee)
        response = self.client.get("/api/admin/payments/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_payment_for_any_order(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            "/api/admin/payments/",
            {
                "order": self.other_order.id,
                "payment_type": Payment.PaymentType.FULL,
                "method": Payment.PaymentMethod.CASH,
                "amount": "25.00",
                "currency": "JOD",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_can_update_payment_status_only_via_safe_action(self):
        self.client.force_authenticate(self.admin)
        blocked_update = self.client.patch(
            f"/api/admin/payments/{self.payment.id}/",
            {"amount": "20.00", "notes": "Adjusted by admin"},
            format="json",
        )
        self.assertEqual(blocked_update.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        status_response = self.client.post(
            f"/api/admin/payments/{self.payment.id}/status/",
            {"status": Payment.PaymentStatus.PAID, "notes": "Confirmed", "reference_number": "REF-1"},
            format="json",
        )
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, Payment.PaymentStatus.PAID)
        self.assertEqual(self.payment.reference_number, "REF-1")
