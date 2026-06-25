import hashlib

from django.utils.text import slugify

_ICON_KEYWORDS = (
    (("document", "documents", "وثيقة", "وثائق", "مستند", "مستندات"), "file-text"),
    (("payment", "payments", "دفع", "مدفوعات", "رسوم", "مالية"), "credit-card"),
    (("order", "orders", "طلب", "طلبات"), "clipboard-list"),
    (("provider", "providers", "مزود", "مزوّد", "مزودين", "مزوّدين"), "briefcase-business"),
    (("user", "users", "عميل", "عملاء", "مستخدم", "مستخدمين"), "users-round"),
    (("report", "reports", "تقرير", "تقارير"), "line-chart"),
    (("notification", "notifications", "اشعار", "إشعار", "تنبيه", "تنبيهات"), "bell"),
    (("support", "help", "مساعدة", "دعم"), "circle-help"),
)


def fallback_slug(*parts, default_prefix="item"):
    raw_source = " ".join(str(part or "").strip() for part in parts if str(part or "").strip())
    for part in parts:
        value = slugify(part or "")
        if value:
            return value
    if raw_source:
        digest = hashlib.sha1(raw_source.encode("utf-8")).hexdigest()[:8]
        return f"{default_prefix}-{digest}"
    return default_prefix


def suggest_category_icon(*parts):
    haystack = " ".join(str(part or "").strip().lower() for part in parts)
    for keywords, icon in _ICON_KEYWORDS:
        if any(keyword in haystack for keyword in keywords):
            return icon
    return "folder-tree"
