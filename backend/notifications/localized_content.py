"""Bilingual customer-facing copy for built-in notification events."""

from notifications.utils import render_notification_text


EVENT_ARABIC = {
    "order_submitted": ("تم استلام الطلب", "تم إنشاء الطلب {{order_number}} بنجاح."),
    "order_under_review": ("الطلب قيد المراجعة", "الطلب {{order_number}} قيد المراجعة."),
    "missing_documents_requested": ("مستندات إضافية مطلوبة", "يرجى مراجعة المستندات المطلوبة للطلب {{order_number}}."),
    "client_uploaded_missing_document": ("تم رفع مستند مطلوب", "رفع العميل مستنداً مطلوباً للطلب {{order_number}}."),
    "document_rejected": ("المستند يحتاج إلى تصحيح", "تم رفض مستند للطلب {{order_number}} ويحتاج إلى تصحيح."),
    "document_verified": ("تمت مراجعة المستند", "تم اعتماد مستند للطلب {{order_number}}."),
    "provider_assigned": ("تم إسناد الطلب", "تم إسناد الطلب {{order_number}} إلى مزود الخدمة."),
    "provider_started_work": ("بدأ تنفيذ الطلب", "بدأ العمل على الطلب {{order_number}}."),
    "provider_completed_work": ("تم رفع النتيجة النهائية", "رفع مزود الخدمة النتيجة النهائية للطلب {{order_number}}."),
    "provider_result_returned": ("إعادة الطلب لاستكمال العمل", "أعيد الطلب {{order_number}} إلى مزود الخدمة لاستكمال العمل."),
    "order_ready_for_delivery": ("الطلب جاهز للتسليم", "الطلب {{order_number}} جاهز للتسليم."),
    "order_completed": ("اكتمل الطلب", "اكتمل الطلب {{order_number}}."),
    "order_cancelled": ("أُلغي الطلب", "أُلغي الطلب {{order_number}}."),
    "order_reopened": ("أعيد فتح الطلب", "أعيد فتح الطلب {{order_number}} لمتابعة العمل."),
    "payment_status_changed": ("تحديث حالة الدفع", "تغيرت حالة الدفع للطلب {{order_number}}."),
}


def render_event_arabic(event_key, context_data, *, recipient_kind=""):
    title, message = EVENT_ARABIC.get(event_key, ("تحديث الطلب", "يوجد تحديث للطلب {{order_number}}."))
    if event_key == "provider_assigned" and recipient_kind == "provider":
        title, message = "طلب جديد مسند إليك", "أُسند إليك الطلب {{order_number}}."
    return {
        "title": render_notification_text(title, context_data=context_data),
        "message": render_notification_text(message, context_data=context_data),
    }
