"""Canonical phone identity shared by every API that accepts a phone number.

Owner decision (phone policy): a phone number is stored and compared in one
canonical E.164 form, ``+<country code><number>``.

* Numbers typed without a country code are Jordanian (default country +962):
  ``0791234567``, ``079 123 4567``, ``791234567`` -> ``+962791234567``.
* ``+`` or ``00`` introduces an explicit country code and the number stays
  international: ``00962791234567`` -> ``+962791234567``,
  ``+44 20 7946 0958`` -> ``+442079460958``.
* Spaces, hyphens, dots and parentheses are ignored; Arabic-Indic digits are
  read as digits.

Jordanian numbers are checked for length (mobile ``7x`` numbers have 9 digits
after +962, other numbers 8). International numbers need 8 to 15 digits in
total, the E.164 maximum. Anything else is invalid.

Use ``normalize_phone`` before storing and ``phone_identity`` when comparing;
never compare phone strings as typed.
"""

import re

DEFAULT_COUNTRY_CODE = "962"
PHONE_MIN_DIGITS = 8
PHONE_MAX_DIGITS = 15
PHONE_EXAMPLE = "0791234567"

_PHONE_SHAPE = re.compile(r"^\+?[0-9(][0-9 ().\-]*[0-9]$")
_ARABIC_DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")

PHONE_MESSAGES = {
    "required": {
        "ar": "رقم الهاتف مطلوب.",
        "en": "Phone number is required.",
    },
    "invalid": {
        "ar": f"أدخل رقم هاتف صحيحاً، مثل {PHONE_EXAMPLE} أو ‎+962791234567. للأرقام من خارج الأردن أضف رمز الدولة مسبوقاً بـ + أو 00.",
        "en": f"Enter a valid phone number, for example {PHONE_EXAMPLE} or +962791234567. For a number outside Jordan, add the country code after + or 00.",
    },
}


def _jordan_number_is_valid(national):
    if not national or national[0] == "0":
        return False
    return len(national) == (9 if national[0] == "7" else 8)


def normalize_phone(value):
    """Return the canonical ``+<digits>`` form, ``""`` for an empty value, or ``None`` if invalid."""
    raw = str(value or "").translate(_ARABIC_DIGITS).strip()
    if not raw:
        return ""
    if not _PHONE_SHAPE.match(raw):
        return None
    digits = "".join(char for char in raw if char.isdigit())

    if raw.startswith("+"):
        international = digits
    elif digits.startswith("00"):
        international = digits[2:]
    elif digits.startswith(DEFAULT_COUNTRY_CODE) and len(digits) in (11, 12):
        # A Jordanian number written with its country code but no "+".
        international = digits
    elif digits.startswith("0"):
        international = DEFAULT_COUNTRY_CODE + digits[1:]
    else:
        international = DEFAULT_COUNTRY_CODE + digits

    if international.startswith(DEFAULT_COUNTRY_CODE):
        if not _jordan_number_is_valid(international[len(DEFAULT_COUNTRY_CODE):]):
            return None
    elif international.startswith("0") or not PHONE_MIN_DIGITS <= len(international) <= PHONE_MAX_DIGITS:
        return None
    return f"+{international}"


def phone_identity(value):
    """Comparison key: the canonical number, or the trimmed text for a legacy value that cannot be normalized."""
    canonical = normalize_phone(value)
    if canonical is None:
        return str(value or "").strip()
    return canonical


def phones_match(first, second):
    first_key = phone_identity(first)
    return bool(first_key) and first_key == phone_identity(second)


def phone_number_error(value):
    """Return ``"required"``, ``"invalid"`` or ``None`` for a candidate phone number."""
    canonical = normalize_phone(value)
    if canonical == "":
        return "required"
    if canonical is None:
        return "invalid"
    return None
