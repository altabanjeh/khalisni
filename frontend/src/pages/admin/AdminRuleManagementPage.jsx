import {
  BellRing,
  BriefcaseBusiness,
  CreditCard,
  FileCheck2,
  FileStack,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  Workflow,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getLocalizedField } from '../../utils/i18n'

const SERVICE_TABS = [
  { id: 'services', icon: SlidersHorizontal },
  { id: 'documents', icon: FileCheck2 },
  { id: 'providers', icon: BriefcaseBusiness },
  { id: 'workflow', icon: Workflow },
  { id: 'notifications', icon: BellRing },
  { id: 'payments', icon: CreditCard },
  { id: 'users', icon: UsersRound },
  { id: 'audit', icon: ShieldCheck },
  { id: 'settings', icon: Settings },
]

const DEFAULT_SERVICE_FORM = {
  category_id: '',
  name_ar: '',
  name_en: '',
  short_description_ar: '',
  short_description_en: '',
  description_ar: '',
  description_en: '',
  base_price: '0.00',
  government_fee: '0.00',
  service_fee: '0.00',
  estimated_duration: 1,
  estimated_duration_unit: 'days',
  price_type: 'fixed',
  provider_required: true,
  requires_manual_review: true,
  requires_appointment: false,
  is_online: true,
  is_featured: false,
  is_active: true,
  display_order: 0,
}

const DEFAULT_DOCUMENT_FORM = {
  service_id: '',
  name_ar: '',
  name_en: '',
  is_required: true,
  allowed_extensions: ['.pdf'],
  max_file_size: 10485760,
  requires_verification: true,
  client_can_replace_file: true,
  provider_can_view_file: false,
  display_order: 0,
  is_active: true,
}

const DEFAULT_ASSIGNMENT_FORM = {
  service_id: '',
  provider_id: '',
  is_active: true,
}

const DEFAULT_PROVIDER_ACTION = {
  decision: 'approve',
  approval_reason: '',
  is_active: true,
  activation_reason: '',
}

const DEFAULT_TEMPLATE_FORM = {
  key: '',
  channel: 'system',
  title_ar: '',
  title_en: '',
  message_ar: '',
  message_en: '',
  is_active: true,
}

const DEFAULT_PAYMENT_FORM = {
  status: 'pending',
  reference_number: '',
  notes: '',
  failure_reason: '',
}

const DEFAULT_USER_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'customer',
  national_id: '',
  is_active: true,
  is_verified: false,
}

const DEFAULT_AUDIT_FILTERS = {
  user: '',
  module: '',
  action: '',
  date_from: '',
  date_to: '',
  status: '',
}

const DEFAULT_DELETE_GUARD_FORM = {
  delete_password: '',
  confirm_delete_password: '',
}

const SAFE_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
const PAYMENT_STATUS_OPTIONS = ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded']
const SYSTEM_SETTING_KEYS = ['site.homepage', 'site.contact']
const SETTING_DEFINITIONS = {
  'site.homepage': {
    label: { ar: 'محتوى الصفحة الرئيسية', en: 'Homepage content' },
    help_text: { ar: 'عدّل النصوص العامة الآمنة الظاهرة في الصفحة الرئيسية فقط.', en: 'Edit only the safe public text shown on the home page.' },
    warning: { ar: '', en: '' },
    fields: [
      {
        key: 'hero_title',
        label: { ar: 'العنوان الرئيسي', en: 'Main title' },
        control: 'text',
        help_text: { ar: 'عنوان قصير يظهر أعلى الصفحة الرئيسية.', en: 'Short headline shown at the top of the home page.' },
      },
      {
        key: 'hero_subtitle',
        label: { ar: 'النص الداعم', en: 'Supporting text' },
        control: 'textarea',
        help_text: { ar: 'وصف داعم قصير أسفل العنوان.', en: 'Short supporting description below the title.' },
      },
    ],
  },
  'site.contact': {
    label: { ar: 'بيانات التواصل', en: 'Contact details' },
    help_text: { ar: 'بيانات التواصل العامة التي يستخدمها العملاء عند الحاجة للمساعدة.', en: 'Public contact details used by clients when they need help.' },
    warning: { ar: 'تظهر التغييرات للعملاء فوراً.', en: 'Changes appear to clients immediately.' },
    fields: [
      {
        key: 'phone',
        label: { ar: 'رقم الهاتف', en: 'Phone number' },
        control: 'text',
        help_text: { ar: 'رقم هاتف دعم العملاء الظاهر للجمهور.', en: 'Visible customer support phone number.' },
      },
      {
        key: 'email',
        label: { ar: 'البريد الإلكتروني', en: 'Email address' },
        control: 'email',
        help_text: { ar: 'بريد دعم العملاء الظاهر للجمهور.', en: 'Visible customer support email address.' },
      },
    ],
  },
}

function formatDateTime(value, locale, fallback) {
  if (!value) return fallback
  return new Date(value).toLocaleString(locale)
}

function buildDocumentType(currentValue, values) {
  if (currentValue) return currentValue
  const source = values.name_en || values.name_ar || ''
  const generated = source
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (generated) return generated
  return `document_${values.service_id || 'service'}_${values.display_order || 0}`
}

function toMb(bytes) {
  return `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`
}

function EmptyHelp({ title, text, warning = '' }) {
  return (
    <div className="mb-4 rounded-3xl border border-brand-100 bg-brand-50/60 p-4">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
      {warning ? <p className="mt-2 text-sm font-semibold text-amber-800">{warning}</p> : null}
    </div>
  )
}

function Field({ label, help, children }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
      {help ? <p className="text-xs leading-6 text-slate-500">{help}</p> : null}
    </label>
  )
}

function ToggleField({ label, help, checked, onChange }) {
  return (
    <label className="rounded-2xl border border-border bg-brand-50/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          {help ? <p className="mt-1 text-xs leading-6 text-slate-500">{help}</p> : null}
        </div>
        <input className="h-4 w-4 accent-brand-600" checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      </div>
    </label>
  )
}

