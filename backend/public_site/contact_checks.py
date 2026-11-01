"""Recognise placeholder values in the published contact details (audit D05).

This never decides which contact value is correct. It only recognises values
that cannot be real published contact details:

* an email on a reserved, non-deliverable domain (``.local``, ``.test`` ...) or
  on an ``example`` domain (``example.com``, ``support.example.org`` ...);
* a phone or WhatsApp number made of an obvious filler (six or more identical
  digits such as ``000000``, or a run such as ``1234567``);
* a value shipped earlier as sample data and never confirmed by the owner
  (``KNOWN_PLACEHOLDERS``), e.g. the office address «مبنى خلصني للخدمات»;
* filler words (``lorem``, ``placeholder``, ``TBD`` ...).

Used by ``check_public_content --strict`` and the deploy check
``khalsni.E002`` (public_site/checks.py).
"""

import re

from core.reserved_domains import email_domain, is_reserved_email

CONTACT_FIELDS = (
    "contact_phone",
    "whatsapp_number",
    "email",
    "office_address",
    "office_address_en",
    "office_hours_ar",
    "office_hours_en",
)
PHONE_FIELDS = ("contact_phone", "whatsapp_number")

# Sample values shipped in earlier data (see docs/audit/KHALSNI_OWNER_DECISION_DOSSIER.md §1).
# Phones are compared by their digits.
KNOWN_PLACEHOLDER_PHONE_DIGITS = frozenset({"96265609000", "065609000", "962790000000", "0790000000"})
KNOWN_PLACEHOLDER_TEXT_FRAGMENTS = (
    "مبنى خلصني للخدمات",
    "مبنى خلّصني للخدمات",
    "khalisni services building",
    "khalsni services building",
)
FILLER_WORDS = re.compile(r"\b(lorem|ipsum|placeholder|tbd|todo|xxx+|dummy|n/a)\b", re.IGNORECASE)
REPEATED_DIGITS = re.compile(r"(\d)\1{5,}")
SEQUENTIAL_RUNS = ("1234567", "7654321", "0123456")


def digits_of(value):
    return re.sub(r"\D", "", str(value or ""))


def is_example_domain(address):
    """``x@example.com``, ``x@khalsni.example.com``, ``x@example.org`` ..."""
    domain = email_domain(address).rstrip(".")
    return bool(domain) and "example" in domain.split(".")


def is_placeholder_email(address):
    return is_reserved_email(address) or is_example_domain(address)


def is_placeholder_phone(value):
    digits = digits_of(value)
    if not digits:
        return False
    if digits in KNOWN_PLACEHOLDER_PHONE_DIGITS:
        return True
    if REPEATED_DIGITS.search(digits):
        return True
    return any(run in digits for run in SEQUENTIAL_RUNS)


def is_placeholder_text(value):
    text = " ".join(str(value or "").split()).lower()
    if not text:
        return False
    if any(fragment in text for fragment in KNOWN_PLACEHOLDER_TEXT_FRAGMENTS):
        return True
    return bool(FILLER_WORDS.search(text))


def placeholder_reason(field, value):
    """A short reason when ``value`` of contact ``field`` is a placeholder, else ``""``."""
    value = (value or "").strip()
    if not value:
        return ""
    if field == "email":
        if is_reserved_email(value):
            return "reserved, non-deliverable domain"
        if is_example_domain(value):
            return "example domain"
        return "filler text" if is_placeholder_text(value) else ""
    if field in PHONE_FIELDS:
        if is_placeholder_phone(value):
            return "placeholder number"
        return "filler text" if is_placeholder_text(value) else ""
    return "known placeholder or filler text" if is_placeholder_text(value) else ""


def contact_placeholder_findings(content):
    """``[(field, value, reason)]`` for every placeholder value of a content row."""
    findings = []
    if content is None:
        return findings
    for field in CONTACT_FIELDS:
        value = getattr(content, field, "") or ""
        reason = placeholder_reason(field, value)
        if reason:
            findings.append((field, value, reason))
    return findings

