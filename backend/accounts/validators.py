"""Canonical account-field validation shared by every API that accepts a phone number.

No country-specific numbering policy is documented for Khalsni, so the rule
accepts any sane local or international number instead of a Jordan-only
pattern:

* an optional single leading ``+`` (``00`` international prefixes are digits);
* digits, optionally grouped with spaces, hyphens, dots or parentheses;
* 8 to 15 digits in total (15 is the E.164 maximum; 8 covers short local
  numbers such as Jordanian landlines without the area code).

Examples that pass: ``0791234567``, ``+962 79 123 4567``, ``00962-79-1234567``.
The value is stored as entered (trimmed); order tracking compares it as typed.
"""

import re

PHONE_MIN_DIGITS = 8
PHONE_MAX_DIGITS = 15
PHONE_EXAMPLE = "0791234567"
_PHONE_SHAPE = re.compile(r"^\+?[0-9(][0-9 ().\-]*[0-9]$")

PHONE_MESSAGES = {
    "required": {
        "ar": "رقم الهاتف مطلوب.",
        "en": "Phone number is required.",
    },
    "invalid": {
        "ar": f"أدخل رقم هاتف صحيحاً من {PHONE_MIN_DIGITS} إلى {PHONE_MAX_DIGITS} رقماً، مثل {PHONE_EXAMPLE} أو ‎+962791234567.",
        "en": f"Enter a valid phone number with {PHONE_MIN_DIGITS} to {PHONE_MAX_DIGITS} digits, for example {PHONE_EXAMPLE} or +962791234567.",
    },
}


def phone_number_error(value):
    """Return ``"required"``, ``"invalid"`` or ``None`` for a candidate phone number."""
    value = (value or "").strip()
    if not value:
        return "required"
    if not _PHONE_SHAPE.match(value):
        return "invalid"
    digits = sum(1 for char in value if char.isdigit())
    if not PHONE_MIN_DIGITS <= digits <= PHONE_MAX_DIGITS:
        return "invalid"
    return None