function SectionMessage({ message }) {
  if (!message) return null
  return <p className={`text-sm ${message.type === 'error' ? 'text-danger' : 'text-success'}`}>{message.text}</p>
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
        active ? 'bg-brand-600 text-white shadow-soft' : 'bg-white text-slate-600'
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

function AdminRuleManagementPage() {
  const { isArabic, language, locale } = useLanguage()
  const tx = (ar, en) => (isArabic ? ar : en)
  const localizeSettingValue = (value) => (typeof value === 'string' ? value : tx(value?.ar || '', value?.en || ''))
  const getLocalizedName = (record, arField = 'name_ar', enField = 'name_en', fallback = '') =>
    getLocalizedField(record, { ar: arField, en: enField }, language, fallback)
  const roleLabels = {
    customer: tx('عميل', 'Customer'),
    employee: tx('موظف', 'Employee'),
    support: tx('دعم', 'Support'),
    provider: tx('مزود خدمة', 'Provider'),
    admin: tx('مدير', 'Admin'),
  }
  const paymentStatusLabels = {
    pending: tx('قيد الانتظار', 'Pending'),
    processing: tx('قيد المعالجة', 'Processing'),
    paid: tx('مدفوع', 'Paid'),
    failed: tx('فشل', 'Failed'),
    cancelled: tx('ملغي', 'Cancelled'),
    refunded: tx('مسترد', 'Refunded'),
    partially_refunded: tx('مسترد جزئياً', 'Partially refunded'),
  }
  const channelLabels = {
    system: tx('النظام', 'System'),
    email: tx('البريد الإلكتروني', 'Email'),
    sms: tx('رسائل SMS', 'SMS'),
    whatsapp: tx('واتساب', 'WhatsApp'),
  }
  const durationUnitLabels = {
    hours: tx('ساعات', 'Hours'),
    days: tx('أيام', 'Days'),
    weeks: tx('أسابيع', 'Weeks'),
  }
  const tabLabels = {
    services: tx('الخدمات والأسعار', 'Services and pricing'),
    documents: tx('المستندات المطلوبة', 'Required documents'),
    providers: tx('قواعد المزودين', 'Provider rules'),
    workflow: tx('قواعد سير العمل', 'Workflow rules'),
    notifications: tx('قوالب الإشعارات', 'Notification templates'),
    payments: tx('المدفوعات', 'Payments'),
    users: tx('المستخدمون والأدوار', 'Users and roles'),
    audit: tx('سجلات التدقيق', 'Audit logs'),
    settings: tx('إعدادات النظام', 'System settings'),
  }

  const [activeTab, setActiveTab] = useState('services')
  const [feedback, setFeedback] = useState({})
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
  })

  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedSettingId, setSelectedSettingId] = useState(null)
  const [activeEditor, setActiveEditor] = useState(null)

  const [serviceForm, setServiceForm] = useState(DEFAULT_SERVICE_FORM)
  const [documentForm, setDocumentForm] = useState(DEFAULT_DOCUMENT_FORM)
  const [assignmentForm, setAssignmentForm] = useState(DEFAULT_ASSIGNMENT_FORM)
  const [providerActionForm, setProviderActionForm] = useState(DEFAULT_PROVIDER_ACTION)
  const [templateForm, setTemplateForm] = useState(DEFAULT_TEMPLATE_FORM)
  const [templatePreview, setTemplatePreview] = useState(null)
  const [paymentForm, setPaymentForm] = useState(DEFAULT_PAYMENT_FORM)
  const [userForm, setUserForm] = useState(DEFAULT_USER_FORM)
  const [settingForm, setSettingForm] = useState({ key: SYSTEM_SETTING_KEYS[0], description: '', values: {} })
  const [auditFilters, setAuditFilters] = useState(DEFAULT_AUDIT_FILTERS)
  const [deleteGuardForm, setDeleteGuardForm] = useState(DEFAULT_DELETE_GUARD_FORM)

  const { data: categories = [], loading: categoriesLoading } = useAsyncData(() => api.getAdminCategories(), [], [])
  const { data: services = [], loading: servicesLoading, reload: reloadServices } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: documents = [], loading: documentsLoading, reload: reloadDocuments } = useAsyncData(() => api.getAdminServiceDocuments(), [], [])
  const { data: assignments = [], loading: assignmentsLoading, reload: reloadAssignments } = useAsyncData(() => api.getAdminServiceAssignments(), [], [])
  const { data: providers = [], loading: providersLoading, reload: reloadProviders } = useAsyncData(() => api.getProviders(), [], [])
  const { data: workflowRules = [], loading: workflowLoading } = useAsyncData(() => api.getWorkflowRules(), [], [])
  const { data: notificationTemplates = [], loading: templatesLoading, reload: reloadTemplates } = useAsyncData(
    () => api.getAdminNotificationTemplates(),
    [],
    [],
  )
  const { data: payments = [], loading: paymentsLoading, reload: reloadPayments } = useAsyncData(() => api.getAdminPayments(), [], [])
  const { data: users = [], loading: usersLoading, reload: reloadUsers } = useAsyncData(() => api.getAdminUsers(), [], [])
  const { data: systemSettings = [], loading: settingsLoading, reload: reloadSettings } = useAsyncData(() => api.getSystemSettings(), [], [])
  const { data: deleteGuard = null, loading: deleteGuardLoading, reload: reloadDeleteGuard } = useAsyncData(() => api.getDeleteGuardConfig(), [], null)
  const { data: auditLogs = [], loading: auditLoading, reload: reloadAudit } = useAsyncData(() => api.getAuditLogs(auditFilters), [auditFilters], [])

  const selectedService = services.find((item) => String(item.id) === String(selectedServiceId)) || null
  const selectedDocument = documents.find((item) => String(item.id) === String(selectedDocumentId)) || null
  const selectedAssignment = assignments.find((item) => String(item.id) === String(selectedAssignmentId)) || null
  const selectedProvider = providers.find((item) => String(item.id) === String(selectedProviderId)) || null
  const selectedTemplate = notificationTemplates.find((item) => String(item.id || item.template_id) === String(selectedTemplateId)) || null
  const selectedPayment = payments.find((item) => String(item.id) === String(selectedPaymentId)) || null
  const selectedUser = users.find((item) => String(item.id) === String(selectedUserId)) || null
  const selectedSetting = systemSettings.find((item) => String(item.id || item.setting_id) === String(selectedSettingId)) || null

  const busy =
    categoriesLoading ||
    servicesLoading ||
    documentsLoading ||
    assignmentsLoading ||
    providersLoading ||
    workflowLoading ||
    templatesLoading ||
    paymentsLoading ||
    usersLoading ||
    settingsLoading ||
    deleteGuardLoading ||
    auditLoading

  useEffect(() => {
    setServiceForm(      selectedService
        ? {
            category_id: selectedService.category?.id || '',
            name_ar: selectedService.name_ar || '',
            name_en: selectedService.name_en || '',
            short_description_ar: selectedService.short_description_ar || '',
            short_description_en: selectedService.short_description_en || '',
            description_ar: selectedService.description_ar || '',
            description_en: selectedService.description_en || '',
            base_price: selectedService.base_price ?? '0.00',
            government_fee: selectedService.government_fee ?? '0.00',
            service_fee: selectedService.service_fee ?? '0.00',
            estimated_duration: selectedService.estimated_duration ?? 1,
            estimated_duration_unit: selectedService.estimated_duration_unit || 'days',
            price_type: selectedService.price_type || 'fixed',
            provider_required: Boolean(selectedService.provider_required),
            requires_manual_review: Boolean(selectedService.requires_manual_review),
            requires_appointment: Boolean(selectedService.requires_appointment),
            is_online: Boolean(selectedService.is_online),
            is_featured: Boolean(selectedService.is_featured),
            is_active: Boolean(selectedService.is_active),
            display_order: selectedService.display_order ?? 0,
          }
        : DEFAULT_SERVICE_FORM,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceId, services])

  useEffect(() => {
    setDocumentForm(      selectedDocument
        ? {
            service_id: selectedDocument.service_id || '',
            name_ar: selectedDocument.name_ar || '',
            name_en: selectedDocument.name_en || '',
            is_required: Boolean(selectedDocument.is_required),
            allowed_extensions: selectedDocument.allowed_extensions || ['.pdf'],
            max_file_size: selectedDocument.max_file_size || 10485760,
            requires_verification: Boolean(selectedDocument.requires_verification),
            client_can_replace_file: Boolean(selectedDocument.client_can_replace_file),
            provider_can_view_file: Boolean(selectedDocument.provider_can_view_file),
            display_order: selectedDocument.display_order ?? 0,
            is_active: Boolean(selectedDocument.is_active),
          }
        : DEFAULT_DOCUMENT_FORM,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentId, documents])

  useEffect(() => {
    setAssignmentForm(      selectedAssignment
        ? {
            service_id: selectedAssignment.service_id || '',
            provider_id: selectedAssignment.provider_id || '',
            is_active: Boolean(selectedAssignment.is_active),
          }
        : DEFAULT_ASSIGNMENT_FORM,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, assignments])

  useEffect(() => {
    setProviderActionForm(      selectedProvider
        ? {
            decision: selectedProvider.is_approved ? 'reject' : 'approve',
            approval_reason: '',
            is_active: Boolean(selectedProvider.account_active),
            activation_reason: '',
          }
        : DEFAULT_PROVIDER_ACTION,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderId, providers])

  useEffect(() => {
    setTemplateForm(      selectedTemplate
        ? {
            key: selectedTemplate.key || '',
            channel: selectedTemplate.channel || 'system',
            title_ar: selectedTemplate.title_ar || '',
            title_en: selectedTemplate.title_en || '',
            message_ar: selectedTemplate.message_ar || '',
            message_en: selectedTemplate.message_en || '',
            is_active: Boolean(selectedTemplate.is_active),
          }
        : DEFAULT_TEMPLATE_FORM,
    )
    setTemplatePreview(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, notificationTemplates])

  useEffect(() => {
    setPaymentForm(      selectedPayment
        ? {
            status: selectedPayment.status || 'pending',
            reference_number: selectedPayment.reference_number || '',
            notes: selectedPayment.notes || '',
            failure_reason: selectedPayment.failure_reason || '',
          }
        : DEFAULT_PAYMENT_FORM,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPaymentId, payments])

  useEffect(() => {
    setUserForm(      selectedUser
        ? {
            full_name: selectedUser.full_name || '',
            email: selectedUser.email || '',
            phone: selectedUser.phone || '',
            password: '',
            role: selectedUser.role || 'customer',
            national_id: selectedUser.national_id || '',
            is_active: Boolean(selectedUser.is_active),
            is_verified: Boolean(selectedUser.is_verified),
          }
        : DEFAULT_USER_FORM,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, users])

  useEffect(() => {
    setSettingForm(      selectedSetting
        ? {
            key: selectedSetting.key,
            description: selectedSetting.description || '',
            values: (selectedSetting.fields || []).reduce((accumulator, field) => {
              accumulator[field.key] = field.value || ''
              return accumulator
            }, {}),
          }
        : { key: SYSTEM_SETTING_KEYS[0], description: '', values: {} },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSettingId, systemSettings])

  function setSectionFeedback(section, type, text) {
    setFeedback((current) => ({ ...current, [section]: { type, text } }))
  }

  function openServiceEditor(id = null) {
    setSelectedServiceId(id)
    if (!id) setServiceForm(DEFAULT_SERVICE_FORM)
    setActiveEditor('service')
  }

  function closeServiceEditor() {
    setActiveEditor((current) => (current === 'service' ? null : current))
    setSelectedServiceId(null)
    setServiceForm(DEFAULT_SERVICE_FORM)
  }

  function openDocumentEditor(id = null) {
    setSelectedDocumentId(id)
    if (!id) setDocumentForm(DEFAULT_DOCUMENT_FORM)
    setActiveEditor('document')
  }

  function closeDocumentEditor() {
    setActiveEditor((current) => (current === 'document' ? null : current))
    setSelectedDocumentId(null)
    setDocumentForm(DEFAULT_DOCUMENT_FORM)
  }

  function openAssignmentEditor(id = null) {
    setSelectedAssignmentId(id)
    if (!id) setAssignmentForm(DEFAULT_ASSIGNMENT_FORM)
    setActiveEditor('assignment')
  }

  function closeAssignmentEditor() {
    setActiveEditor((current) => (current === 'assignment' ? null : current))
    setSelectedAssignmentId(null)
    setAssignmentForm(DEFAULT_ASSIGNMENT_FORM)
  }

  function openProviderEditor(id) {
    setSelectedProviderId(id)
    setActiveEditor('provider')
  }

  function closeProviderEditor() {
    setActiveEditor((current) => (current === 'provider' ? null : current))
    setSelectedProviderId(null)
    setProviderActionForm(DEFAULT_PROVIDER_ACTION)
  }

  function openTemplateEditor(id = null) {
    setSelectedTemplateId(id)
    if (!id) {
      setTemplateForm(DEFAULT_TEMPLATE_FORM)
      setTemplatePreview(null)
    }
    setActiveEditor('template')
  }

  function closeTemplateEditor() {
    setActiveEditor((current) => (current === 'template' ? null : current))
    setSelectedTemplateId(null)
    setTemplateForm(DEFAULT_TEMPLATE_FORM)
    setTemplatePreview(null)
  }

  function openPaymentEditor(id) {
    setSelectedPaymentId(id)
    setActiveEditor('payment')
  }

  function closePaymentEditor() {
    setActiveEditor((current) => (current === 'payment' ? null : current))
    setSelectedPaymentId(null)
    setPaymentForm(DEFAULT_PAYMENT_FORM)
  }

  function openUserEditor(id = null) {
    setSelectedUserId(id)
    if (!id) setUserForm(DEFAULT_USER_FORM)
    setActiveEditor('user')
  }

  function closeUserEditor() {
    setActiveEditor((current) => (current === 'user' ? null : current))
    setSelectedUserId(null)
    setUserForm(DEFAULT_USER_FORM)
  }

  function openSettingEditor(id = null) {
    setSelectedSettingId(id)
    if (!id) setSettingForm({ key: SYSTEM_SETTING_KEYS[0], description: '', values: {} })
    setActiveEditor('setting')
  }

  function closeSettingEditor() {
    setActiveEditor((current) => (current === 'setting' ? null : current))
    setSelectedSettingId(null)
    setSettingForm({ key: SYSTEM_SETTING_KEYS[0], description: '', values: {} })
  }

  function openConfirm(title, description, onConfirm) {
    setConfirmState({ open: true, title, description, onConfirm })
  }

  async function handleServiceSave() {
    try {
      const payload = {
        ...serviceForm,
        category_id: Number(serviceForm.category_id),
        estimated_duration: Number(serviceForm.estimated_duration || 1),
        display_order: Number(serviceForm.display_order || 0),
      }
      if (selectedService) {
        await api.updateAdminService(selectedService.id, payload)
      } else {
        await api.createAdminService(payload)
      }
      reloadServices()
      closeServiceEditor()
      setSectionFeedback('services', 'success', tx('تم حفظ قواعد الخدمة.', 'Service rules saved.'))
    } catch (error) {
      setSectionFeedback('services', 'error', getDisplayError(error))
    }
  }

  async function handleDocumentSave() {
    try {
      const payload = {
        ...documentForm,
        service_id: Number(documentForm.service_id),
        document_type: buildDocumentType(selectedDocument?.document_type, documentForm),
        display_order: Number(documentForm.display_order || 0),
        max_file_size: Number(documentForm.max_file_size || 0),
      }
      if (selectedDocument) {
        await api.updateAdminServiceDocument(selectedDocument.id, payload)
      } else {
        await api.createAdminServiceDocument(payload)
      }
      reloadDocuments()
      closeDocumentEditor()
      setSectionFeedback('documents', 'success', tx('تم حفظ قاعدة المستند.', 'Document rule saved.'))
    } catch (error) {
      setSectionFeedback('documents', 'error', getDisplayError(error))
    }
  }

  async function handleAssignmentSave() {
    try {
      const payload = {
        service_id: Number(assignmentForm.service_id),
        provider_id: Number(assignmentForm.provider_id),
        is_active: assignmentForm.is_active,
      }
      if (selectedAssignment) {
        await api.updateAdminServiceAssignment(selectedAssignment.id, payload)
      } else {
        await api.createAdminServiceAssignment(payload)
      }
      reloadAssignments()
      closeAssignmentEditor()
      setSectionFeedback('assignments', 'success', tx('تم حفظ قاعدة المزود.', 'Provider rule saved.'))
    } catch (error) {
      setSectionFeedback('assignments', 'error', getDisplayError(error))
    }
  }

  async function handleProviderApproval() {
    if (!selectedProvider) return
    try {
      await api.updateProviderApproval(selectedProvider.id, {
        decision: providerActionForm.decision,
        reason: providerActionForm.approval_reason,
      })
      reloadProviders()
      setSectionFeedback('providers', 'success', tx('تم حفظ قرار اعتماد المزود.', 'Provider approval decision saved.'))
    } catch (error) {
      setSectionFeedback('providers', 'error', getDisplayError(error))
    }
  }

  async function handleProviderActivation() {
    if (!selectedProvider) return
    try {
      await api.updateProviderActivation(selectedProvider.id, {
        is_active: providerActionForm.is_active,
        reason: providerActionForm.activation_reason,
      })
      reloadProviders()
      setSectionFeedback('providers', 'success', tx('تم تحديث تفعيل المزود.', 'Provider activation updated.'))
    } catch (error) {
      setSectionFeedback('providers', 'error', getDisplayError(error))
    }
  }

  async function handleTemplatePreview() {
    try {
      const preview = await api.previewNotificationTemplate(templateForm)
      setTemplatePreview(preview)
      setSectionFeedback('notifications', 'success', tx('تم تحديث المعاينة.', 'Preview updated.'))
    } catch (error) {
      setSectionFeedback('notifications', 'error', getDisplayError(error))
    }
  }

  async function handleTemplateSave() {
    try {
      if (selectedTemplate) {
        await api.updateAdminNotificationTemplate(selectedTemplate.id || selectedTemplate.template_id, templateForm)
      } else {
        await api.createAdminNotificationTemplate(templateForm)
      }
      reloadTemplates()
      closeTemplateEditor()
      setSectionFeedback('notifications', 'success', tx('تم حفظ قالب الإشعار.', 'Notification template saved.'))
    } catch (error) {
      setSectionFeedback('notifications', 'error', getDisplayError(error))
    }
  }

  async function handlePaymentSave() {
    if (!selectedPayment) return
    try {
      await api.updateAdminPaymentStatus(selectedPayment.id, paymentForm)
      reloadPayments()
      closePaymentEditor()
      setSectionFeedback('payments', 'success', tx('تم تحديث حالة الدفع بأمان.', 'Payment status updated safely.'))
    } catch (error) {
      setSectionFeedback('payments', 'error', getDisplayError(error))
    }
  }

  async function handleUserSave() {
    try {
      const payload = { ...userForm }
      if (!payload.password) delete payload.password
      if (selectedUser) {
        await api.updateAdminUser(selectedUser.id, payload)
      } else {
        await api.createAdminUser(payload)
      }
      reloadUsers()
      closeUserEditor()
      setSectionFeedback('users', 'success', tx('تم حفظ المستخدم.', 'User saved.'))
    } catch (error) {
      setSectionFeedback('users', 'error', getDisplayError(error))
    }
  }

  async function handleSettingSave() {
    try {
      const payload = {
        key: settingForm.key,
        description: settingForm.description,
        ...settingForm.values,
      }
      if (selectedSetting) {
        await api.updateSystemSetting(selectedSetting.id || selectedSetting.setting_id, payload)
      } else {
        await api.createSystemSetting(payload)
      }
      reloadSettings()
      closeSettingEditor()
      setSectionFeedback('settings', 'success', tx('تم حفظ إعداد النظام.', 'System setting saved.'))
    } catch (error) {
      setSectionFeedback('settings', 'error', getDisplayError(error))
    }
  }

  async function handleDeleteGuardSave() {
    try {
      await api.updateDeleteGuardConfig(deleteGuardForm)
      reloadDeleteGuard()
      setDeleteGuardForm(DEFAULT_DELETE_GUARD_FORM)
      setSectionFeedback('settings', 'success', tx('تم حفظ كلمة مرور الحذف.', 'Delete password saved.'))
    } catch (error) {
      setSectionFeedback('settings', 'error', getDisplayError(error))
    }
  }

  if (busy) return <LoadingSpinner />

  const serviceColumns = [
    { key: 'name', label: tx('الخدمة', 'Service'), render: (row) => getLocalizedName(row) },
    { key: 'category_name', label: tx('التصنيف', 'Category') },
    { key: 'base_price', label: tx('السعر الأساسي', 'Base price') },
    { key: 'duration_display', label: tx('المدة التقديرية', 'Estimated duration') },
    { key: 'provider_required', label: tx('يتطلب مزوداً', 'Provider required'), render: (row) => (row.provider_required ? tx('نعم', 'Yes') : tx('لا', 'No')) },
    { key: 'requires_manual_review', label: tx('مراجعة الموظف', 'Employee review'), render: (row) => (row.requires_manual_review ? tx('مطلوبة', 'Required') : tx('غير مطلوبة', 'Not required')) },
    { key: 'is_active', label: tx('الحالة', 'Status'), render: (row) => (row.is_active ? tx('نشط', 'Active') : tx('غير نشط', 'Inactive')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openServiceEditor(row.id)} type="button">
            {tx('تعديل', 'Edit')}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm(tx('تعطيل الخدمة', 'Disable service'), tx('يتم تعطيل الخدمات المستخدمة فقط ولا تُحذف من السجل أبداً.', 'Used services are only disabled, never removed from history.'), async () => {
                await api.deleteAdminService(row.id)
                reloadServices()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            {tx('تعطيل', 'Disable')}
          </button>
        </div>
      ),
    },
  ]

  const documentColumns = [
    { key: 'service_name', label: tx('الخدمة', 'Service') },
    { key: 'name', label: tx('اسم المستند', 'Document name'), render: (row) => getLocalizedName(row) },
    { key: 'is_required', label: tx('المتطلب', 'Requirement'), render: (row) => (row.is_required ? tx('مطلوب', 'Required') : tx('اختياري', 'Optional')) },
    { key: 'allowed_extensions', label: tx('أنواع الملفات', 'File types'), render: (row) => (row.allowed_extensions || []).join(', ') || tx('غير محدد', 'Not set') },
    { key: 'max_file_size', label: tx('الحد الأقصى للحجم', 'Max size'), render: (row) => toMb(row.max_file_size) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openDocumentEditor(row.id)} type="button">
            {tx('تعديل', 'Edit')}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm(tx('تعطيل قاعدة المستند', 'Disable document rule'), tx('تحتفظ الطلبات بملفاتها المرفوعة، ويتم فقط تعطيل المتطلب المستقبلي.', 'Orders keep their uploaded files. Only the future requirement is disabled.'), async () => {
                await api.deleteAdminServiceDocument(row.id)
                reloadDocuments()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            {tx('تعطيل', 'Disable')}
          </button>
        </div>
      ),
    },
  ]

  const assignmentColumns = [
    { key: 'service_name', label: tx('الخدمة', 'Service') },
    { key: 'provider_name', label: tx('مزود الخدمة', 'Provider') },
    { key: 'provider_city', label: tx('المدينة', 'City') },
    { key: 'provider_is_approved', label: tx('معتمد', 'Approved'), render: (row) => (row.provider_is_approved ? tx('نعم', 'Yes') : tx('لا', 'No')) },
    { key: 'is_active', label: tx('الحالة', 'Status'), render: (row) => (row.is_active ? tx('نشط', 'Active') : tx('غير نشط', 'Inactive')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openAssignmentEditor(row.id)} type="button">
            {tx('تعديل', 'Edit')}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm(tx('تعطيل قاعدة الإسناد', 'Disable assignment rule'), tx('يحتفظ هذا بسجل التدقيق ويوقف المطابقة المستقبلية فقط.', 'This keeps audit history and only stops future matching.'), async () => {
                await api.deleteAdminServiceAssignment(row.id)
                reloadAssignments()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            {tx('تعطيل', 'Disable')}
          </button>
        </div>
      ),
    },
  ]

  const providerColumns = [
    { key: 'full_name', label: tx('مزود الخدمة', 'Provider') },
    { key: 'provider_type', label: tx('القدرة', 'Capability') },
    { key: 'capability_summary', label: tx('الخدمات', 'Services') },
    { key: 'approval_status_label', label: tx('الاعتماد', 'Approval') },
    { key: 'account_active', label: tx('الحساب', 'Account'), render: (row) => (row.account_active ? tx('نشط', 'Active') : tx('غير نشط', 'Inactive')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openProviderEditor(row.id)} type="button">
          {tx('إدارة', 'Manage')}
        </button>
      ),
    },
  ]

  const workflowColumns = [
    { key: 'summary', label: tx('القاعدة', 'Rule') },
    { key: 'allowed_role_labels', label: tx('من يمكنه التنفيذ', 'Who can do it'), render: (row) => row.allowed_role_labels.join(', ') },
    { key: 'reason_required', label: tx('يتطلب سبباً', 'Reason required'), render: (row) => (row.reason_required ? tx('نعم', 'Yes') : tx('لا', 'No')) },
    { key: 'notification_trigger', label: tx('يرسل إشعاراً', 'Sends notification'), render: (row) => (row.notification_trigger ? tx('نعم', 'Yes') : tx('لا', 'No')) },
    { key: 'change_request_supported', label: tx('تعديل مباشر', 'Direct edit'), render: () => tx('غير مسموح', 'Not allowed') },
  ]

  const templateColumns = [
    { key: 'key', label: tx('مفتاح القالب', 'Template key') },
    { key: 'channel', label: tx('القناة', 'Channel'), render: (row) => channelLabels[row.channel] || row.channel },
    { key: 'title_ar', label: tx('العنوان العربي', 'Arabic title') },
    { key: 'is_active', label: tx('الحالة', 'Status'), render: (row) => (row.is_active ? tx('نشط', 'Active') : tx('غير نشط', 'Inactive')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openTemplateEditor(row.id || row.template_id)} type="button">
            {tx('تعديل', 'Edit')}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm(tx('تعطيل القالب', 'Disable template'), tx('يحتفظ هذا بالقالب لأغراض التدقيق ويوقف استخدامه.', 'This keeps the template for audit but stops using it.'), async () => {
                await api.deleteAdminNotificationTemplate(row.id || row.template_id)
                reloadTemplates()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            {tx('تعطيل', 'Disable')}
          </button>
        </div>
      ),
    },
  ]

  const paymentColumns = [
    { key: 'payment_number', label: tx('رقم الدفعة', 'Payment number') },
    { key: 'order_number', label: tx('الطلب', 'Order') },
    { key: 'customer_name', label: tx('العميل', 'Customer') },
    { key: 'status_label', label: tx('الحالة', 'Status') },
    { key: 'amount', label: tx('المبلغ', 'Amount') },
    { key: 'reference_number', label: tx('المرجع', 'Reference') },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openPaymentEditor(row.id)} type="button">
          {tx('تحديث', 'Update')}
        </button>
      ),
    },
  ]

  const userColumns = [
    { key: 'full_name', label: tx('المستخدم', 'User') },
    { key: 'email', label: tx('البريد الإلكتروني', 'Email') },
    { key: 'role', label: tx('الدور', 'Role'), render: (row) => roleLabels[row.role] || row.role },
    { key: 'is_active', label: tx('الحالة', 'Status'), render: (row) => (row.is_active ? tx('نشط', 'Active') : tx('غير نشط', 'Inactive')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openUserEditor(row.id)} type="button">
            {tx('تعديل', 'Edit')}
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm(tx('إلغاء تفعيل المستخدم', 'Deactivate user'), tx('يحتفظ هذا بالحساب لأغراض التدقيق ويمنع الوصول مستقبلاً.', 'This keeps the account for audit and blocks future access.'), async () => {
                await api.deleteAdminUser(row.id)
                reloadUsers()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            {tx('إلغاء التفعيل', 'Deactivate')}
          </button>
        </div>
      ),
    },
  ]

  const auditColumns = [
    { key: 'user_name', label: tx('المستخدم', 'User') },
    { key: 'module', label: tx('الوحدة', 'Module') },
    { key: 'action', label: tx('الإجراء', 'Action') },
    { key: 'status', label: tx('النتيجة', 'Result') },
    { key: 'message', label: tx('الرسالة', 'Message') },
    { key: 'created_at', label: tx('التاريخ', 'Date'), render: (row) => formatDateTime(row.created_at, locale, tx('غير متوفر', 'Not available')) },
  ]

  const settingColumns = [
    { key: 'label', label: tx('الإعداد', 'Setting') },
    { key: 'warning', label: tx('تنبيه', 'Warning'), render: (row) => row.warning || tx('لا يوجد تنبيه', 'No warning') },
    { key: 'updated_at', label: tx('آخر تحديث', 'Last update'), render: (row) => formatDateTime(row.updated_at, locale, tx('غير متوفر', 'Not available')) },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openSettingEditor(row.id || row.setting_id)} type="button">
          {tx('تعديل', 'Edit')}
        </button>
      ),
    },
  ]

  const settingDefinition = SETTING_DEFINITIONS[settingForm.key] || {
    label: settingForm.key,
    help_text: tx('اختر إعداداً آمناً واملأ الحقول المسموح بها فقط.', 'Choose a safe setting and fill in the allowed fields only.'),
    warning: '',
    fields: [],
  }

  const currentSettingDefinition = {
    key: settingForm.key,
    label: localizeSettingValue(settingDefinition.label),
    help_text: localizeSettingValue(settingDefinition.help_text),
    warning: localizeSettingValue(settingDefinition.warning),
    fields: (settingDefinition.fields || []).map((field) => ({
      ...field,
      label: localizeSettingValue(field.label),
      help_text: localizeSettingValue(field.help_text),
    })),
  }

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tx(
          'إدارة آمنة لقواعد العمل للمشرفين غير التقنيين. تبقى جميع التغييرات داخل إجراءات مدققة وصلاحيات إدارية مقيدة.',
          'Safe business-rule management for non-technical admins. All changes stay inside audited workflows and restricted admin actions.',
        )}
        eyebrow={tx('قواعد الإدارة', 'Admin Rules')}
        icon={FileStack}
        title={tx('إدارة القواعد', 'Rule Management')}
      />

      <div className="flex flex-wrap gap-3">
        {SERVICE_TABS.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tabLabels[tab.id]} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {activeTab === 'services' ? (
        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EmptyHelp
              title={tx('إدارة الخدمات', 'Service management')}
              text={tx(
                'أدر فقط تفاصيل الخدمات الظاهرة للأعمال. تبقى المعرفات الداخلية مخفية ويتم تعطيل الخدمات المستخدمة بدلاً من حذفها.',
                'Manage only business-facing service details. Internal identifiers stay hidden and used services are disabled instead of deleted.',
              )}
            />
            <button className="btn-primary" onClick={() => openServiceEditor()} type="button">
              {tx('خدمة جديدة', 'New service')}
            </button>
          </div>
          <div className="mb-6 rounded-3xl border border-border bg-slate-50/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-ink">{tx('حماية الحذف', 'Delete protection')}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {tx(
                    'لا يمكن حذف أو تعطيل أي سجل من واجهات الإدارة إلا بحساب المشرف الأعلى وكلمة المرور الإضافية هذه.',
                    'No admin delete or deactivate action can run without the super admin account and this extra password.',
                  )}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {deleteGuard?.is_configured
                    ? tx('كلمة المرور مفعلة.', 'Delete password is configured.')
                    : tx('لم يتم ضبط كلمة مرور الحذف بعد.', 'Delete password is not configured yet.')}
                </p>
              </div>
              <div className="text-xs text-slate-500">
                {tx('آخر تحديث', 'Last update')}: {formatDateTime(deleteGuard?.updated_at, locale, tx('غير متوفر', 'Not available'))}
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={tx('كلمة مرور الحذف', 'Delete password')} help={tx('استخدم كلمة قوية لا يعرفها إلا المشرف الأعلى.', 'Use a strong password known only to the super admin.')}>
                <input
                  className="field"
                  type="password"
                  value={deleteGuardForm.delete_password}
                  onChange={(event) => setDeleteGuardForm({ ...deleteGuardForm, delete_password: event.target.value })}
                />
              </Field>
              <Field label={tx('تأكيد كلمة المرور', 'Confirm password')} help={tx('يجب أن تتطابق القيمتان قبل الحفظ.', 'Both values must match before saving.')}>
                <input
                  className="field"
                  type="password"
                  value={deleteGuardForm.confirm_delete_password}
                  onChange={(event) => setDeleteGuardForm({ ...deleteGuardForm, confirm_delete_password: event.target.value })}
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={handleDeleteGuardSave} type="button">
                {tx('حفظ كلمة المرور', 'Save delete password')}
              </button>
              <button className="btn-secondary" onClick={() => setDeleteGuardForm(DEFAULT_DELETE_GUARD_FORM)} type="button">
                {tx('مسح الحقول', 'Clear')}
              </button>
            </div>
          </div>
          <DataTable
            columns={serviceColumns}
            emptyDescription={tx('أنشئ أول خدمة لبدء استقبال الطلبات.', 'Create the first service to start taking orders.')}
            emptyTitle={tx('لا توجد خدمات', 'No services found')}
            rows={services}
          />
          <SectionMessage message={feedback.services} />
        </section>
      ) : null}

      {activeTab === 'documents' ? (
        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EmptyHelp
              title={tx('المستندات المطلوبة', 'Required documents')}
              text={tx(
                'حدّد الملفات المطلوبة لكل خدمة باستخدام أسماء واضحة وأنواع ملفات آمنة وقواعد استبدال مناسبة.',
                'Define which files are required for each service using clear names, safe file types, and replacement rules.',
              )}
              warning={tx('لا يمكن للمشرفين تعديل الملفات المرفوعة الفعلية من هذه الشاشة.', 'Admins cannot edit the actual uploaded files from this screen.')}
            />
            <button className="btn-primary" onClick={() => openDocumentEditor()} type="button">
              {tx('قاعدة مستند جديدة', 'New document rule')}
            </button>
          </div>
          <DataTable
            columns={documentColumns}
            emptyDescription={tx('أضف أول قاعدة مستند لخدمة ما.', 'Add the first document rule for a service.')}
            emptyTitle={tx('لا توجد قواعد مستندات', 'No document rules found')}
            rows={documents}
          />
          <SectionMessage message={feedback.documents} />
        </section>
      ) : null}

      {activeTab === 'providers' ? (
        <section className="space-y-6">
          <div className="glass-panel p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <EmptyHelp
                title={tx('قواعد إسناد المزودين', 'Provider assignment rules')}
                text={tx(
                  'اربط المزودين المعتمدين بالخدمات. يبقى إعادة إسناد الطلبات الفعلية ضمن شاشة الطلب ويتطلب سبباً.',
                  'Link approved providers to services. Actual order reassignment stays on the order screen and requires a reason.',
                )}
              />
              <button className="btn-primary" onClick={() => openAssignmentEditor()} type="button">
                {tx('قاعدة إسناد جديدة', 'New assignment rule')}
              </button>
            </div>
            <DataTable
              columns={assignmentColumns}
              emptyDescription={tx('اربط المزودين بالخدمات قبل إسناد الطلبات الفعلية.', 'Link providers to services before assigning live orders.')}
              emptyTitle={tx('لا توجد قواعد إسناد للمزودين', 'No provider assignment rules found')}
              rows={assignments}
            />
            <SectionMessage message={feedback.assignments} />
          </div>

          <div className="glass-panel p-6">
              <EmptyHelp
                title={tx('اعتماد المزودين', 'Provider approval')}
                text={tx(
                  'راجع قدرات المزودين واعتمدهم أو ارفضهم، وفعّل أو عطّل وصولهم للأعمال دون تعديل الجوانب الأمنية الداخلية.',
                  'Review provider capabilities, approve or reject them, and activate or deactivate business access without editing security internals.',
                )}
              />
              <DataTable
                columns={providerColumns}
                emptyDescription={tx('تظهر حسابات المزودين هنا بعد إنشائها.', 'Provider accounts appear here once created.')}
                emptyTitle={tx('لا يوجد مزودون', 'No providers found')}
                rows={providers}
              />
              <SectionMessage message={feedback.providers} />
          </div>
        </section>
      ) : null}

      {activeTab === 'workflow' ? (
        <section className="glass-panel p-6">
          <EmptyHelp
            title={tx('مراجعة قواعد سير العمل', 'Workflow rules review')}
            text={tx(
              'تشرح هذه الشاشة سير العمل النشط بلغة بسيطة. لا يمكن تعديل الانتقالات الخطرة مباشرة من واجهة الإدارة.',
              'This screen explains the active workflow in simple language. Dangerous transitions cannot be edited directly from the admin UI.',
            )}
            warning={tx(
              'إذا تمت إضافة اعتماد لتغيير سير العمل لاحقاً، فيجب أن تتجه طلبات التغيير إليه بدلاً من التعديل المباشر.',
              'If workflow change approval is introduced later, change requests should point there instead of direct editing.',
            )}
          />
          <DataTable
            columns={workflowColumns}
            emptyDescription={tx('ستظهر قواعد سير العمل هنا بعد تحميلها.', 'Workflow rules will appear here once loaded.')}
            emptyTitle={tx('لا توجد قواعد سير عمل', 'No workflow rules found')}
            rows={workflowRules.map((rule, index) => ({ id: index + 1, ...rule }))}
          />
        </section>
      ) : null}

      {activeTab === 'notifications' ? (
        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EmptyHelp
              title={tx('قوالب الإشعارات', 'Notification templates')}
              text={tx(
                'لا يمكن تعديل سوى القوالب النصية الآمنة هنا. يتم حظر HTML والعناصر النائبة غير الآمنة.',
                'Only safe text templates can be edited here. HTML and unsafe placeholders are blocked.',
              )}
              warning={tx('عاين الرسالة قبل حفظ أي تغيير.', 'Preview the message before saving any change.')}
            />
            <button className="btn-primary" onClick={() => openTemplateEditor()} type="button">
              {tx('قالب جديد', 'New template')}
            </button>
          </div>
          <DataTable
            columns={templateColumns}
            emptyDescription={tx('أنشئ أول قالب إشعار للرسائل المعتمدة من الموظفين.', 'Create the first notification template for staff-approved messages.')}
            emptyTitle={tx('لا توجد قوالب إشعارات', 'No notification templates found')}
            rows={notificationTemplates}
          />
          <SectionMessage message={feedback.notifications} />
        </section>
      ) : null}

      {activeTab === 'payments' ? (
        <section className="glass-panel p-6">
            <EmptyHelp
              title={tx('إدارة حالات الدفع', 'Payment status management')}
              text={tx(
                'اعرض حالة الدفع وحدّثها فقط من خلال إجراء الحالة الآمن. لا يمكن تعديل سجلات العمليات الخام هنا.',
                'View payment status and update it only through the safe status action. Raw transaction records are not editable here.',
              )}
            />
            <DataTable
              columns={paymentColumns}
              emptyDescription={tx('ستظهر المدفوعات المرتبطة بالطلبات هنا.', 'Payments linked to orders will appear here.')}
              emptyTitle={tx('لا توجد مدفوعات', 'No payments found')}
              rows={payments}
            />
          <SectionMessage message={feedback.payments} />
        </section>
      ) : null}

      {activeTab === 'users' ? (
        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EmptyHelp
              title={tx('إدارة المستخدمين والأدوار', 'User and role management')}
              text={tx(
                'أدر مستخدمي الأعمال العاديين وأدوارهم فقط. تبقى حسابات المشرف الأعلى وتفاصيل الصلاحيات الداخلية محمية.',
                'Manage normal business users and roles only. Super admin accounts and permission internals stay protected.',
              )}
              warning={tx('لا يمكن للمشرفين العاديين إنشاء أو تعديل مستخدمين بمستوى إداري.', 'Normal admins cannot create or modify admin-level users.')}
            />
            <button className="btn-primary" onClick={() => openUserEditor()} type="button">
              {tx('مستخدم جديد', 'New user')}
            </button>
          </div>
          <DataTable
            columns={userColumns}
            emptyDescription={tx('سيظهر مستخدمو الأعمال هنا بعد إنشائهم.', 'Business users will appear here once created.')}
            emptyTitle={tx('لا يوجد مستخدمون', 'No users found')}
            rows={users}
          />
          <SectionMessage message={feedback.users} />
        </section>
      ) : null}

      {activeTab === 'audit' ? (
        <section className="glass-panel space-y-6 p-6">
          <EmptyHelp
            title={tx('عارض سجل التدقيق', 'Audit log viewer')}
            text={tx(
              'قم بالتصفية حسب المستخدم أو الوحدة أو الإجراء أو النتيجة أو التاريخ. سجلات التدقيق للعرض فقط ولا يمكن تعديلها أو حذفها من هذه الشاشة.',
              'Filter by user, module, action, result, or date. Audit logs are view-only and cannot be edited or deleted from this screen.',
            )}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={tx('المستخدم', 'User')} help={tx('صفِّ حسب اسم المستخدم أو المعرف عند الحاجة.', 'Filter by user name or ID if needed.')}>
              <input className="field" value={auditFilters.user} onChange={(event) => setAuditFilters({ ...auditFilters, user: event.target.value })} />
            </Field>
            <Field label={tx('الوحدة', 'Module')} help={tx('أمثلة: خدمة، دفع، إشعار.', 'Examples: Service, Payment, Notification.')}>
              <input className="field" value={auditFilters.module} onChange={(event) => setAuditFilters({ ...auditFilters, module: event.target.value })} />
            </Field>
            <Field label={tx('الإجراء', 'Action')} help={tx('أمثلة: update_service، payment_status_update.', 'Examples: update_service, payment_status_update.')}>
              <input className="field" value={auditFilters.action} onChange={(event) => setAuditFilters({ ...auditFilters, action: event.target.value })} />
            </Field>
            <Field label={tx('من تاريخ', 'From date')} help={tx('اعرض الأحداث في هذا التاريخ أو بعده.', 'Show events on or after this date.')}>
              <input className="field" type="date" value={auditFilters.date_from} onChange={(event) => setAuditFilters({ ...auditFilters, date_from: event.target.value })} />
            </Field>
            <Field label={tx('إلى تاريخ', 'To date')} help={tx('اعرض الأحداث في هذا التاريخ أو قبله.', 'Show events on or before this date.')}>
              <input className="field" type="date" value={auditFilters.date_to} onChange={(event) => setAuditFilters({ ...auditFilters, date_to: event.target.value })} />
            </Field>
            <Field label={tx('النتيجة', 'Result')} help={tx('صفِّ حسب الإجراءات الناجحة أو الفاشلة.', 'Filter by success or failed actions.')}>
              <select className="field" value={auditFilters.status} onChange={(event) => setAuditFilters({ ...auditFilters, status: event.target.value })}>
                <option value="">{tx('كل النتائج', 'All results')}</option>
                <option value="success">{tx('ناجح', 'Success')}</option>
                <option value="failed">{tx('فشل', 'Failed')}</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => reloadAudit()} type="button">
              {tx('تحديث السجلات', 'Refresh logs')}
            </button>
            <button className="btn-secondary" onClick={() => setAuditFilters(DEFAULT_AUDIT_FILTERS)} type="button">
              {tx('مسح الفلاتر', 'Clear filters')}
            </button>
          </div>
          <DataTable
            columns={auditColumns}
            emptyDescription={tx('ستظهر التغييرات الحساسة هنا عند حدوثها.', 'Sensitive changes will appear here once they occur.')}
            emptyTitle={tx('لا توجد سجلات تدقيق', 'No audit logs found')}
            rows={auditLogs}
          />
        </section>
      ) : null}

      {activeTab === 'settings' ? (
        <section className="glass-panel p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <EmptyHelp
              title={tx('إعدادات النظام', 'System settings')}
              text={tx(
                'تظهر هنا فقط الإعدادات التجارية الآمنة المسموح بها. يتم حظر JSON الخام وتفاصيل الأمان الداخلية.',
                'Only whitelisted business-safe settings appear here. Raw JSON and security internals are blocked.',
              )}
              warning={tx('يجب أن تبقى الإعدادات الحساسة تحت تحكم المشرف الأعلى أو الكود.', 'Sensitive settings should stay under super admin or code control.')}
            />
            <button className="btn-primary" onClick={() => openSettingEditor()} type="button">
              {tx('إعداد جديد', 'New setting')}
            </button>
          </div>
          <DataTable
            columns={settingColumns}
            emptyDescription={tx('أنشئ إعداداً آمناً عندما تحتاج الأعمال إلى خيار مضبوط.', 'Create a safe setting when the business needs a controlled option.')}
            emptyTitle={tx('لا توجد إعدادات آمنة', 'No safe settings found')}
            rows={systemSettings}
          />
          <SectionMessage message={feedback.settings} />
        </section>
      ) : null}

      <FormModal
        open={activeEditor === 'service'}
        onClose={closeServiceEditor}
        size="xl"
        title={selectedService ? tx('تعديل الخدمة', 'Edit service') : tx('خدمة جديدة', 'New service')}
        description={tx(
          'أدر تفاصيل الخدمة الظاهرة للأعمال داخل نافذة مركزة واحدة دون ضغط عرض الجدول.',
          'Manage business-facing service details in one focused popup without compressing the table view.',
        )}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeServiceEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleServiceSave} type="button">
              {tx('حفظ الخدمة', 'Save service')}
            </button>
          </div>
        }
      >
        <EmptyHelp
          title={tx('قواعد التسعير', 'Price rules')}
          text={tx(
            'يتم تدقيق السعر الأساسي والرسوم الإضافية ومتطلبات المراجعة ومتطلبات المزود. لا يسمح هذا النموذج بتجاوز سير العمل مباشرة.',
            'Base price, extra fees, review requirement, and provider requirement are audited. This form does not allow direct workflow bypass.',
          )}
          warning={tx('تظهر تغييرات الأسعار للموظفين فوراً ويتم تسجيلها في سجل التدقيق.', 'Price changes are visible to staff immediately and are recorded in the audit log.')}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={tx('التصنيف', 'Category')} help={tx('اختر التصنيف التجاري الظاهر للمشرفين والعملاء.', 'Choose the business category shown to admins and clients.')}>
            <select className="field" value={serviceForm.category_id} onChange={(event) => setServiceForm({ ...serviceForm, category_id: event.target.value })}>
              <option value="">{tx('اختر التصنيف', 'Choose category')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getLocalizedName(category)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx('الاسم العربي', 'Arabic name')} help={tx('اسم الخدمة الرئيسي الظاهر في الشاشات العربية.', 'Main service name visible in Arabic screens.')}>
            <input className="field" value={serviceForm.name_ar} onChange={(event) => setServiceForm({ ...serviceForm, name_ar: event.target.value })} />
          </Field>
          <Field label={tx('الاسم الإنجليزي', 'English name')} help={tx('يستخدم في الشاشات الثنائية اللغة والتقارير.', 'Used in bilingual screens and reports.')}>
            <input className="field" value={serviceForm.name_en} onChange={(event) => setServiceForm({ ...serviceForm, name_en: event.target.value })} />
          </Field>
          <Field label={tx('السعر الأساسي', 'Base price')} help={tx('المبلغ الرئيسي للخدمة قبل الرسوم الأخرى.', 'Main service amount before other fees.')}>
            <input className="field" type="number" value={serviceForm.base_price} onChange={(event) => setServiceForm({ ...serviceForm, base_price: event.target.value })} />
          </Field>
          <Field label={tx('الرسوم الحكومية', 'Government fee')} help={tx('مبلغ حكومي اختياري إذا كانت الخدمة تتطلبه.', 'Optional government amount if this service needs it.')}>
            <input className="field" type="number" value={serviceForm.government_fee} onChange={(event) => setServiceForm({ ...serviceForm, government_fee: event.target.value })} />
          </Field>
          <Field label={tx('رسوم خدمة إضافية', 'Extra service fee')} help={tx('أي رسوم داخلية إضافية يسمح بها نموذج العمل.', 'Any extra internal fee allowed by the business model.')}>
            <input className="field" type="number" value={serviceForm.service_fee} onChange={(event) => setServiceForm({ ...serviceForm, service_fee: event.target.value })} />
          </Field>
          <Field label={tx('المدة التقديرية', 'Estimated duration')} help={tx('استخدم رقماً بسيطاً للمشرفين غير التقنيين.', 'Use a simple number for non-technical admins.')}>
            <input className="field" type="number" value={serviceForm.estimated_duration} onChange={(event) => setServiceForm({ ...serviceForm, estimated_duration: event.target.value })} />
          </Field>
          <Field label={tx('وحدة المدة', 'Duration unit')} help={tx('اختر أوضح وحدة للعمليات.', 'Choose the clearest unit for operations.')}>
            <select className="field" value={serviceForm.estimated_duration_unit} onChange={(event) => setServiceForm({ ...serviceForm, estimated_duration_unit: event.target.value })}>
              <option value="hours">{durationUnitLabels.hours}</option>
              <option value="days">{durationUnitLabels.days}</option>
              <option value="weeks">{durationUnitLabels.weeks}</option>
            </select>
          </Field>
          <Field label={tx('الوصف العربي', 'Arabic description')} help={tx('اشرح الخدمة بلغة بسيطة.', 'Explain the service in simple language.')}>
            <textarea className="field min-h-28" value={serviceForm.description_ar} onChange={(event) => setServiceForm({ ...serviceForm, description_ar: event.target.value })} />
          </Field>
          <Field label={tx('الوصف الإنجليزي', 'English description')} help={tx('وصف ثنائي اللغة اختياري.', 'Optional bilingual description.')}>
            <textarea className="field min-h-28" value={serviceForm.description_en} onChange={(event) => setServiceForm({ ...serviceForm, description_en: event.target.value })} />
          </Field>
        </div>
        <div className="mt-4 grid gap-3">
          <ToggleField checked={serviceForm.provider_required} help={tx('أوقف هذا فقط للخدمات التي تُنجز بالكامل داخل المكتب.', 'Turn this off only for services completed fully inside the office.')} label={tx('المزود مطلوب', 'Provider is required')} onChange={(value) => setServiceForm({ ...serviceForm, provider_required: value })} />
          <ToggleField checked={serviceForm.requires_manual_review} help={tx('أبقِ هذا مفعلاً عندما يجب أن يراجع موظف كل طلب قبل التنفيذ.', 'Keep this on when an employee must review each order before execution.')} label={tx('مراجعة الموظف مطلوبة', 'Employee review is required')} onChange={(value) => setServiceForm({ ...serviceForm, requires_manual_review: value })} />
          <ToggleField checked={serviceForm.is_active} help={tx('تبقى الخدمات غير النشطة في السجل لكنها تتوقف عن استقبال طلبات جديدة.', 'Inactive services stay in history but stop accepting new orders.')} label={tx('الخدمة نشطة', 'Service is active')} onChange={(value) => setServiceForm({ ...serviceForm, is_active: value })} />
        </div>
        <div className="mt-4">
          <SectionMessage message={feedback.services} />
        </div>
      </FormModal>

      <FormModal
        open={activeEditor === 'document'}
        onClose={closeDocumentEditor}
        size="lg"
        title={selectedDocument ? tx('تعديل قاعدة المستند', 'Edit document rule') : tx('قاعدة مستند جديدة', 'New document rule')}
        description={tx('حدّد الملفات المطلوبة في نافذة مركزة حتى تبقى قائمة القواعد واضحة.', 'Define required files in a focused popup so the rules list stays readable.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeDocumentEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleDocumentSave} type="button">
              {tx('حفظ قاعدة المستند', 'Save document rule')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={tx('الخدمة', 'Service')} help={tx('اختر الخدمة التي تحتاج هذا المستند.', 'Choose which service needs this document.')}>
            <select className="field" value={documentForm.service_id} onChange={(event) => setDocumentForm({ ...documentForm, service_id: event.target.value })}>
              <option value="">{tx('اختر الخدمة', 'Choose service')}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {getLocalizedName(service)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx('اسم المستند بالعربية', 'Arabic document name')} help={tx('الاسم الظاهر للموظفين والعملاء.', 'Visible label shown to staff and clients.')}>
            <input className="field" value={documentForm.name_ar} onChange={(event) => setDocumentForm({ ...documentForm, name_ar: event.target.value })} />
          </Field>
          <Field label={tx('اسم المستند بالإنجليزية', 'English document name')} help={tx('اسم ثنائي اللغة اختياري.', 'Optional bilingual label.')}>
            <input className="field" value={documentForm.name_en} onChange={(event) => setDocumentForm({ ...documentForm, name_en: event.target.value })} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            {SAFE_FILE_TYPES.map((extension) => (
              <label key={extension} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input
                  checked={documentForm.allowed_extensions.includes(extension)}
                  onChange={(event) =>
                    setDocumentForm({
                      ...documentForm,
                      allowed_extensions: event.target.checked
                        ? [...documentForm.allowed_extensions, extension]
                        : documentForm.allowed_extensions.filter((item) => item !== extension),
                    })
                  }
                  type="checkbox"
                />
                <span>{extension}</span>
              </label>
            ))}
          </div>
          <Field label={tx('الحد الأقصى للحجم بالبايت', 'Maximum size in bytes')} help={tx('اجعلها بسيطة. يطبق النظام أيضاً حداً عاماً للسلامة.', 'Keep this simple. The system also applies a global safety limit.')}>
            <input className="field" type="number" value={documentForm.max_file_size} onChange={(event) => setDocumentForm({ ...documentForm, max_file_size: event.target.value })} />
          </Field>
          <div className="grid gap-3">
            <ToggleField checked={documentForm.is_required} help={tx('المستندات المطلوبة تمنع تقدم الطلب حتى يتم رفعها واعتمادها.', 'Required documents block order progress until uploaded and approved.')} label={tx('مستند مطلوب', 'Required document')} onChange={(value) => setDocumentForm({ ...documentForm, is_required: value })} />
            <ToggleField checked={documentForm.requires_verification} help={tx('استخدم هذا عندما يجب على الموظفين التحقق من الملف قبل متابعة الطلب.', 'Use this when staff must verify the file before the order can move forward.')} label={tx('يتطلب تحققاً', 'Requires verification')} onChange={(value) => setDocumentForm({ ...documentForm, requires_verification: value })} />
            <ToggleField checked={documentForm.client_can_replace_file} help={tx('أوقف هذا عندما لا يجب على العميل استبدال ملف مرفوع سابقاً دون إجراء من الموظف.', 'Turn off when the client should not replace a previously uploaded file without staff action.')} label={tx('يمكن للعميل استبدال الملف', 'Client can replace the file')} onChange={(value) => setDocumentForm({ ...documentForm, client_can_replace_file: value })} />
            <ToggleField checked={documentForm.provider_can_view_file} help={tx('فعّل هذا فقط إذا كان المزود يحتاج فعلاً إلى الوصول لهذا الملف.', 'Only enable if the provider truly needs access to this file.')} label={tx('يمكن للمزود عرض الملف', 'Provider can view the file')} onChange={(value) => setDocumentForm({ ...documentForm, provider_can_view_file: value })} />
          </div>
          <SectionMessage message={feedback.documents} />
        </div>
      </FormModal>

      <FormModal
        open={activeEditor === 'assignment'}
        onClose={closeAssignmentEditor}
        size="md"
        title={selectedAssignment ? tx('تعديل قاعدة الإسناد', 'Edit assignment rule') : tx('قاعدة إسناد جديدة', 'New assignment rule')}
        description={tx('اربط المزودين المعتمدين بالخدمات دون ضغط جداول القواعد.', 'Link approved providers to services without compressing the rule tables.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeAssignmentEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleAssignmentSave} type="button">
              {tx('حفظ قاعدة الإسناد', 'Save assignment rule')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={tx('الخدمة', 'Service')} help={tx('اختر الخدمة التي يستطيع هذا المزود تنفيذها.', 'Choose the service that this provider can execute.')}>
            <select className="field" value={assignmentForm.service_id} onChange={(event) => setAssignmentForm({ ...assignmentForm, service_id: event.target.value })}>
              <option value="">{tx('اختر الخدمة', 'Choose service')}</option>
              {services.filter((service) => service.provider_required).map((service) => (
                <option key={service.id} value={service.id}>
                  {getLocalizedName(service)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx('مزود الخدمة', 'Provider')} help={tx('يجب ربط المزودين المعتمدين والنشطين فقط.', 'Only approved, business-active providers should be linked.')}>
            <select className="field" value={assignmentForm.provider_id} onChange={(event) => setAssignmentForm({ ...assignmentForm, provider_id: event.target.value })}>
              <option value="">{tx('اختر المزود', 'Choose provider')}</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.full_name}
                </option>
              ))}
            </select>
          </Field>
          <ToggleField checked={assignmentForm.is_active} help={tx('تبقى الروابط غير النشطة في سجل التدقيق لكنها توقف المطابقة المستقبلية.', 'Inactive links stay in audit history but stop future matching.')} label={tx('قاعدة الإسناد نشطة', 'Assignment rule is active')} onChange={(value) => setAssignmentForm({ ...assignmentForm, is_active: value })} />
          <SectionMessage message={feedback.assignments} />
        </div>
      </FormModal>

      <FormModal
        open={activeEditor === 'provider'}
        onClose={closeProviderEditor}
        size="lg"
        title={selectedProvider ? tx(`إدارة ${selectedProvider.full_name}`, `Manage ${selectedProvider.full_name}`) : tx('إدارة المزود', 'Manage provider')}
        description={tx('راجع اعتماد المزود ووصوله للأعمال داخل نافذة مركزة.', 'Review provider approval and business access in a focused popup.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeProviderEditor} type="button">
              {tx('إغلاق', 'Close')}
            </button>
          </div>
        }
      >
        {selectedProvider ? (
          <div className="space-y-4">
            <EmptyHelp
              title={selectedProvider.full_name}
              text={tx(`القدرات: ${selectedProvider.capability_summary}.`, `Capabilities: ${selectedProvider.capability_summary}.`)}
              warning={tx('يتم تدقيق تغييرات الاعتماد والتفعيل.', 'Approval and activation changes are audited.')}
            />
            <Field label={tx('قرار الاعتماد', 'Approval decision')} help={tx('رفض المزود يتطلب سبباً لأثر التدقيق.', 'Rejecting a provider requires a reason for the audit trail.')}>
              <select className="field" value={providerActionForm.decision} onChange={(event) => setProviderActionForm({ ...providerActionForm, decision: event.target.value })}>
                <option value="approve">{tx('اعتماد المزود', 'Approve provider')}</option>
                <option value="reject">{tx('رفض المزود', 'Reject provider')}</option>
              </select>
            </Field>
            <Field label={tx('سبب الاعتماد أو الرفض', 'Approval reason')} help={tx('مطلوب فقط عند رفض المزود.', 'Required only when rejecting a provider.')}>
              <textarea className="field min-h-24" value={providerActionForm.approval_reason} onChange={(event) => setProviderActionForm({ ...providerActionForm, approval_reason: event.target.value })} />
            </Field>
            <button className="btn-primary" onClick={handleProviderApproval} type="button">
              {tx('حفظ قرار الاعتماد', 'Save approval decision')}
            </button>
            <ToggleField checked={providerActionForm.is_active} help={tx('أوقف الوصول بأمان دون حذف ملف المزود.', 'Turn off access safely without deleting the provider profile.')} label={tx('حساب المزود نشط', 'Provider account is active')} onChange={(value) => setProviderActionForm({ ...providerActionForm, is_active: value })} />
            <Field label={tx('سبب التفعيل أو التعطيل', 'Activation reason')} help={tx('مطلوب فقط عند تعطيل المزود.', 'Required only when deactivating a provider.')}>
              <textarea className="field min-h-24" value={providerActionForm.activation_reason} onChange={(event) => setProviderActionForm({ ...providerActionForm, activation_reason: event.target.value })} />
            </Field>
            <button className="btn-secondary" onClick={handleProviderActivation} type="button">
              {tx('حفظ التفعيل', 'Save activation')}
            </button>
            <SectionMessage message={feedback.providers} />
          </div>
        ) : null}
      </FormModal>

      <FormModal
        open={activeEditor === 'template'}
        onClose={closeTemplateEditor}
        size="lg"
        title={selectedTemplate ? tx('تعديل قالب الإشعار', 'Edit notification template') : tx('قالب إشعار جديد', 'New notification template')}
        description={tx('عدّل قوالب الرسائل الآمنة داخل نافذة منبثقة وعاينها قبل الحفظ.', 'Edit safe message templates in a popup and preview them before saving.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeTemplateEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-secondary" onClick={handleTemplatePreview} type="button">
              {tx('معاينة', 'Preview')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleTemplateSave} type="button">
              {tx('حفظ القالب', 'Save template')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={tx('مفتاح القالب', 'Template key')} help={tx('مفتاح داخلي يستخدمه الموظفون. اجعله قصيراً وثابتاً.', 'Internal key used by staff. Keep it short and stable.')}>
            <input className="field" value={templateForm.key} onChange={(event) => setTemplateForm({ ...templateForm, key: event.target.value })} />
          </Field>
          <Field label={tx('القناة', 'Channel')} help={tx('استخدم فقط القنوات الآمنة المدعومة بالفعل في النظام.', 'Only safe channels already supported by the system should be used.')}>
            <select className="field" value={templateForm.channel} onChange={(event) => setTemplateForm({ ...templateForm, channel: event.target.value })}>
              <option value="system">{channelLabels.system}</option>
              <option value="email">{channelLabels.email}</option>
              <option value="sms">{channelLabels.sms}</option>
              <option value="whatsapp">{channelLabels.whatsapp}</option>
            </select>
          </Field>
          <Field label={tx('العنوان العربي', 'Arabic title')} help={tx('عنوان الإشعار الظاهر.', 'Visible notification title.')}>
            <input className="field" value={templateForm.title_ar} onChange={(event) => setTemplateForm({ ...templateForm, title_ar: event.target.value })} />
          </Field>
          <Field label={tx('الرسالة العربية', 'Arabic message')} help={tx('العناصر النائبة المسموح بها: {{order_number}} و{{service_name}} و{{customer_name}} و{{status_label}}.', 'Allowed placeholders: {{order_number}}, {{service_name}}, {{customer_name}}, {{status_label}}.')}>
            <textarea className="field min-h-24" value={templateForm.message_ar} onChange={(event) => setTemplateForm({ ...templateForm, message_ar: event.target.value })} />
          </Field>
          <Field label={tx('العنوان الإنجليزي', 'English title')} help={tx('عنوان ثنائي اللغة اختياري.', 'Optional bilingual title.')}>
            <input className="field" value={templateForm.title_en} onChange={(event) => setTemplateForm({ ...templateForm, title_en: event.target.value })} />
          </Field>
          <Field label={tx('الرسالة الإنجليزية', 'English message')} help={tx('رسالة ثنائية اللغة اختيارية.', 'Optional bilingual message.')}>
            <textarea className="field min-h-24" value={templateForm.message_en} onChange={(event) => setTemplateForm({ ...templateForm, message_en: event.target.value })} />
          </Field>
          <ToggleField checked={templateForm.is_active} help={tx('تبقى القوالب غير النشطة في السجل وتتوقف عن الاستخدام.', 'Inactive templates stay in history and stop being used.')} label={tx('القالب نشط', 'Template is active')} onChange={(value) => setTemplateForm({ ...templateForm, is_active: value })} />
          {templatePreview ? (
            <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-sm font-bold text-ink">{tx('المعاينة', 'Preview')}</p>
              <p className="mt-3 text-sm font-semibold text-ink">{templatePreview.title_ar || templatePreview.title_en || tx('بدون عنوان', 'No title')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">{templatePreview.message_ar || templatePreview.message_en || tx('بدون رسالة', 'No message')}</p>
            </div>
          ) : null}
          <SectionMessage message={feedback.notifications} />
        </div>
      </FormModal>

      <FormModal
        open={activeEditor === 'payment'}
        onClose={closePaymentEditor}
        size="md"
        title={selectedPayment ? tx(`تحديث ${selectedPayment.payment_number}`, `Update ${selectedPayment.payment_number}`) : tx('تحديث الدفعة', 'Update payment')}
        description={tx('غيّر حالة الدفع داخل نافذة منبثقة مع إبقاء قائمة سجل المدفوعات ظاهرة في الخلفية.', 'Change payment status in a popup while keeping the payment history list visible in the background.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closePaymentEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handlePaymentSave} type="button">
              {tx('تحديث حالة الدفع', 'Update payment status')}
            </button>
          </div>
        }
      >
        {selectedPayment ? (
          <div className="space-y-4">
            <EmptyHelp title={selectedPayment.payment_number} text={tx(`الطلب ${selectedPayment.order_number} للعميل ${selectedPayment.customer_name}.`, `Order ${selectedPayment.order_number} for ${selectedPayment.customer_name}.`)} warning={tx('يتم تدقيق تغييرات الحالة.', 'Status changes are audited.')} />
            <Field label={tx('حالة الدفع', 'Payment status')} help={tx('اختر حالة الأعمال الصحيحة لهذه الدفعة.', 'Choose the correct business status for this payment.')}>
              <select className="field" value={paymentForm.status} onChange={(event) => setPaymentForm({ ...paymentForm, status: event.target.value })}>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {paymentStatusLabels[option] || option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tx('رقم المرجع', 'Reference number')} help={tx('أضف مرجع البنك أو البوابة أو الإيصال اليدوي عند توفره.', 'Add a bank, gateway, or manual receipt reference when available.')}>
              <input className="field" value={paymentForm.reference_number} onChange={(event) => setPaymentForm({ ...paymentForm, reference_number: event.target.value })} />
            </Field>
            <Field label={tx('السبب أو الملاحظات', 'Reason or notes')} help={tx('اشرح سبب تغير حالة هذه الدفعة.', 'Explain why this payment status changed.')}>
              <textarea className="field min-h-24" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} />
            </Field>
            <Field label={tx('سبب الفشل', 'Failure reason')} help={tx('استخدم هذا فقط عندما تفشل الدفعة.', 'Use this only when the payment failed.')}>
              <textarea className="field min-h-24" value={paymentForm.failure_reason} onChange={(event) => setPaymentForm({ ...paymentForm, failure_reason: event.target.value })} />
            </Field>
            <SectionMessage message={feedback.payments} />
          </div>
        ) : null}
      </FormModal>

      <FormModal
        open={activeEditor === 'user'}
        onClose={closeUserEditor}
        size="lg"
        title={selectedUser ? tx('تعديل المستخدم', 'Edit user') : tx('مستخدم جديد', 'New user')}
        description={tx('أدر مستخدمي الأعمال القياسيين داخل نافذة منبثقة دون تصغير القائمة.', 'Manage standard business users in a popup without shrinking the list.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeUserEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleUserSave} type="button">
              {tx('حفظ المستخدم', 'Save user')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={tx('الاسم الكامل', 'Full name')} help={tx('استخدم الاسم الظاهر للأعمال.', 'Use the business-facing display name.')}>
            <input className="field" value={userForm.full_name} onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })} />
          </Field>
          <Field label={tx('البريد الإلكتروني', 'Email')} help={tx('يستخدم لتسجيل الدخول والإشعارات.', 'Used for login and notifications.')}>
            <input className="field" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
          </Field>
          <Field label={tx('الهاتف', 'Phone')} help={tx('رقم التواصل الأساسي.', 'Primary contact number.')}>
            <input className="field" value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} />
          </Field>
          <Field label={tx('كلمة المرور', 'Password')} help={tx('اتركها فارغة عند التعديل إذا لم تكن هناك حاجة لإعادة التعيين.', 'Leave blank when editing if no password reset is needed.')}>
            <input className="field" type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
          </Field>
          <Field label={tx('الدور', 'Role')} help={tx('تتوفر هنا فقط الأدوار التجارية العادية.', 'Only normal business roles are available here.')}>
            <select className="field" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
              {(selectedUser?.role_options || ['customer', 'employee', 'support', 'provider']).map((option) => (
                <option key={option} value={option}>
                  {roleLabels[option] || option}
                </option>
              ))}
            </select>
          </Field>
          <Field label={tx('الرقم الوطني', 'National ID')} help={tx('مرجع هوية اختياري عندما تستخدمه الأعمال.', 'Optional identity reference when the business uses it.')}>
            <input className="field" value={userForm.national_id} onChange={(event) => setUserForm({ ...userForm, national_id: event.target.value })} />
          </Field>
          <div className="grid gap-3">
            <ToggleField checked={userForm.is_active} help={tx('أوقف الوصول دون حذف الحساب.', 'Turn off access without deleting the account.')} label={tx('المستخدم نشط', 'User is active')} onChange={(value) => setUserForm({ ...userForm, is_active: value })} />
            <ToggleField checked={userForm.is_verified} help={tx('استخدم هذا فقط عند اكتمال عملية التحقق التجارية.', 'Use only when the business verification process is complete.')} label={tx('المستخدم موثّق', 'User is verified')} onChange={(value) => setUserForm({ ...userForm, is_verified: value })} />
          </div>
          <SectionMessage message={feedback.users} />
        </div>
      </FormModal>

      <FormModal
        open={activeEditor === 'setting'}
        onClose={closeSettingEditor}
        size="lg"
        title={selectedSetting ? tx('تعديل الإعداد', 'Edit setting') : tx('إعداد جديد', 'New setting')}
        description={tx('لا يمكن تعديل سوى الإعدادات التجارية الآمنة المسموح بها هنا.', 'Only whitelisted business-safe settings can be edited here.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeSettingEditor} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" onClick={handleSettingSave} type="button">
              {tx('حفظ الإعداد', 'Save setting')}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label={tx('الإعداد', 'Setting')} help={tx('اختر واحداً من الإعدادات التجارية الآمنة المسموح بها.', 'Choose one of the allowed business-safe settings.')}>
            <select className="field" value={settingForm.key} onChange={(event) => setSettingForm({ key: event.target.value, description: '', values: {} })}>
              {SYSTEM_SETTING_KEYS.map((key) => (
                <option key={key} value={key}>
                  {localizeSettingValue(SETTING_DEFINITIONS[key]?.label) || key}
                </option>
              ))}
            </select>
          </Field>
          <EmptyHelp title={currentSettingDefinition.label} text={currentSettingDefinition.help_text} warning={currentSettingDefinition.warning} />
          {currentSettingDefinition.fields.map((field) => (
            <Field key={field.key} label={field.label} help={field.help_text}>
              {field.control === 'textarea' ? (
                <textarea
                  className="field min-h-24"
                  value={settingForm.values[field.key] || ''}
                  onChange={(event) =>
                    setSettingForm({
                      ...settingForm,
                      values: { ...settingForm.values, [field.key]: event.target.value },
                    })
                  }
                />
              ) : (
                <input
                  className="field"
                  type={field.control === 'email' ? 'email' : 'text'}
                  value={settingForm.values[field.key] || ''}
                  onChange={(event) =>
                    setSettingForm({
                      ...settingForm,
                      values: { ...settingForm.values, [field.key]: event.target.value },
                    })
                  }
                />
              )}
            </Field>
          ))}
          <Field label={tx('ملاحظة إدارية', 'Admin note')} help={tx('ملاحظة اختيارية توضح سبب تغيير هذا الإعداد.', 'Optional note explaining why this setting changed.')}>
            <textarea className="field min-h-24" value={settingForm.description} onChange={(event) => setSettingForm({ ...settingForm, description: event.target.value })} />
          </Field>
          <SectionMessage message={feedback.settings} />
        </div>
      </FormModal>

      <ConfirmModal
        description={confirmState.description}
        onClose={() => setConfirmState({ open: false, title: '', description: '', onConfirm: null })}
        onConfirm={async () => {
          if (confirmState.onConfirm) {
            try {
              await confirmState.onConfirm()
            } catch (error) {
              setSectionFeedback(activeTab, 'error', getDisplayError(error))
              setConfirmState({ open: false, title: '', description: '', onConfirm: null })
            }
          }
        }}
        open={confirmState.open}
        title={confirmState.title}
      />
    </div>
  )
}

export default AdminRuleManagementPage
