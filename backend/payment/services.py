from audit.utils import create_audit_log
from notifications.services import send_notification_event
from payment.models import Payment


def create_customer_payment(*, actor, validated_data, request=None):
    """
    Create a payment record initiated by the customer for their own order.

    The payment starts in `pending` so gateway confirmation or manual review
    can move it forward later.
    """
    payment = Payment.objects.create(
        paid_by=actor,
        status=Payment.PaymentStatus.PENDING,
        **validated_data,
    )
    create_audit_log(
        request=request,
        user=actor,
        action="create_customer_payment",
        entity_type="Payment",
        entity_id=payment.pk,
        new_value={"status": payment.status, "amount": str(payment.amount)},
    )
    return payment


def create_admin_payment(*, actor, validated_data, request=None):
    """
    Create a payment record on behalf of operations/admin staff.

    This is used for manual cash/bank flows or administrative correction
    scenarios where the payment was not initiated directly by the customer.
    """
    payment = Payment.objects.create(
        recorded_by=actor,
        status=Payment.PaymentStatus.PENDING,
        **validated_data,
    )
    create_audit_log(
        request=request,
        user=actor,
        action="create_admin_payment",
        entity_type="Payment",
        entity_id=payment.pk,
        new_value={"status": payment.status, "amount": str(payment.amount)},
    )
    return payment


def update_payment_status(*, payment, actor, status_value, failure_reason="", notes="", reference_number="", request=None):
    """
    Apply an administrative payment status change.

    The payment model handles the timestamp side effects when the row is saved.
    """
    old_value = {"status": payment.status, "failure_reason": payment.failure_reason, "reference_number": payment.reference_number}
    payment.status = status_value
    payment.failure_reason = failure_reason
    payment.notes = notes or payment.notes
    if reference_number:
        payment.reference_number = reference_number
    payment.recorded_by = actor
    payment.save()
    create_audit_log(
        request=request,
        user=actor,
        action="payment_status_update",
        entity_type="Payment",
        entity_id=payment.pk,
        old_value=old_value,
        new_value={"status": payment.status, "failure_reason": payment.failure_reason, "reference_number": payment.reference_number},
    )
    send_notification_event(
        event_key="payment_status_changed",
        order=payment.order,
        actor=actor,
        payment=payment,
        request=request,
        dedupe_key=f"payment_status_changed:{payment.pk}:{payment.status}",
    )
    return payment
