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
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'

const SERVICE_TABS = [
  { id: 'services', label: 'Services and pricing', icon: SlidersHorizontal },
  { id: 'documents', label: 'Required documents', icon: FileCheck2 },
  { id: 'providers', label: 'Provider rules', icon: BriefcaseBusiness },
  { id: 'workflow', label: 'Workflow rules', icon: Workflow },
  { id: 'notifications', label: 'Notification templates', icon: BellRing },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'users', label: 'Users and roles', icon: UsersRound },
  { id: 'audit', label: 'Audit logs', icon: ShieldCheck },
  { id: 'settings', label: 'System settings', icon: Settings },
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

const SAFE_FILE_TYPES = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
const PAYMENT_STATUS_OPTIONS = ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded']
const SYSTEM_SETTING_KEYS = ['site.homepage', 'site.contact']
const SETTING_DEFINITIONS = {
  'site.homepage': {
    label: 'Homepage content',
    help_text: 'Edit only the safe public text shown on the home page.',
    warning: '',
    fields: [
      { key: 'hero_title', label: 'Main title', control: 'text', help_text: 'Short headline shown at the top of the home page.' },
      { key: 'hero_subtitle', label: 'Supporting text', control: 'textarea', help_text: 'Short supporting description below the title.' },
    ],
  },
  'site.contact': {
    label: 'Contact details',
    help_text: 'Public contact details used by clients when they need help.',
    warning: 'Changes appear to clients immediately.',
    fields: [
      { key: 'phone', label: 'Phone number', control: 'text', help_text: 'Visible customer support phone number.' },
      { key: 'email', label: 'Email address', control: 'email', help_text: 'Visible customer support email address.' },
    ],
  },
}

