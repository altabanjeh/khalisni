import type { OrderStatusLog } from '../types/order';

// System-written timeline notes arrive with a `system_event` code (backend
// orders/system_events.py) and are rendered here in Arabic. Notes a person
// typed (for example the customer-facing rejection or cancellation reason)
// have no code and are shown exactly as written. Same table as the web,
// frontend/src/utils/timelinePresentation.js.
const SYSTEM_EVENTS: Record<string, string> = {
  order_submitted: 'تم إرسال الطلب.',
  order_under_review: 'الطلب قيد المراجعة.',
  order_returned_to_review: 'أعيد الطلب إلى المراجعة.',
  customer_uploaded_missing_documents: 'رفع العميل المستندات المطلوبة.',
  customer_uploaded_all_missing_documents: 'رفع العميل جميع المستندات المطلوبة.',
  staff_approved_requested_documents: 'اعتمد الفريق جميع المستندات المطلوبة.',
  provider_assigned: 'تم إسناد الطلب إلى مزود الخدمة.',
  provider_started_work: 'بدأ مزود الخدمة العمل على الطلب.',
  provider_completed_work: 'أنهى مزود الخدمة العمل ورفع النتيجة النهائية.',
  final_document_uploaded: 'تم رفع النتيجة النهائية.',
  final_document_returned: 'رُفضت النتيجة النهائية وأعيد الطلب لاستكمال العمل.',
  order_completed: 'اكتمل الطلب.',
  order_archived: 'تمت أرشفة الطلب.',
  missing_request_recovered: 'أعاد الفريق الطلب إلى المراجعة لأن طلب المستندات السابق لم يكن قابلاً للرفع. السبب: {reason}',
};

export const SYSTEM_EVENT_CODES = Object.keys(SYSTEM_EVENTS);

/** Text for a timeline entry: the Arabic system sentence for a known code, else the note as written. */
export function describeTimelineNote(item?: Pick<OrderStatusLog, 'note' | 'system_event' | 'system_event_params'> | null) {
  const template = item?.system_event ? SYSTEM_EVENTS[item.system_event] : undefined;
  if (!template) return String(item?.note ?? '').trim();
  const params = item?.system_event_params ?? {};
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
}

/** Timeline entries oldest first, as the web shows them. */
export function sortTimeline(logs?: OrderStatusLog[] | null) {
  return [...(logs ?? [])].sort((a, b) => {
    const left = a.created_at ? Date.parse(a.created_at) : 0;
    const right = b.created_at ? Date.parse(b.created_at) : 0;
    if (left !== right) return left - right;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

/**
 * The reason the customer is shown for a closed order: the note of the latest
 * REJECTED/CANCELLED timeline entry (the backend sends it only for those
 * statuses), else `rejection_reason` when the backend includes it.
 */
export function getClosureReason(
  order?: { status?: string; status_logs?: OrderStatusLog[] | null; rejection_reason?: string | null } | null,
) {
  if (!order || !['REJECTED', 'CANCELLED'].includes(String(order.status || '').toUpperCase())) return '';
  const closing = sortTimeline(order.status_logs)
    .reverse()
    .find((log) => String(log.new_status || '').toUpperCase() === String(order.status).toUpperCase());
  const fromTimeline = closing ? describeTimelineNote(closing) : '';
  return fromTimeline || String(order.rejection_reason ?? '').trim();
}
