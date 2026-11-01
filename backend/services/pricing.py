"""What the public sees of a service price (owner decision B10-10).

* Quotation services show no number: only the approved price note
  («يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.»).
* Fixed and "starts from" services show the total. The government fee and the
  company fee are shown next to it only when both are switched on for the
  public AND the displayed parts add up exactly to the displayed total
  (``government_fee + service_fee == total``: no base price and no partner
  price override). Otherwise the total is shown alone, so a customer never
  sees a breakdown that does not add up.

Stored financial values are never changed here; this is presentation only.
"""

from decimal import Decimal

from services.catalogue_rules import APPROVED_PRICE_NOTE

ZERO = Decimal("0.00")


def _matched_partner_config(service):
    configs = getattr(service, "_matched_partner_configs", None) or []
    return configs[0] if configs else None


def public_total(service):
    """The total a customer pays (a partner's custom price wins), before visibility rules."""
    config = _matched_partner_config(service)
    if config and config.custom_price is not None:
        return config.custom_price
    return service.total_fee


def is_quotation(service):
    return service.price_type == "quotation"


def breakdown_adds_up(service):
    """True when government fee + company fee is exactly the public total."""
    total = public_total(service)
    return (service.government_fee or ZERO) + (service.service_fee or ZERO) == (total or ZERO)


def public_pricing(service):
    """The ``pricing`` payload of the public service APIs."""
    note_ar, note_en = service.public_price_note_ar, service.public_price_note_en
    if is_quotation(service):
        return {
            "total_price": None,
            "government_fee": None,
            "company_fee": None,
            "public_note_ar": note_ar or APPROVED_PRICE_NOTE["ar"],
            "public_note_en": note_en or APPROVED_PRICE_NOTE["en"],
        }
    total = public_total(service) if service.show_total_price_public else None
    show_breakdown = bool(
        service.show_total_price_public
        and service.show_government_fee_public
        and service.show_company_fee_public
        and breakdown_adds_up(service)
    )
    return {
        "total_price": total,
        "government_fee": service.government_fee if show_breakdown else None,
        "company_fee": service.service_fee if show_breakdown else None,
        "public_note_ar": note_ar,
        "public_note_en": note_en,
    }


def displayed_components(payload):
    return [payload[name] for name in ("government_fee", "company_fee") if payload.get(name) is not None]


def pricing_invariant_problem(payload):
    """A message when a public payload shows components that do not sum to the shown total."""
    components = displayed_components(payload)
    if not components:
        return None
    total = payload.get("total_price")
    if total is None:
        return "Fee components are shown without a total."
    if sum(components, ZERO) != total:
        return f"Displayed fee components ({' + '.join(str(c) for c in components)}) do not add up to the displayed total ({total})."
    return None