function formatDateTime(value) {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
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
      setSelectedServiceId(null)
      setServiceForm(DEFAULT_SERVICE_FORM)
      setSectionFeedback('services', 'success', 'Service rules saved.')
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
      setSelectedDocumentId(null)
      setDocumentForm(DEFAULT_DOCUMENT_FORM)
      setSectionFeedback('documents', 'success', 'Document rule saved.')
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
      setSelectedAssignmentId(null)
      setAssignmentForm(DEFAULT_ASSIGNMENT_FORM)
      setSectionFeedback('assignments', 'success', 'Provider rule saved.')
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
      setSectionFeedback('providers', 'success', 'Provider approval decision saved.')
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
      setSectionFeedback('providers', 'success', 'Provider activation updated.')
    } catch (error) {
      setSectionFeedback('providers', 'error', getDisplayError(error))
    }
  }

  async function handleTemplatePreview() {
    try {
      const preview = await api.previewNotificationTemplate(templateForm)
      setTemplatePreview(preview)
      setSectionFeedback('notifications', 'success', 'Preview updated.')
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
      setSelectedTemplateId(null)
      setTemplateForm(DEFAULT_TEMPLATE_FORM)
      setTemplatePreview(null)
      setSectionFeedback('notifications', 'success', 'Notification template saved.')
    } catch (error) {
      setSectionFeedback('notifications', 'error', getDisplayError(error))
    }
  }

  async function handlePaymentSave() {
    if (!selectedPayment) return
    try {
      await api.updateAdminPaymentStatus(selectedPayment.id, paymentForm)
      reloadPayments()
      setSectionFeedback('payments', 'success', 'Payment status updated safely.')
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
      setSelectedUserId(null)
      setUserForm(DEFAULT_USER_FORM)
      setSectionFeedback('users', 'success', 'User saved.')
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
      setSelectedSettingId(null)
      setSectionFeedback('settings', 'success', 'System setting saved.')
    } catch (error) {
      setSectionFeedback('settings', 'error', getDisplayError(error))
    }
  }

  if (busy) return <LoadingSpinner />

  const serviceColumns = [
    { key: 'name_ar', label: 'Service' },
    { key: 'category_name', label: 'Category' },
    { key: 'base_price', label: 'Base price' },
    { key: 'duration_display', label: 'Estimated duration' },
    { key: 'provider_required', label: 'Provider required', render: (row) => (row.provider_required ? 'Yes' : 'No') },
    { key: 'requires_manual_review', label: 'Employee review', render: (row) => (row.requires_manual_review ? 'Required' : 'Not required') },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedServiceId(row.id)} type="button">
            Edit
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm('Disable service', 'Used services are only disabled, never removed from history.', async () => {
                await api.deleteAdminService(row.id)
                reloadServices()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            Disable
          </button>
        </div>
      ),
    },
  ]

  const documentColumns = [
    { key: 'service_name', label: 'Service' },
    { key: 'name_ar', label: 'Document name' },
    { key: 'is_required', label: 'Requirement', render: (row) => (row.is_required ? 'Required' : 'Optional') },
    { key: 'allowed_extensions', label: 'File types', render: (row) => (row.allowed_extensions || []).join(', ') || 'Not set' },
    { key: 'max_file_size', label: 'Max size', render: (row) => toMb(row.max_file_size) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedDocumentId(row.id)} type="button">
            Edit
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm('Disable document rule', 'Orders keep their uploaded files. Only the future requirement is disabled.', async () => {
                await api.deleteAdminServiceDocument(row.id)
                reloadDocuments()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            Disable
          </button>
        </div>
      ),
    },
  ]

  const assignmentColumns = [
    { key: 'service_name', label: 'Service' },
    { key: 'provider_name', label: 'Provider' },
    { key: 'provider_city', label: 'City' },
    { key: 'provider_is_approved', label: 'Approved', render: (row) => (row.provider_is_approved ? 'Yes' : 'No') },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedAssignmentId(row.id)} type="button">
            Edit
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm('Disable assignment rule', 'This keeps audit history and only stops future matching.', async () => {
                await api.deleteAdminServiceAssignment(row.id)
                reloadAssignments()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            Disable
          </button>
        </div>
      ),
    },
  ]

  const providerColumns = [
    { key: 'full_name', label: 'Provider' },
    { key: 'provider_type', label: 'Capability' },
    { key: 'capability_summary', label: 'Services' },
    { key: 'approval_status_label', label: 'Approval' },
    { key: 'account_active', label: 'Account', render: (row) => (row.account_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedProviderId(row.id)} type="button">
          Manage
        </button>
      ),
    },
  ]

  const workflowColumns = [
    { key: 'summary', label: 'Rule' },
    { key: 'allowed_role_labels', label: 'Who can do it', render: (row) => row.allowed_role_labels.join(', ') },
    { key: 'reason_required', label: 'Reason required', render: (row) => (row.reason_required ? 'Yes' : 'No') },
    { key: 'notification_trigger', label: 'Sends notification', render: (row) => (row.notification_trigger ? 'Yes' : 'No') },
    { key: 'change_request_supported', label: 'Direct edit', render: () => 'Not allowed' },
  ]

  const templateColumns = [
    { key: 'key', label: 'Template key' },
    { key: 'channel', label: 'Channel' },
    { key: 'title_ar', label: 'Arabic title' },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedTemplateId(row.id || row.template_id)} type="button">
            Edit
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm('Disable template', 'This keeps the template for audit but stops using it.', async () => {
                await api.deleteAdminNotificationTemplate(row.id || row.template_id)
                reloadTemplates()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            Disable
          </button>
        </div>
      ),
    },
  ]

  const paymentColumns = [
    { key: 'payment_number', label: 'Payment number' },
    { key: 'order_number', label: 'Order' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'status_label', label: 'Status' },
    { key: 'amount', label: 'Amount' },
    { key: 'reference_number', label: 'Reference' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedPaymentId(row.id)} type="button">
          Update
        </button>
      ),
    },
  ]

  const userColumns = [
    { key: 'full_name', label: 'User' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'is_active', label: 'Status', render: (row) => (row.is_active ? 'Active' : 'Inactive') },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedUserId(row.id)} type="button">
            Edit
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() =>
              openConfirm('Deactivate user', 'This keeps the account for audit and blocks future access.', async () => {
                await api.deleteAdminUser(row.id)
                reloadUsers()
                setConfirmState({ open: false, title: '', description: '', onConfirm: null })
              })
            }
            type="button"
          >
            Deactivate
          </button>
        </div>
      ),
    },
  ]

  const auditColumns = [
    { key: 'user_name', label: 'User' },
    { key: 'module', label: 'Module' },
    { key: 'action', label: 'Action' },
    { key: 'status', label: 'Result' },
    { key: 'message', label: 'Message' },
    { key: 'created_at', label: 'Date', render: (row) => formatDateTime(row.created_at) },
  ]

  const settingColumns = [
    { key: 'label', label: 'Setting' },
    { key: 'warning', label: 'Warning', render: (row) => row.warning || 'No warning' },
    { key: 'updated_at', label: 'Last update', render: (row) => formatDateTime(row.updated_at) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedSettingId(row.id || row.setting_id)} type="button">
          Edit
        </button>
      ),
    },
  ]

  const currentSettingDefinition =
    systemSettings.find((item) => item.key === settingForm.key) || {
      key: settingForm.key,
      ...(SETTING_DEFINITIONS[settingForm.key] || {
        label: settingForm.key,
        help_text: 'Choose a safe setting and fill in the allowed fields only.',
        warning: '',
        fields: [],
      }),
    }

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="Safe business-rule management for non-technical admins. All changes stay inside audited workflows and restricted admin actions."
        eyebrow="Admin Rules"
        icon={FileStack}
        title="Rule Management"
      />

      <div className="flex flex-wrap gap-3">
        {SERVICE_TABS.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      {activeTab === 'services' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="Service management"
              text="Manage only business-facing service details. Internal identifiers stay hidden and used services are disabled instead of deleted."
            />
            <DataTable columns={serviceColumns} emptyDescription="Create the first service to start taking orders." emptyTitle="No services found" rows={services} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <EmptyHelp
              title="Price rules"
              text="Base price, extra fees, review requirement, and provider requirement are audited. This form does not allow direct workflow bypass."
              warning="Price changes are visible to staff immediately and are recorded in the audit log."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category" help="Choose the business category shown to admins and clients.">
                <select className="field" value={serviceForm.category_id} onChange={(event) => setServiceForm({ ...serviceForm, category_id: event.target.value })}>
                  <option value="">Choose category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name_ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Arabic name" help="Main service name visible in Arabic screens.">
                <input className="field" value={serviceForm.name_ar} onChange={(event) => setServiceForm({ ...serviceForm, name_ar: event.target.value })} />
              </Field>
              <Field label="English name" help="Used in bilingual screens and reports.">
                <input className="field" value={serviceForm.name_en} onChange={(event) => setServiceForm({ ...serviceForm, name_en: event.target.value })} />
              </Field>
              <Field label="Base price" help="Main service amount before other fees.">
                <input className="field" type="number" value={serviceForm.base_price} onChange={(event) => setServiceForm({ ...serviceForm, base_price: event.target.value })} />
              </Field>
              <Field label="Government fee" help="Optional government amount if this service needs it.">
                <input className="field" type="number" value={serviceForm.government_fee} onChange={(event) => setServiceForm({ ...serviceForm, government_fee: event.target.value })} />
              </Field>
              <Field label="Extra service fee" help="Any extra internal fee allowed by the business model.">
                <input className="field" type="number" value={serviceForm.service_fee} onChange={(event) => setServiceForm({ ...serviceForm, service_fee: event.target.value })} />
              </Field>
              <Field label="Estimated duration" help="Use a simple number for non-technical admins.">
                <input className="field" type="number" value={serviceForm.estimated_duration} onChange={(event) => setServiceForm({ ...serviceForm, estimated_duration: event.target.value })} />
              </Field>
              <Field label="Duration unit" help="Choose the clearest unit for operations.">
                <select className="field" value={serviceForm.estimated_duration_unit} onChange={(event) => setServiceForm({ ...serviceForm, estimated_duration_unit: event.target.value })}>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </Field>
              <Field label="Arabic description" help="Explain the service in simple language.">
                <textarea className="field min-h-28" value={serviceForm.description_ar} onChange={(event) => setServiceForm({ ...serviceForm, description_ar: event.target.value })} />
              </Field>
              <Field label="English description" help="Optional bilingual description.">
                <textarea className="field min-h-28" value={serviceForm.description_en} onChange={(event) => setServiceForm({ ...serviceForm, description_en: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-3">
              <ToggleField checked={serviceForm.provider_required} help="Turn this off only for services completed fully inside the office." label="Provider is required" onChange={(value) => setServiceForm({ ...serviceForm, provider_required: value })} />
              <ToggleField checked={serviceForm.requires_manual_review} help="Keep this on when an employee must review each order before execution." label="Employee review is required" onChange={(value) => setServiceForm({ ...serviceForm, requires_manual_review: value })} />
              <ToggleField checked={serviceForm.is_active} help="Inactive services stay in history but stop accepting new orders." label="Service is active" onChange={(value) => setServiceForm({ ...serviceForm, is_active: value })} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleServiceSave} type="button">
                Save service
              </button>
              <button className="btn-secondary" onClick={() => { setSelectedServiceId(null); setServiceForm(DEFAULT_SERVICE_FORM) }} type="button">
                New
              </button>
            </div>
            <SectionMessage message={feedback.services} />
          </div>
        </section>
      ) : null}

      {activeTab === 'documents' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="Required documents"
              text="Define which files are required for each service using clear names, safe file types, and replacement rules."
              warning="Admins cannot edit the actual uploaded files from this screen."
            />
            <DataTable columns={documentColumns} emptyDescription="Add the first document rule for a service." emptyTitle="No document rules found" rows={documents} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <Field label="Service" help="Choose which service needs this document.">
              <select className="field" value={documentForm.service_id} onChange={(event) => setDocumentForm({ ...documentForm, service_id: event.target.value })}>
                <option value="">Choose service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_ar}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Arabic document name" help="Visible label shown to staff and clients.">
              <input className="field" value={documentForm.name_ar} onChange={(event) => setDocumentForm({ ...documentForm, name_ar: event.target.value })} />
            </Field>
            <Field label="English document name" help="Optional bilingual label.">
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
            <Field label="Maximum size in bytes" help="Keep this simple. The system also applies a global safety limit.">
              <input className="field" type="number" value={documentForm.max_file_size} onChange={(event) => setDocumentForm({ ...documentForm, max_file_size: event.target.value })} />
            </Field>
            <div className="grid gap-3">
              <ToggleField checked={documentForm.is_required} help="Required documents block order progress until uploaded and approved." label="Required document" onChange={(value) => setDocumentForm({ ...documentForm, is_required: value })} />
              <ToggleField checked={documentForm.requires_verification} help="Use this when staff must verify the file before the order can move forward." label="Requires verification" onChange={(value) => setDocumentForm({ ...documentForm, requires_verification: value })} />
              <ToggleField checked={documentForm.client_can_replace_file} help="Turn off when the client should not replace a previously uploaded file without staff action." label="Client can replace the file" onChange={(value) => setDocumentForm({ ...documentForm, client_can_replace_file: value })} />
              <ToggleField checked={documentForm.provider_can_view_file} help="Only enable if the provider truly needs access to this file." label="Provider can view the file" onChange={(value) => setDocumentForm({ ...documentForm, provider_can_view_file: value })} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleDocumentSave} type="button">
                Save document rule
              </button>
              <button className="btn-secondary" onClick={() => { setSelectedDocumentId(null); setDocumentForm(DEFAULT_DOCUMENT_FORM) }} type="button">
                New
              </button>
            </div>
            <SectionMessage message={feedback.documents} />
          </div>
        </section>
      ) : null}

      {activeTab === 'providers' ? (
        <section className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-panel p-6">
              <EmptyHelp
                title="Provider assignment rules"
                text="Link approved providers to services. Actual order reassignment stays on the order screen and requires a reason."
              />
              <DataTable columns={assignmentColumns} emptyDescription="Link providers to services before assigning live orders." emptyTitle="No provider assignment rules found" rows={assignments} />
            </div>

            <div className="glass-panel space-y-4 p-6">
              <Field label="Service" help="Choose the service that this provider can execute.">
                <select className="field" value={assignmentForm.service_id} onChange={(event) => setAssignmentForm({ ...assignmentForm, service_id: event.target.value })}>
                  <option value="">Choose service</option>
                  {services.filter((service) => service.provider_required).map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name_ar}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Provider" help="Only approved, business-active providers should be linked.">
                <select className="field" value={assignmentForm.provider_id} onChange={(event) => setAssignmentForm({ ...assignmentForm, provider_id: event.target.value })}>
                  <option value="">Choose provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.full_name}
                    </option>
                  ))}
                </select>
              </Field>
              <ToggleField checked={assignmentForm.is_active} help="Inactive links stay in audit history but stop future matching." label="Assignment rule is active" onChange={(value) => setAssignmentForm({ ...assignmentForm, is_active: value })} />
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={handleAssignmentSave} type="button">
                  Save assignment rule
                </button>
                <button className="btn-secondary" onClick={() => { setSelectedAssignmentId(null); setAssignmentForm(DEFAULT_ASSIGNMENT_FORM) }} type="button">
                  New
                </button>
              </div>
              <SectionMessage message={feedback.assignments} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="glass-panel p-6">
              <EmptyHelp
                title="Provider approval"
                text="Review provider capabilities, approve or reject them, and activate or deactivate business access without editing security internals."
              />
              <DataTable columns={providerColumns} emptyDescription="Provider accounts appear here once created." emptyTitle="No providers found" rows={providers} />
            </div>

            <div className="glass-panel space-y-4 p-6">
              {selectedProvider ? (
                <>
                  <EmptyHelp
                    title={selectedProvider.full_name}
                    text={`Capabilities: ${selectedProvider.capability_summary}.`}
                    warning="Approval and activation changes are audited."
                  />
                  <Field label="Approval decision" help="Rejecting a provider requires a reason for the audit trail.">
                    <select className="field" value={providerActionForm.decision} onChange={(event) => setProviderActionForm({ ...providerActionForm, decision: event.target.value })}>
                      <option value="approve">Approve provider</option>
                      <option value="reject">Reject provider</option>
                    </select>
                  </Field>
                  <Field label="Approval reason" help="Required only when rejecting a provider.">
                    <textarea className="field min-h-24" value={providerActionForm.approval_reason} onChange={(event) => setProviderActionForm({ ...providerActionForm, approval_reason: event.target.value })} />
                  </Field>
                  <button className="btn-primary" onClick={handleProviderApproval} type="button">
                    Save approval decision
                  </button>
                  <ToggleField checked={providerActionForm.is_active} help="Turn off access safely without deleting the provider profile." label="Provider account is active" onChange={(value) => setProviderActionForm({ ...providerActionForm, is_active: value })} />
                  <Field label="Activation reason" help="Required only when deactivating a provider.">
                    <textarea className="field min-h-24" value={providerActionForm.activation_reason} onChange={(event) => setProviderActionForm({ ...providerActionForm, activation_reason: event.target.value })} />
                  </Field>
                  <button className="btn-secondary" onClick={handleProviderActivation} type="button">
                    Save activation
                  </button>
                </>
              ) : (
                <EmptyHelp title="Select a provider" text="Choose a provider from the table to manage approval and activation safely." />
              )}
              <SectionMessage message={feedback.providers} />
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === 'workflow' ? (
        <section className="glass-panel p-6">
          <EmptyHelp
            title="Workflow rules review"
            text="This screen explains the active workflow in simple language. Dangerous transitions cannot be edited directly from the admin UI."
            warning="If workflow change approval is introduced later, change requests should point there instead of direct editing."
          />
          <DataTable columns={workflowColumns} emptyDescription="Workflow rules will appear here once loaded." emptyTitle="No workflow rules found" rows={workflowRules.map((rule, index) => ({ id: index + 1, ...rule }))} />
        </section>
      ) : null}

      {activeTab === 'notifications' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="Notification templates"
              text="Only safe text templates can be edited here. HTML and unsafe placeholders are blocked."
              warning="Preview the message before saving any change."
            />
            <DataTable columns={templateColumns} emptyDescription="Create the first notification template for staff-approved messages." emptyTitle="No notification templates found" rows={notificationTemplates} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <Field label="Template key" help="Internal key used by staff. Keep it short and stable.">
              <input className="field" value={templateForm.key} onChange={(event) => setTemplateForm({ ...templateForm, key: event.target.value })} />
            </Field>
            <Field label="Channel" help="Only safe channels already supported by the system should be used.">
              <select className="field" value={templateForm.channel} onChange={(event) => setTemplateForm({ ...templateForm, channel: event.target.value })}>
                <option value="system">System</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </Field>
            <Field label="Arabic title" help="Visible notification title.">
              <input className="field" value={templateForm.title_ar} onChange={(event) => setTemplateForm({ ...templateForm, title_ar: event.target.value })} />
            </Field>
            <Field label="Arabic message" help="Allowed placeholders: {{order_number}}, {{service_name}}, {{customer_name}}, {{status_label}}.">
              <textarea className="field min-h-24" value={templateForm.message_ar} onChange={(event) => setTemplateForm({ ...templateForm, message_ar: event.target.value })} />
            </Field>
            <Field label="English title" help="Optional bilingual title.">
              <input className="field" value={templateForm.title_en} onChange={(event) => setTemplateForm({ ...templateForm, title_en: event.target.value })} />
            </Field>
            <Field label="English message" help="Optional bilingual message.">
              <textarea className="field min-h-24" value={templateForm.message_en} onChange={(event) => setTemplateForm({ ...templateForm, message_en: event.target.value })} />
            </Field>
            <ToggleField checked={templateForm.is_active} help="Inactive templates stay in history and stop being used." label="Template is active" onChange={(value) => setTemplateForm({ ...templateForm, is_active: value })} />
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={handleTemplatePreview} type="button">
                Preview
              </button>
              <button className="btn-primary flex-1" onClick={handleTemplateSave} type="button">
                Save template
              </button>
            </div>
            {templatePreview ? (
              <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-4">
                <p className="text-sm font-bold text-ink">Preview</p>
                <p className="mt-3 text-sm font-semibold text-ink">{templatePreview.title_ar || templatePreview.title_en || 'No title'}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{templatePreview.message_ar || templatePreview.message_en || 'No message'}</p>
              </div>
            ) : null}
            <SectionMessage message={feedback.notifications} />
          </div>
        </section>
      ) : null}

      {activeTab === 'payments' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="Payment status management"
              text="View payment status and update it only through the safe status action. Raw transaction records are not editable here."
            />
            <DataTable columns={paymentColumns} emptyDescription="Payments linked to orders will appear here." emptyTitle="No payments found" rows={payments} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            {selectedPayment ? (
              <>
                <EmptyHelp title={selectedPayment.payment_number} text={`Order ${selectedPayment.order_number} for ${selectedPayment.customer_name}.`} warning="Status changes are audited." />
                <Field label="Payment status" help="Choose the correct business status for this payment.">
                  <select className="field" value={paymentForm.status} onChange={(event) => setPaymentForm({ ...paymentForm, status: event.target.value })}>
                    {PAYMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reference number" help="Add a bank, gateway, or manual receipt reference when available.">
                  <input className="field" value={paymentForm.reference_number} onChange={(event) => setPaymentForm({ ...paymentForm, reference_number: event.target.value })} />
                </Field>
                <Field label="Reason or notes" help="Explain why this payment status changed.">
                  <textarea className="field min-h-24" value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} />
                </Field>
                <Field label="Failure reason" help="Use this only when the payment failed.">
                  <textarea className="field min-h-24" value={paymentForm.failure_reason} onChange={(event) => setPaymentForm({ ...paymentForm, failure_reason: event.target.value })} />
                </Field>
                <button className="btn-primary" onClick={handlePaymentSave} type="button">
                  Update payment status
                </button>
              </>
            ) : (
              <EmptyHelp title="Select a payment" text="Choose a payment from the table to update its status safely." />
            )}
            <SectionMessage message={feedback.payments} />
          </div>
        </section>
      ) : null}

      {activeTab === 'users' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="User and role management"
              text="Manage normal business users and roles only. Super admin accounts and permission internals stay protected."
              warning="Normal admins cannot create or modify admin-level users."
            />
            <DataTable columns={userColumns} emptyDescription="Business users will appear here once created." emptyTitle="No users found" rows={users} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <Field label="Full name" help="Use the business-facing display name.">
              <input className="field" value={userForm.full_name} onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })} />
            </Field>
            <Field label="Email" help="Used for login and notifications.">
              <input className="field" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} />
            </Field>
            <Field label="Phone" help="Primary contact number.">
              <input className="field" value={userForm.phone} onChange={(event) => setUserForm({ ...userForm, phone: event.target.value })} />
            </Field>
            <Field label="Password" help="Leave blank when editing if no password reset is needed.">
              <input className="field" type="password" value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} />
            </Field>
            <Field label="Role" help="Only normal business roles are available here.">
              <select className="field" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
                {(selectedUser?.role_options || ['customer', 'employee', 'support', 'provider']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="National ID" help="Optional identity reference when the business uses it.">
              <input className="field" value={userForm.national_id} onChange={(event) => setUserForm({ ...userForm, national_id: event.target.value })} />
            </Field>
            <div className="grid gap-3">
              <ToggleField checked={userForm.is_active} help="Turn off access without deleting the account." label="User is active" onChange={(value) => setUserForm({ ...userForm, is_active: value })} />
              <ToggleField checked={userForm.is_verified} help="Use only when the business verification process is complete." label="User is verified" onChange={(value) => setUserForm({ ...userForm, is_verified: value })} />
            </div>
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleUserSave} type="button">
                Save user
              </button>
              <button className="btn-secondary" onClick={() => { setSelectedUserId(null); setUserForm(DEFAULT_USER_FORM) }} type="button">
                New
              </button>
            </div>
            <SectionMessage message={feedback.users} />
          </div>
        </section>
      ) : null}

      {activeTab === 'audit' ? (
        <section className="glass-panel space-y-6 p-6">
          <EmptyHelp
            title="Audit log viewer"
            text="Filter by user, module, action, result, or date. Audit logs are view-only and cannot be edited or deleted from this screen."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="User" help="Filter by user name or ID if needed.">
              <input className="field" value={auditFilters.user} onChange={(event) => setAuditFilters({ ...auditFilters, user: event.target.value })} />
            </Field>
            <Field label="Module" help="Examples: Service, Payment, Notification.">
              <input className="field" value={auditFilters.module} onChange={(event) => setAuditFilters({ ...auditFilters, module: event.target.value })} />
            </Field>
            <Field label="Action" help="Examples: update_service, payment_status_update.">
              <input className="field" value={auditFilters.action} onChange={(event) => setAuditFilters({ ...auditFilters, action: event.target.value })} />
            </Field>
            <Field label="From date" help="Show events on or after this date.">
              <input className="field" type="date" value={auditFilters.date_from} onChange={(event) => setAuditFilters({ ...auditFilters, date_from: event.target.value })} />
            </Field>
            <Field label="To date" help="Show events on or before this date.">
              <input className="field" type="date" value={auditFilters.date_to} onChange={(event) => setAuditFilters({ ...auditFilters, date_to: event.target.value })} />
            </Field>
            <Field label="Result" help="Filter by success or failed actions.">
              <select className="field" value={auditFilters.status} onChange={(event) => setAuditFilters({ ...auditFilters, status: event.target.value })}>
                <option value="">All results</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </Field>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary" onClick={() => reloadAudit()} type="button">
              Refresh logs
            </button>
            <button className="btn-secondary" onClick={() => setAuditFilters(DEFAULT_AUDIT_FILTERS)} type="button">
              Clear filters
            </button>
          </div>
          <DataTable columns={auditColumns} emptyDescription="Sensitive changes will appear here once they occur." emptyTitle="No audit logs found" rows={auditLogs} />
        </section>
      ) : null}

      {activeTab === 'settings' ? (
        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass-panel p-6">
            <EmptyHelp
              title="System settings"
              text="Only whitelisted business-safe settings appear here. Raw JSON and security internals are blocked."
              warning="Sensitive settings should stay under super admin or code control."
            />
            <DataTable columns={settingColumns} emptyDescription="Create a safe setting when the business needs a controlled option." emptyTitle="No safe settings found" rows={systemSettings} />
          </div>

          <div className="glass-panel space-y-4 p-6">
            <Field label="Setting" help="Choose one of the allowed business-safe settings.">
              <select className="field" value={settingForm.key} onChange={(event) => setSettingForm({ key: event.target.value, description: '', values: {} })}>
                {SYSTEM_SETTING_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
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
            <Field label="Admin note" help="Optional note explaining why this setting changed.">
              <textarea className="field min-h-24" value={settingForm.description} onChange={(event) => setSettingForm({ ...settingForm, description: event.target.value })} />
            </Field>
            <button className="btn-primary" onClick={handleSettingSave} type="button">
              Save setting
            </button>
            <SectionMessage message={feedback.settings} />
          </div>
        </section>
      ) : null}

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
