import { normalizeLanguage } from './i18n'

// System-written timeline notes arrive with a `system_event` code
// (backend orders/system_events.py) and are rendered here in the screen
// language. Notes a person typed have no code and are shown exactly as written.
// orders.tests_p2_remediation checks that every backend code is listed here.
const SYSTEM_EVENTS = {
  order_submitted: { ar: 'تم إرسال الطلب.', en: 'Request submitted.' },
  order_under_review: { ar: 'الطلب قيد المراجعة.', en: 'Request under review.' },
  order_returned_to_review: { ar: 'أعيد الطلب إلى المراجعة.', en: 'Request returned to review.' },
  customer_uploaded_missing_documents: { ar: 'رفع العميل المستندات المطلوبة.', en: 'The customer uploaded the requested documents.' },
  customer_uploaded_all_missing_documents: { ar: 'رفع العميل جميع المستندات المطلوبة.', en: 'The customer uploaded all requested documents.' },
  staff_approved_requested_documents: { ar: 'اعتمد الفريق جميع المستندات المطلوبة.', en: 'Staff approved all requested documents.' },
  provider_assigned: { ar: 'تم إسناد الطلب إلى مزود الخدمة.', en: 'Request assigned to the provider.' },
  provider_started_work: { ar: 'بدأ مزود الخدمة العمل على الطلب.', en: 'The provider started work.' },
  provider_completed_work: { ar: 'أنهى مزود الخدمة العمل ورفع النتيجة النهائية.', en: 'The provider completed the work and uploaded the final result.' },
  final_document_uploaded: { ar: 'تم رفع النتيجة النهائية.', en: 'Final result uploaded.' },
  final_document_returned: { ar: 'رُفضت النتيجة النهائية وأعيد الطلب لاستكمال العمل.', en: 'The final result was rejected and returned for rework.' },
  order_completed: { ar: 'اكتمل الطلب.', en: 'Request completed.' },
  order_archived: { ar: 'تمت أرشفة الطلب.', en: 'Request archived.' },
  missing_request_recovered: {
    ar: 'أعاد الفريق الطلب إلى المراجعة لأن طلب المستندات السابق لم يكن قابلاً للرفع. السبب: {reason}',
    en: 'Staff returned the request to review because the previous document request could not be answered. Reason: {reason}',
  },
}

// Text for a timeline entry: the localized system sentence when the entry has a
// known code, otherwise the note as written (or '' when there is none).
export function describeTimelineNote(item, language) {
  const lang = normalizeLanguage(language)
  const template = SYSTEM_EVENTS[item?.system_event]?.[lang]
  if (!template) return item?.note || ''
  const params = item?.system_event_params || {}
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? '')
}
