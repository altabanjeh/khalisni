// Human-readable presentation of workflow metadata returned by the API
// (`allowed_actions.workflow_transitions`, `/admin/workflow-rules/`).
// The server stays the authority on what is allowed; this module only turns
// its stable codes into Arabic or English text. Staff-authored free text is
// never passed through here.
import { getStatusLabel } from './format'
import { getRequiredDocumentLabel } from './serviceForms'

const pick = (entry, language) => (language === 'en' ? entry.en : entry.ar)

const ACTIONS = {
  start_review: { ar: 'بدء المراجعة', en: 'Start review' },
  request_missing_documents: { ar: 'طلب مستندات ناقصة', en: 'Request missing documents' },
  resume_review: { ar: 'استئناف المراجعة', en: 'Resume review' },
  assign_provider: { ar: 'تعيين مزوّد الخدمة', en: 'Assign a provider' },
  reject_order: { ar: 'رفض الطلب', en: 'Reject the request' },
  cancel_order: { ar: 'إلغاء الطلب', en: 'Cancel the request' },
  provider_start_work: { ar: 'بدء التنفيذ من مزوّد الخدمة', en: 'Provider starts work' },
  provider_pause_for_government: { ar: 'انتظار جهة حكومية', en: 'Wait for a government office' },
  provider_resume_work: { ar: 'متابعة التنفيذ', en: 'Resume work' },
  mark_ready_for_delivery: { ar: 'تجهيز النتيجة للتسليم', en: 'Mark ready for delivery' },
  return_to_internal_review: { ar: 'إعادة إلى المراجعة الداخلية', en: 'Return to internal review' },
  return_to_provider: { ar: 'إعادة إلى مزوّد الخدمة', en: 'Return to the provider' },
  complete_order: { ar: 'إكمال الطلب', en: 'Complete the request' },
  reopen_order: { ar: 'إعادة فتح الطلب', en: 'Reopen the request' },
  archive_order: { ar: 'أرشفة الطلب', en: 'Archive the request' },
}

const ROLES = {
  admin: { ar: 'المدير', en: 'Admin' },
  employee: { ar: 'الموظف', en: 'Employee' },
  support: { ar: 'الدعم', en: 'Support' },
  provider: { ar: 'مزوّد الخدمة', en: 'Provider' },
  customer: { ar: 'العميل', en: 'Customer' },
}

const CHECKS = {
  internal_actor_required: { ar: 'ينفذه فريق العمل الداخلي', en: 'Done by internal staff' },
  customer_owns_order: { ar: 'العميل صاحب الطلب فقط', en: 'Only the customer who owns the request' },
  note_required: { ar: 'يتطلب ملاحظة للعميل', en: 'A note to the customer is required' },
  reason_required: { ar: 'يتطلب ذكر السبب', en: 'A reason is required' },
  provider_required: { ar: 'يجب اختيار مزوّد', en: 'A provider must be chosen' },
  required_documents_approved: { ar: 'اعتماد جميع المستندات المطلوبة', en: 'All required documents approved' },
  provider_approved: { ar: 'مزوّد معتمد', en: 'Provider is approved' },
  provider_available: { ar: 'مزوّد متاح', en: 'Provider is available' },
  provider_service_match: { ar: 'المزوّد مرتبط بهذه الخدمة', en: 'Provider is linked to this service' },
  assigned_employee_or_unassigned: { ar: 'الموظف المسؤول عن الطلب أو طلب غير مسند', en: 'The assigned employee, or an unassigned request' },
  all_missing_documents_uploaded: { ar: 'رفع جميع المستندات المطلوبة من العميل', en: 'All requested documents uploaded by the customer' },
  assigned_provider_only: { ar: 'مزوّد الخدمة المعيّن فقط', en: 'Only the assigned provider' },
  assigned_provider_required: { ar: 'وجود مزوّد معيّن', en: 'An assigned provider is required' },
  final_document_required: { ar: 'رفع النتيجة النهائية', en: 'Final result uploaded' },
  final_document_verified_or_admin_override: { ar: 'نتيجة نهائية معتمدة أو تأكيد المدير', en: 'Verified final result, or admin confirmation' },
}

