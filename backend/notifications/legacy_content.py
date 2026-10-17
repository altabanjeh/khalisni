"""Arabic rendering for notifications stored before bilingual content existed (audit D03).

Old rows carry a fixed English title and sentence with no ``localized`` copy
and no event code. They are not rewritten. When a row is exactly one of the
sentences below, the Arabic version is produced at read time from the order
number inside it. Any other title or message (for example a reason a staff
member typed) is returned unchanged.
"""

import re

LEGACY_ORDER_TITLES = {
    "Order received": "تم استلام الطلب",
    "New assigned order": "طلب جديد مسند إليك",
    "Order completed": "اكتمل الطلب",
    "Final result uploaded": "تم رفع النتيجة النهائية",
    "More documents required": "مستندات إضافية مطلوبة",
}

LEGACY_ORDER_MESSAGES = (
    (re.compile(r"^Your order (?P<number>[A-Z]{2}-\d{4}-\d{6}) was created successfully\.$"), "تم إنشاء الطلب {number} بنجاح."),
    (re.compile(r"^Order (?P<number>[A-Z]{2}-\d{4}-\d{6}) was assigned to you\.$"), "أُسند إليك الطلب {number}."),
    (re.compile(r"^A new order (?P<number>[A-Z]{2}-\d{4}-\d{6}) was assigned to you\.$"), "أُسند إليك الطلب {number}."),
    (re.compile(r"^Order (?P<number>[A-Z]{2}-\d{4}-\d{6}) is completed\.$"), "اكتمل الطلب {number}."),
    (re.compile(r"^Order (?P<number>[A-Z]{2}-\d{4}-\d{6}) is ready for verification\.$"), "رُفعت النتيجة النهائية للطلب {number} وهي بانتظار التحقق."),
)


def legacy_arabic(field, value):
    """Arabic text for an exact legacy system sentence, otherwise ``None``."""
    text = (value or "").strip()
    if field == "title":
        return LEGACY_ORDER_TITLES.get(text)
    for pattern, template in LEGACY_ORDER_MESSAGES:
        match = pattern.match(text)
        if match:
            return template.format(number=match.group("number"))
    return None
