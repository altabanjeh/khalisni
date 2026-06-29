from django.core.management.base import BaseCommand
from django.db.models import Q

from orders.models import Order
from payment.models import Payment


class Command(BaseCommand):
    help = "Report workflow, document, provider, and payment consistency issues without modifying data."

    def handle(self, *args, **options):
        issues = {
            "invalid_status_orders": self._invalid_status_orders(),
            "completed_without_final_document": self._completed_without_final_document(),
            "inactive_provider_assignments": self._inactive_provider_assignments(),
            "pending_missing_documents_moved_forward": self._pending_missing_documents_moved_forward(),
            "required_documents_missing": self._required_documents_missing(),
            "provider_required_without_assignment": self._provider_required_without_assignment(),
            "inconsistent_payments": self._inconsistent_payments(),
        }

        total_issues = sum(len(rows) for rows in issues.values())
        for section, rows in issues.items():
            self.stdout.write(f"[{section}] {len(rows)} issue(s)")
            for row in rows:
                self.stdout.write(f" - {row}")

        if total_issues:
            self.stdout.write(self.style.WARNING(f"Consistency check found {total_issues} issue(s)."))
        else:
            self.stdout.write(self.style.SUCCESS("Consistency check passed with no issues."))

    def _invalid_status_orders(self):
        valid_statuses = [choice for choice, _ in Order.Status.choices]
        return [
            f"{order.order_number or order.pk}: invalid status '{order.status}'"
            for order in Order.objects.exclude(status__in=valid_statuses)
        ]

    def _completed_without_final_document(self):
        rows = []
        for order in Order.objects.filter(status=Order.Status.COMPLETED).select_related("service", "customer"):
            has_final_document = order.documents.filter(is_deleted=False, is_final_document=True).exists()
            if not has_final_document:
                rows.append(f"{order.order_number}: completed without final document")
        return rows

    def _inactive_provider_assignments(self):
        rows = []
        orders = (
            Order.objects.filter(assigned_provider__isnull=False)
            .select_related("assigned_provider__user")
        )
        for order in orders:
            provider = order.assigned_provider
            if not provider.user.is_active or not provider.is_available:
                rows.append(
                    f"{order.order_number}: assigned to inactive provider {provider.user.full_name}"
                )
        return rows

    def _pending_missing_documents_moved_forward(self):
        rows = []
        orders = Order.objects.exclude(status=Order.Status.WAITING_CUSTOMER)
        for order in orders:
            if order.missing_document_types:
                rows.append(
                    f"{order.order_number}: pending missing documents while status is {order.status}"
                )
        return rows

    def _required_documents_missing(self):
        rows = []
        forward_statuses = [
            Order.Status.ASSIGNED,
            Order.Status.IN_PROGRESS,
            Order.Status.WAITING_GOVERNMENT,
            Order.Status.READY_FOR_DELIVERY,
            Order.Status.COMPLETED,
        ]
        orders = (
            Order.objects.filter(status__in=forward_statuses)
            .select_related("service")
            .prefetch_related("service__document_requirements", "documents")
        )
        for order in orders:
            required_document_types = list(
                order.service.document_requirements.filter(is_active=True, is_deleted=False, is_required=True).values_list("document_type", flat=True)
            )
            if not required_document_types:
                continue
            approved_document_types = set(
                order.documents.filter(
                    is_deleted=False,
                    status="approved",
                    document_type__in=required_document_types,
                ).values_list("document_type", flat=True)
            )
            missing_types = sorted(set(required_document_types) - approved_document_types)
            if missing_types:
                rows.append(
                    f"{order.order_number}: missing approved required documents [{', '.join(missing_types)}]"
                )
        return rows

    def _provider_required_without_assignment(self):
        rows = []
        provider_statuses = [
            Order.Status.ASSIGNED,
            Order.Status.IN_PROGRESS,
            Order.Status.WAITING_GOVERNMENT,
            Order.Status.READY_FOR_DELIVERY,
            Order.Status.COMPLETED,
        ]
        orders = Order.objects.filter(
            service__provider_required=True,
            assigned_provider__isnull=True,
            status__in=provider_statuses,
        ).select_related("service")
        for order in orders:
            rows.append(
                f"{order.order_number}: provider-required order in {order.status} has no assigned provider"
            )
        return rows

    def _inconsistent_payments(self):
        rows = []
        inconsistent = Payment.objects.filter(
            Q(status=Payment.PaymentStatus.PAID, paid_at__isnull=True)
            | Q(status__in=[Payment.PaymentStatus.REFUNDED, Payment.PaymentStatus.PARTIALLY_REFUNDED], refunded_at__isnull=True)
            | Q(status=Payment.PaymentStatus.FAILED, failure_reason="")
            | Q(status__in=[Payment.PaymentStatus.PENDING, Payment.PaymentStatus.PROCESSING, Payment.PaymentStatus.CANCELLED], paid_at__isnull=False)
        ).select_related("order")
        for payment in inconsistent:
            rows.append(
                f"{payment.payment_number or payment.pk}: status={payment.status} order={payment.order.order_number}"
            )
        return rows
