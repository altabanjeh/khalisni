"""Owner decision B05: online payment is out of the current release.

The customer write path is closed; the admin manual ledger keeps working.
"""

from rest_framework.test import APIClient, APITestCase

from accounts.models import CustomUser
from orders.models import Order
from payment.models import Payment
from services.models import Service, ServiceCategory


class PaymentOutOfReleaseTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        category = ServiceCategory.objects.create(name_ar="تصنيف", name_en="Category", slug="b05-category")
        service = Service.objects.create(
            category=category, name_ar="خدمة", name_en="Service", slug="b05-service",
            description_ar="تفاصيل", estimated_duration=2, base_price=10, government_fee=3, service_fee=4,
        )
        self.customer = CustomUser.objects.create_user(
            email="b05-customer@example.com", password="Password@123", full_name="B05 Customer",
            phone="0796100001", role=CustomUser.Role.CUSTOMER,
        )
        self.admin = CustomUser.objects.create_user(
            email="b05-admin@example.com", password="Password@123", full_name="B05 Admin",
            phone="0796100003", role=CustomUser.Role.ADMIN, is_staff=True,
        )
        self.order = Order.objects.create(customer=self.customer, service=service, city="Amman")
        self.existing = Payment.objects.create(
            order=self.order, recorded_by=self.admin, amount=18, status=Payment.PaymentStatus.PENDING,
        )

    # Test 1
    def test_customer_payment_create_is_blocked_and_creates_nothing(self):
        self.client.force_authenticate(self.customer)
        for payload in (
            {"order": self.order.pk, "method": "cash", "payment_type": "full", "amount": "18.00"},
            {"order": self.order.pk, "method": "gateway", "payment_type": "full", "amount": "18.00",
             "gateway_name": "x", "gateway_payment_url": "https://pay.example.test"},
        ):
            response = self.client.post("/api/customer/payments/", payload, format="json")
            self.assertEqual(response.status_code, 405, response.data)
        self.assertEqual(Payment.objects.filter(order=self.order).count(), 1)

    def test_customer_can_still_read_existing_payment_records(self):
        self.client.force_authenticate(self.customer)
        listed = self.client.get("/api/customer/payments/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([row["id"] for row in listed.data], [self.existing.pk])
        self.assertEqual(self.client.get(f"/api/customer/payments/{self.existing.pk}/").status_code, 200)

    # Test 2
    def test_admin_manual_ledger_remains_usable(self):
        self.client.force_authenticate(self.admin)
        created = self.client.post(
            "/api/admin/payments/",
            {"order": self.order.pk, "payment_type": "full", "method": "cash", "amount": "18.00", "currency": "JOD"},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        listed = self.client.get("/api/admin/payments/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 2)
        changed = self.client.post(
            f"/api/admin/payments/{self.existing.pk}/status/", {"status": "paid"}, format="json",
        )
        self.assertEqual(changed.status_code, 200, changed.data)
        self.existing.refresh_from_db()
        self.assertEqual(self.existing.status, Payment.PaymentStatus.PAID)