const CHANNELS = {
  status: { ar: 'تحديث الحالة', en: 'Status update' },
  provider_status: { ar: 'تحديث مزوّد الخدمة', en: 'Provider update' },
  dedicated: { ar: 'إجراء مخصص', en: 'Dedicated action' },
}

export function getWorkflowActionLabel(action, language) {
  const entry = ACTIONS[action]
  if (entry) return pick(entry, language)
  return language === 'en' ? 'Workflow action' : 'إجراء في سير العمل'
}

export function getRoleLabel(role, language) {
  const entry = ROLES[role]
  return entry ? pick(entry, language) : (language === 'en' ? 'Another role' : 'دور آخر')
}

export function getWorkflowCheckLabel(check, language) {
  const entry = CHECKS[check]
  return entry ? pick(entry, language) : (language === 'en' ? 'An additional condition' : 'شرط إضافي')
}

export function getWorkflowChannelLabel(channel, language) {
  return pick(CHANNELS[channel] || CHANNELS.dedicated, language)
}

function documentNames(types = [], documents = [], language) {
  return types
    .map((type) => {
      const match = documents.find((item) => String(item?.document_type || '').toLowerCase() === String(type).toLowerCase())
      return match ? getRequiredDocumentLabel(match, language) : getRequiredDocumentLabel(String(type), language)
    })
    .join(language === 'en' ? ', ' : '، ')
}

// One localized sentence for a blocked-reason code from the API.
export function describeBlockedReason(blocked, { language, documents = [] } = {}) {
  const en = language === 'en'
  const params = blocked?.params || {}
  switch (blocked?.code) {
    case 'role_not_allowed': {
      const roles = (params.allowed_roles || []).map((role) => getRoleLabel(role, language)).join(en ? ', ' : ' أو ')
      return en ? `Only ${roles || 'another role'} can do this.` : `هذا الإجراء من صلاحية ${roles || 'دور آخر'}.`
    }
    case 'actor_not_assigned':
      return en ? 'Only the staff member or provider assigned to this request can do this.' : 'هذا الإجراء للموظف أو المزوّد المعيّن على الطلب فقط.'
    case 'documents_incomplete':
      return en ? 'Required documents are not all uploaded and approved yet.' : 'لم تُرفع وتُعتمد جميع المستندات المطلوبة بعد.'
    case 'no_uploadable_requirements':
      return en ? 'This service has no configured documents to request.' : 'لا توجد مستندات مُعرّفة لهذه الخدمة يمكن طلبها.'
    case 'missing_request_invalid':
      return en ? 'There is no valid missing-document request to answer.' : 'لا يوجد طلب مستندات صالح يمكن للعميل الاستجابة له.'
    case 'requested_documents_pending': {
      const names = documentNames(params.document_types, documents, language)
      return en ? `Waiting for the customer to upload: ${names}.` : `بانتظار رفع العميل للمستندات: ${names}.`
    }
    case 'final_result_unverified':
      return en ? 'The final result must be verified first.' : 'يجب اعتماد النتيجة النهائية أولاً.'
    default:
      return en ? 'This action is not available right now.' : 'هذا الإجراء غير متاح حالياً.'
  }
}

export function describeTransitionBlock(option, { language, documents } = {}) {
  const reasons = (option?.blocked || []).map((item) => describeBlockedReason(item, { language, documents }))
  if (!reasons.length && option && !option.available) reasons.push(describeBlockedReason(null, { language }))
  return `${getWorkflowActionLabel(option?.action, language)}: ${reasons.join(' ')}`
}

export function describeRule(rule, language) {
  const from = getStatusLabel(rule.from_status, language)
  const to = getStatusLabel(rule.to_status, language)
  return language === 'en' ? `${from} → ${to}` : `${from} ← ${to}`
}
