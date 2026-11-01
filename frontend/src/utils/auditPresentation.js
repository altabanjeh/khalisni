import { normalizeLanguage } from './i18n'

// DEF-A04: audit-log and notification codes are shown as readable labels in
// the screen language. Codes not listed here are humanized ("snake_case" ->
// "Snake case") instead of being printed raw.

const ACTIONS = {
  create: ['إنشاء', 'Create'],
  update: ['تعديل', 'Update'],
  delete: ['حذف', 'Delete'],
  restore: ['استعادة', 'Restore'],
  register: ['تسجيل حساب جديد', 'Account registration'],
  login: ['تسجيل الدخول', 'Sign in'],
  logout: ['تسجيل الخروج', 'Sign out'],
  password_reset_request: ['طلب إعادة تعيين كلمة المرور', 'Password reset requested'],
  password_reset_success: ['إعادة تعيين كلمة المرور', 'Password reset completed'],
  update_profile: ['تحديث الملف الشخصي', 'Profile updated'],
  create_order: ['إنشاء طلب', 'Request created'],
  submit_order: ['إرسال طلب', 'Request submitted'],
  claim_review_order: ['استلام الطلب للمراجعة', 'Request claimed for review'],
  start_review: ['بدء المراجعة', 'Review started'],
  resume_review: ['استئناف المراجعة', 'Review resumed'],
  change_order_status: ['تغيير حالة الطلب', 'Request status changed'],
  status_change: ['تغيير الحالة', 'Status changed'],
  request_documents: ['طلب مستندات', 'Documents requested'],
  request_missing_documents: ['طلب مستندات ناقصة', 'Missing documents requested'],
  recover_missing_document_request: ['معالجة طلب مستندات غير قابل للرفع', 'Unanswerable document request recovered'],
  recover_missing_document_request_detail: ['معالجة طلب مستندات غير قابل للرفع', 'Unanswerable document request recovered'],
  recreate_missing_document_request: ['إعادة إنشاء طلب المستندات', 'Document request recreated'],
  customer_upload_document: ['رفع مستند من العميل', 'Customer uploaded a document'],
  upload_document: ['رفع مستند', 'Document uploaded'],
  verify_document: ['اعتماد مستند', 'Document verified'],
  reject_document: ['رفض مستند', 'Document rejected'],
  delete_document: ['حذف مستند', 'Document deleted'],
  assign: ['إسناد', 'Assigned'],
  unassign: ['إلغاء الإسناد', 'Unassigned'],
  assign_provider: ['إسناد مزود الخدمة', 'Provider assigned'],
  reassign_provider: ['تغيير مزود الخدمة', 'Provider changed'],
  provider_start_work: ['بدء التنفيذ من المزود', 'Provider started work'],
  provider_resume_work: ['استئناف التنفيذ من المزود', 'Provider resumed work'],
  provider_pause_for_government: ['إيقاف بانتظار جهة حكومية', 'Paused for a government authority'],
  provider_status_update: ['تحديث حالة من المزود', 'Provider status update'],
  provider_add_note: ['ملاحظة من المزود', 'Provider note'],
  provider_upload_final_document: ['رفع النتيجة النهائية من المزود', 'Provider uploaded the final result'],
  upload_final_document: ['رفع النتيجة النهائية', 'Final result uploaded'],
  return_to_provider: ['إعادة الطلب إلى المزود', 'Returned to the provider'],
  return_to_internal_review: ['إعادة الطلب إلى المراجعة الداخلية', 'Returned to internal review'],
  return_order_after_final_document_rejection: ['إعادة الطلب بعد رفض النتيجة النهائية', 'Returned after the final result was rejected'],
  mark_ready_for_delivery: ['تجهيز الطلب للتسليم', 'Marked ready for delivery'],
  update_delivery_method: ['تحديث طريقة التسليم', 'Delivery method updated'],
  complete_order: ['إكمال الطلب', 'Request completed'],
  reject_order: ['رفض الطلب', 'Request rejected'],
  cancel_order: ['إلغاء الطلب', 'Request cancelled'],
  reopen_order: ['إعادة فتح الطلب', 'Request reopened'],
  archive_order: ['أرشفة الطلب', 'Request archived'],
  archive_order_record: ['أرشفة سجل الطلب', 'Request record archived'],
  rate_order: ['تقييم الطلب', 'Request rated'],
  add_note: ['إضافة ملاحظة', 'Note added'],
  comment: ['تعليق', 'Comment'],
  customer_message: ['رسالة من العميل', 'Customer message'],
  customer_complaint: ['شكوى من العميل', 'Customer complaint'],
  resolve_customer_complaint: ['معالجة شكوى العميل', 'Customer complaint resolved'],
  payment_update: ['تحديث الدفع', 'Payment updated'],
  payment_status_update: ['تحديث حالة الدفع', 'Payment status updated'],
  notification_sent: ['إرسال إشعار', 'Notification sent'],
  send_manual_notification: ['إرسال إشعار يدوي', 'Manual notification sent'],
  notification_event_dispatched: ['إرسال إشعار حدث', 'Event notification sent'],
  notification_event_skipped: ['تخطي إشعار حدث', 'Event notification skipped'],
  notification_event_failed: ['فشل إشعار حدث', 'Event notification failed'],
  system_event: ['حدث نظام', 'System event'],
  blocked_delete: ['منع حذف', 'Delete blocked'],
  blocked_order_status_transition: ['منع تغيير حالة الطلب', 'Status change blocked'],
  blocked_admin_order_update: ['منع تعديل الطلب', 'Request edit blocked'],
  apply_retention_policy: ['تطبيق سياسة الاحتفاظ بالبيانات', 'Retention policy applied'],
  create_admin_user: ['إنشاء مستخدم', 'User created'],
  update_admin_user: ['تعديل مستخدم', 'User updated'],
  delete_admin_user: ['حذف مستخدم', 'User deleted'],
  restore_admin_user: ['استعادة مستخدم', 'User restored'],
  set_user_permissions: ['تعديل صلاحيات مستخدم', 'User permissions changed'],
  update_service: ['تعديل خدمة', 'Service updated'],
  update_system_setting: ['تعديل إعداد النظام', 'System setting updated'],
  create_system_setting: ['إنشاء إعداد النظام', 'System setting created'],
  update_notification_template: ['تعديل قالب إشعار', 'Notification template updated'],
  create_notification_template: ['إنشاء قالب إشعار', 'Notification template created'],
  update_public_page_content: ['تعديل محتوى الموقع', 'Website content updated'],
  update_public_site_theme: ['تعديل مظهر الموقع', 'Website theme updated'],
  create_missing_service_request: ['طلب خدمة غير موجودة', 'Special service request'],
  update_missing_service_request: ['تحديث طلب خدمة غير موجودة', 'Special service request updated'],
  create_contact_inquiry: ['رسالة تواصل', 'Contact message'],
  provider_approval_decision: ['قرار اعتماد مزود', 'Provider approval decision'],
  provider_activation_change: ['تغيير تفعيل مزود', 'Provider activation changed'],
  update_provider_profile: ['تعديل ملف مزود', 'Provider profile updated'],
  create_provider_profile: ['إنشاء ملف مزود', 'Provider profile created'],
  publish_legal_document_version: ['نشر نسخة وثيقة قانونية', 'Legal document version published'],
}

