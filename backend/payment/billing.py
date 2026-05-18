from decimal import Decimal

from django.db import transaction

from audit.utils import create_audit_log
from payment.models import CommissionRule, Invoice, ProviderPayout


@transaction.atomic
def create_invoice_for_order(*, actor, order, tax_amount=Decimal("0.00"), request=None):
    subtotal = order.final_price or Decimal("0.00")
    invoice = Invoice.objects.create(
        organization=order.organization,
        order=order,
        subtotal_amount=subtotal,
        tax_amount=tax_amount,
    )
    create_audit_log(
        request=request,
        user=actor,
        action="create_invoice",
        entity_type="Invoice",
        entity_id=invoice.pk,
        new_value={"order_id": order.pk, "total_amount": str(invoice.total_amount)},
    )
    return invoice


def create_provider_payout(*, actor, order, provider_organization, amount, notes="", request=None):
    payout = ProviderPayout.objects.create(
        provider_organization=provider_organization,
        order=order,
        amount=amount,
        notes=notes,
    )
    create_audit_log(
        request=request,
        user=actor,
        action="create_provider_payout",
        entity_type="ProviderPayout",
        entity_id=payout.pk,
        new_value={"order_id": order.pk, "amount": str(payout.amount)},
    )
    return payout


def upsert_commission_rule(*, actor, organization, percentage=Decimal("0.00"), fixed_amount=Decimal("0.00"), service=None, provider_organization=None, request=None):
    rule, _ = CommissionRule.objects.update_or_create(
        organization=organization,
        service=service,
        provider_organization=provider_organization,
        defaults={"percentage": percentage, "fixed_amount": fixed_amount, "is_active": True},
    )
    create_audit_log(
        request=request,
        user=actor,
        action="update_commission_rule",
        entity_type="CommissionRule",
        entity_id=rule.pk,
        new_value={
            "organization_id": organization.pk,
            "service_id": getattr(service, "pk", None),
            "provider_organization_id": getattr(provider_organization, "pk", None),
            "percentage": str(rule.percentage),
            "fixed_amount": str(rule.fixed_amount),
        },
    )
    return rule
