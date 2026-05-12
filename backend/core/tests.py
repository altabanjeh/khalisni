from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from accounts.models import CustomUser
from orders.models import Order
from payment.models import Payment
from providers.models import ProviderProfile
from services.models import Service, ServiceCategory, ServiceRequiredDocument


class SystemConsistencyCommandTests(TestCase):
    def setUp(self):
        category = ServiceCategory.objects.create(
            name_ar="تصنيف",
            name_en="Category",
            slug="consistency-category",
        )
        self.service = Service.objects.create(
            category=category,
            name_ar="خدمة",
            name_en="Service",
            slug="consistency-service",
            description_ar="تفاصيل",
            estimated_duration=2,
            base_price=10,
            government_fee=3,
            service_fee=4,
        )
        ServiceRequiredDocument.objects.create(
            service=self.service,
            document_type="national_id",
            name_ar="National ID",
            is_required=True,
            is_active=True,
            display_order=1,
        )
        self.customer = CustomUser.objects.create_user(
            email="consistency-customer@example.com",
            password="Password@123",
            full_name="Consistency Customer",
            phone="0796111111",
            role=CustomUser.Role.CUSTOMER,
        )
        self.provider_user = CustomUser.objects.create_user(
            email="consistency-provider@example.com",
            password="Password@123",
            full_name="Consistency Provider",
            phone="0796111112",
            role=CustomUser.Role.PROVIDER,
        )
        self.provider = ProviderProfile.objects.create(
            user=self.provider_user,
            provider_type="Agent",
            city="Amman",
            is_approved=True,
        )

    def test_consistency_check_reports_invalid_operational_rows(self):
        completed_without_final = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
        )
        Order.objects.filter(pk=completed_without_final.pk).update(
            status=Order.Status.COMPLETED,
            completed_at=timezone.now(),
        )

        inactive_provider_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.ASSIGNED,
            assigned_provider=self.provider,
        )
        self.provider.is_available = False
        self.provider.save(update_fields=["is_available", "updated_at"])

        pending_missing_docs = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.UNDER_REVIEW,
        )
        Order.objects.filter(pk=pending_missing_docs.pk).update(missing_document_types=["national_id"])

        missing_required_docs = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
            status=Order.Status.ASSIGNED,
            assigned_provider=self.provider,
        )

        provider_missing_assignment = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
        )
        Order.objects.filter(pk=provider_missing_assignment.pk).update(status=Order.Status.IN_PROGRESS)

        payment = Payment.objects.create(
            order=missing_required_docs,
            amount="25.00",
            status=Payment.PaymentStatus.PENDING,
        )
        Payment.objects.filter(pk=payment.pk).update(status=Payment.PaymentStatus.PAID, paid_at=None)

        invalid_status_order = Order.objects.create(
            customer=self.customer,
            service=self.service,
            city="Amman",
        )
        Order.objects.filter(pk=invalid_status_order.pk).update(status="BROKEN")

        output = StringIO()
        call_command("check_system_consistency", stdout=output)
        report = output.getvalue()

        self.assertIn("[invalid_status_orders] 1 issue(s)", report)
        self.assertIn("[completed_without_final_document] 1 issue(s)", report)
        self.assertIn("[inactive_provider_assignments] 2 issue(s)", report)
        self.assertIn("[pending_missing_documents_moved_forward] 1 issue(s)", report)
        self.assertIn("[required_documents_missing] 4 issue(s)", report)
        self.assertIn("[provider_required_without_assignment] 2 issue(s)", report)
        self.assertIn("[inconsistent_payments] 1 issue(s)", report)
        self.assertIn("Consistency check found", report)