const SOURCES = {
  admin: ['لوحة الإدارة', 'Admin panel'],
  client_portal: ['بوابة العميل', 'Customer portal'],
  customer_portal: ['بوابة العميل', 'Customer portal'],
  employee_portal: ['بوابة الموظف', 'Staff portal'],
  provider_portal: ['بوابة المزود', 'Provider portal'],
  api: ['واجهة برمجية', 'API'],
  system: ['النظام', 'System'],
  web: ['الموقع', 'Website'],
  mobile: ['تطبيق الجوال', 'Mobile app'],
}

const STATUSES = {
  success: ['نجح', 'Succeeded'],
  failed: ['فشل', 'Failed'],
  failure: ['فشل', 'Failed'],
  blocked: ['ممنوع', 'Blocked'],
  pending: ['قيد الانتظار', 'Pending'],
  queued: ['في قائمة الإرسال', 'Queued'],
  sent: ['أُرسل', 'Sent'],
  delivered: ['وصل', 'Delivered'],
  read: ['مقروء', 'Read'],
  cancelled: ['ملغى', 'Cancelled'],
  skipped: ['تم التخطي', 'Skipped'],
}

const CHANNELS = {
  system: ['داخل المنصة', 'In-app'],
  email: ['البريد الإلكتروني', 'Email'],
  sms: ['رسالة نصية', 'SMS'],
  whatsapp: ['واتساب', 'WhatsApp'],
}

const ROLES = {
  customer: ['عميل', 'Customer'],
  employee: ['موظف', 'Employee'],
  support: ['دعم', 'Support'],
  provider: ['مزود خدمة', 'Provider'],
  admin: ['مدير', 'Admin'],
  system: ['النظام', 'System'],
}

// "mark_ready_for_delivery" -> "Mark ready for delivery"
export function humanizeCode(code) {
  const text = String(code ?? '').trim()
  if (!text) return ''
  const spaced = text.replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

function lookup(map, code, language, fallback = '—') {
  const key = String(code ?? '').trim()
  if (!key) return fallback
  const entry = map[key] || map[key.toLowerCase()]
  if (entry) return normalizeLanguage(language) === 'en' ? entry[1] : entry[0]
  return humanizeCode(key)
}

export const getAuditActionLabel = (code, language) => lookup(ACTIONS, code, language)
export const getAuditSourceLabel = (code, language) => lookup(SOURCES, code, language)
export const getAuditStatusLabel = (code, language) => lookup(STATUSES, code, language)
export const getNotificationStatusLabel = (code, language) => lookup(STATUSES, code, language)
export const getNotificationChannelLabel = (code, language) => lookup(CHANNELS, code, language)
export const getAuditRoleLabel = (code, language) => lookup(ROLES, code, language)
export const getAuditEntityLabel = (code) => {
  const text = String(code ?? '').trim()
  if (!text) return '—'
  // Model names ("CustomUser", "Order") read fine once split into words.
  return text.includes('_') || /[a-z][A-Z]/.test(text) ? humanizeCode(text) : text
}
