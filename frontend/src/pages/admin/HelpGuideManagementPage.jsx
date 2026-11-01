import { BookOpenText, Boxes, FileCog, FormInput, GitBranch, ImagePlus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { getHelpScreenLabel } from '../../help/screenRegistry'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useExclusiveAction } from '../../hooks/useExclusiveAction'
import { getAdminName, resolveCatalogName } from '../../utils/servicePresentation'

// UI labels for backend choice codes (help_guides.models). Guide body content
// (titles, steps, descriptions) is stored in the database and is shown as-is.
const CATEGORY_LABELS = {
  navigation: { ar: 'التنقل', en: 'Navigation' },
  account: { ar: 'الوصول إلى الحساب', en: 'Account access' },
  customer: { ar: 'العميل', en: 'Customer' },
  employee: { ar: 'الموظف', en: 'Employee' },
  support: { ar: 'الدعم', en: 'Support' },
  provider: { ar: 'المزود', en: 'Provider' },
  admin: { ar: 'الإدارة', en: 'Admin' },
  reports: { ar: 'التقارير', en: 'Reports' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  manual: { ar: 'الصيانة اليدوية', en: 'Manual maintenance' },
  general: { ar: 'عام', en: 'General' },
}

const ROLE_LABELS = {
  all_users: { ar: 'جميع المستخدمين', en: 'All users' },
  admin: { ar: 'مدير', en: 'Admin' },
  customer: { ar: 'عميل', en: 'Customer' },
  employee: { ar: 'موظف', en: 'Employee' },
  support: { ar: 'دعم', en: 'Support' },
  provider: { ar: 'مزود', en: 'Provider' },
  platform_super_admin: { ar: 'المدير الأعلى للمنصة', en: 'Platform super admin' },
  platform_support: { ar: 'دعم المنصة', en: 'Platform support' },
  partner_owner: { ar: 'مالك الشريك', en: 'Partner owner' },
  partner_admin: { ar: 'مدير الشريك', en: 'Partner admin' },
}

function choiceLabel(map, code, isArabic, fallback) {
  const entry = map[String(code || '').toLowerCase()]
  if (entry) return isArabic ? entry.ar : entry.en
  return fallback || code || ''
}

const DEFAULT_VALUES = {
  screens: {
    slug: '',
    screen_key: '',
    route_path: '',
    category: 'general',
    role: 'all_users',
    permission_key: '',
    workflow_status: '',
    title: '',
    short_description: '',
    purpose: '',
    before_you_start: '',
    step_by_step_guide: '',
    when_to_use: '',
    main_workflow: '',
    expected_result: '',
    common_errors: '',
    next_step: '',
    troubleshooting: '',
    related_screen: '',
    related_permission: '',
    search_keywords: '',
    internal_notes: '',
    is_quick_link: false,
    display_order: 0,
    is_active: true,
  },
  screenshots: {
    help_guide: '',
    caption: '',
    image: null,
    static_path: '',
    placeholder_label: '',
    alt_text: '',
    step_reference: '',
    display_order: 0,
    is_active: true,
  },
  fields: {
    screen_key: '',
    field_key: '',
    field_label: '',
    model_name: '',
    model_field: '',
    role: 'all_users',
    permission_key: '',
    purpose: '',
    required: false,
    editable: true,
    data_type: '',
    accepted_format: '',
    valid_example: '',
    invalid_example: '',
    validation_rule: '',
    error_explanation: '',
    placeholder_text: '',
    tooltip_text: '',
    default_value: '',
    max_length: '',
    who_can_edit: '',
    locked_when: '',
    search_keywords: '',
    internal_notes: '',
    display_order: 0,
    is_active: true,
  },
  actions: {
    screen_key: '',
    button_key: '',
    button_label: '',
    role: 'all_users',
    permission_key: '',
    purpose: '',
    when_to_use: '',
    action_result: '',
    status_before: '',
    status_after: '',
    notification_triggered: '',
    warning_message: '',
    common_errors: '',
    safety_rule: '',
    confirmation_message: '',
    search_keywords: '',
    internal_notes: '',
    display_order: 0,
    is_active: true,
  },
  services: {
    service: '',
    screen_key: '',
    role: 'all_users',
    permission_key: '',
    description: '',
    who_can_use: '',
    required_documents: '',
    optional_documents: '',
    required_data: '',
    prerequisites: '',
    related_services: '',
    workflow_summary: '',
    final_output: '',
    common_errors: '',
    common_rejection_reasons: '',
    common_missing_document_reasons: '',
    estimated_processing_time: '',
    price_rule: '',
    provider_requirement: '',
    search_keywords: '',
    internal_notes: '',
    display_order: 0,
    is_active: true,
  },
  workflows: {
    screen_key: '',
    workflow_key: '',
    current_status: '',
    action_key: '',
    action_label: '',
    button_key: '',
    role: 'all_users',
    permission_key: '',
    next_status: '',
    required_fields: '',
    system_effect: '',
    notification_effect: '',
    blocked_cases: '',
    correction_process: '',
    search_keywords: '',
    internal_notes: '',
    display_order: 0,
    is_active: true,
  },
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${active ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-600'}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Field({ label, children, hint }) {
  return (
    <label className="space-y-2">
      <div className="space-y-1">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </label>
  )
}

function flattenPermissionOptions(permissionGroups) {
  return Object.entries(permissionGroups || {}).flatMap(([app, permissions]) =>
    permissions.map((permission) => ({
      value: permission.full_codename,
      label: `${app} / ${permission.name}`,
    })),
  )
}

function HelpGuideManagementPage() {
  const { isArabic, language } = useLanguage()
  const { toast } = useToast()
  const tx = (ar, en) => (isArabic ? ar : en)
  const roleLabel = (code, fallback) => choiceLabel(ROLE_LABELS, code, isArabic, fallback)
  const categoryLabel = (code, fallback) => choiceLabel(CATEGORY_LABELS, code, isArabic, fallback)
  const screenLabel = (key, fallback) => {
    const label = getHelpScreenLabel(key)
    return label === key && fallback ? fallback : label
  }
  const TABS = [
    { id: 'screens', label: isArabic ? 'أدلة الشاشات' : 'Screen Guides', icon: BookOpenText },
    { id: 'screenshots', label: isArabic ? 'الصور' : 'Screenshots', icon: ImagePlus },
    { id: 'fields', label: isArabic ? 'أدلة الحقول' : 'Field Guides', icon: FormInput },
    { id: 'actions', label: isArabic ? 'أدلة الإجراءات' : 'Action Guides', icon: Boxes },
    { id: 'services', label: isArabic ? 'أدلة الخدمات' : 'Service Guides', icon: FileCog },
    { id: 'workflows', label: isArabic ? 'أدلة المسار' : 'Workflow Guides', icon: GitBranch },
  ]
  const [activeTab, setActiveTab] = useState('screens')
  const [search, setSearch] = useState('')
  const [recordStatus, setRecordStatus] = useState('active')
  const [roleFilter, setRoleFilter] = useState('')
  const [screenFilter, setScreenFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const { busy, exclusive } = useExclusiveAction()
  const form = useForm({ defaultValues: DEFAULT_VALUES.screens })

  const { data: metadata = { screens: [], roles: [], workflow_statuses: [] }, loading: metadataLoading } = useAsyncData(
    () => api.getHelpGuideMetadata(),
    [],
    { screens: [], roles: [], workflow_statuses: [] },
  )
  const { data: permissions = {}, loading: permissionsLoading } = useAsyncData(() => api.getAvailablePermissions(), [], {})
  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: screens = [], loading: screensLoading, reload: reloadScreens } = useAsyncData(() => api.getAdminHelpScreens({ status: recordStatus }), [recordStatus], [])
  const { data: screenshots = [], loading: screenshotsLoading, reload: reloadScreenshots } = useAsyncData(() => api.getAdminHelpScreenshots({ status: recordStatus }), [recordStatus], [])
  const { data: fields = [], loading: fieldsLoading, reload: reloadFields } = useAsyncData(() => api.getAdminHelpFields({ status: recordStatus }), [recordStatus], [])
  const { data: actions = [], loading: actionsLoading, reload: reloadActions } = useAsyncData(() => api.getAdminHelpActions({ status: recordStatus }), [recordStatus], [])
  const { data: serviceGuides = [], loading: serviceGuidesLoading, reload: reloadServiceGuides } = useAsyncData(
    () => api.getAdminHelpServices({ status: recordStatus }),
    [recordStatus],
    [],
  )
  const { data: workflows = [], loading: workflowsLoading, reload: reloadWorkflows } = useAsyncData(
    () => api.getAdminHelpWorkflows({ status: recordStatus }),
    [recordStatus],
    [],
  )

  const permissionOptions = useMemo(() => flattenPermissionOptions(permissions), [permissions])
  // The label helpers only depend on the active language.
  const screenOptions = useMemo(
    () => (metadata.screens || []).map((screen) => ({ ...screen, label: screenLabel(screen.screen_key, screen.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metadata.screens, language],
  )
  const roleOptions = useMemo(
    () => (metadata.roles || []).map((role) => ({ ...role, label: roleLabel(role.value, role.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metadata.roles, language],
  )
  const categoryOptions = useMemo(
    () => (metadata.categories || []).map((category) => ({ ...category, label: categoryLabel(category.value, category.label) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metadata.categories, language],
  )
  const serviceOptions = useMemo(
    () => (services || []).map((service) => ({ ...service, display_name: getAdminName(service, language) })),
    [services, language],
  )
  const workflowOptions = useMemo(() => metadata.workflow_statuses || [], [metadata.workflow_statuses])
  // service_name / category_name are Arabic-only on the API (DEF-A03).
  const helpService = (row) => (services || []).find((service) => String(service.id) === String(row?.service ?? row?.service_id))
  const helpServiceName = (row) => resolveCatalogName(row?.service ?? row?.service_id, services, row?.service_name, language)
  const helpCategoryName = (row) => {
    const category = helpService(row)?.category
    return category && typeof category === 'object' ? getAdminName(category, language, row?.category_name || '') : row?.category_name || ''
  }

  const entityConfig = useMemo(
    () => ({
      screens: {
        title: tx('دليل شاشة', 'Screen guide'),
        newLabel: tx('دليل شاشة جديد', 'New screen guide'),
        rows: screens,
        reload: reloadScreens,
        create: api.createAdminHelpScreen,
        update: api.updateAdminHelpScreen,
        remove: api.deleteAdminHelpScreen,
        restore: api.restoreAdminHelpScreen,
        summary: (row) => row.title,
        columns: [
          { key: 'title', label: tx('العنوان', 'Title') },
          { key: 'category', label: tx('الفئة', 'Category'), render: (row) => categoryLabel(row.category, row.category_label) },
          { key: 'screen_label', label: tx('الشاشة', 'Screen'), render: (row) => screenLabel(row.screen_key, row.screen_label) },
          { key: 'role_label', label: tx('الدور', 'Role'), render: (row) => roleLabel(row.role, row.role_label) },
          { key: 'workflow_status_label', label: tx('المسار', 'Workflow'), render: (row) => row.workflow_status_label || row.workflow_status || tx('عام', 'General') },
          { key: 'display_order', label: tx('الترتيب', 'Order') },
        ],
        fields: [
          { name: 'slug', label: tx('المعرّف النصي', 'Slug'), type: 'text' },
          { name: 'screen_key', label: tx('الشاشة', 'Screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'role', label: tx('الدور', 'Role'), type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'category', label: tx('الفئة', 'Category'), type: 'select', options: categoryOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: tx('الصلاحية', 'Permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'workflow_status', label: tx('حالة المسار', 'Workflow status'), type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'title', label: tx('العنوان', 'Title'), type: 'text' },
          { name: 'route_path', label: tx('مسار الصفحة', 'Route path'), type: 'text' },
          { name: 'short_description', label: tx('وصف مختصر', 'Short description'), type: 'textarea' },
          { name: 'purpose', label: tx('الغرض', 'Purpose'), type: 'textarea' },
          { name: 'before_you_start', label: tx('قبل أن تبدأ', 'Before you start'), type: 'textarea' },
          { name: 'step_by_step_guide', label: tx('الخطوات', 'Steps'), type: 'textarea', hint: tx('خطوة واحدة في كل سطر.', 'One step per line.') },
          { name: 'when_to_use', label: tx('متى تُستخدم', 'When to use'), type: 'textarea' },
          { name: 'main_workflow', label: tx('المسار الرئيسي', 'Main workflow'), type: 'text' },
          { name: 'expected_result', label: tx('النتيجة المتوقعة', 'Expected result'), type: 'textarea' },
          { name: 'common_errors', label: tx('المشكلات الشائعة', 'Common problems'), type: 'textarea' },
          { name: 'next_step', label: tx('الخطوة التالية', 'Next step'), type: 'textarea' },
          { name: 'troubleshooting', label: tx('حل المشكلات', 'Troubleshooting'), type: 'textarea' },
          { name: 'related_screen', label: tx('الشاشة المرتبطة', 'Related screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label', optional: true },
          { name: 'related_permission', label: tx('الصلاحية المرتبطة', 'Related permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'search_keywords', label: tx('كلمات البحث', 'Search keywords'), type: 'text' },
          { name: 'internal_notes', label: tx('ملاحظات داخلية', 'Internal notes'), type: 'textarea' },
          { name: 'is_quick_link', label: tx('إظهار كرابط سريع', 'Show as quick link'), type: 'checkbox' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
      screenshots: {
        title: tx('صورة توضيحية', 'Screenshot'),
        newLabel: tx('صورة توضيحية جديدة', 'New screenshot'),
        rows: screenshots,
        reload: reloadScreenshots,
        create: api.createAdminHelpScreenshot,
        update: api.updateAdminHelpScreenshot,
        remove: api.deleteAdminHelpScreenshot,
        restore: api.restoreAdminHelpScreenshot,
        summary: (row) => row.caption,
        columns: [
          { key: 'caption', label: tx('التعليق', 'Caption') },
          { key: 'help_guide_title', label: tx('الدليل', 'Guide') },
          { key: 'step_reference', label: tx('الخطوة', 'Step') },
          { key: 'display_order', label: tx('الترتيب', 'Order') },
        ],
        fields: [
          { name: 'help_guide', label: tx('صفحة الدليل', 'Guide page'), type: 'select', options: screens, optionValue: 'id', optionLabel: 'title' },
          { name: 'caption', label: tx('التعليق', 'Caption'), type: 'text' },
          { name: 'image', label: tx('رفع صورة', 'Upload image'), type: 'file', hint: tx('اختياري. استخدمه للصور الفعلية، واتركه فارغاً عند استخدام عنصر نائب أو مسار ثابت.', 'Optional. Use this for real screenshots; keep blank when using a placeholder or static path.') },
          { name: 'static_path', label: tx('المسار الثابت', 'Static path'), type: 'text' },
          { name: 'placeholder_label', label: tx('تسمية العنصر النائب', 'Placeholder label'), type: 'text' },
          { name: 'alt_text', label: tx('النص البديل', 'Alt text'), type: 'text' },
          { name: 'step_reference', label: tx('مرجع الخطوة', 'Step reference'), type: 'text' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
      fields: {
        title: tx('دليل حقل', 'Field guide'),
        newLabel: tx('دليل حقل جديد', 'New field guide'),
        rows: fields,
        reload: reloadFields,
        create: api.createAdminHelpField,
        update: api.updateAdminHelpField,
        remove: api.deleteAdminHelpField,
        restore: api.restoreAdminHelpField,
        summary: (row) => row.field_label,
        columns: [
          { key: 'field_label', label: tx('الحقل', 'Field') },
          { key: 'screen_label', label: tx('الشاشة', 'Screen'), render: (row) => screenLabel(row.screen_key, row.screen_label) },
          { key: 'role_label', label: tx('الدور', 'Role'), render: (row) => roleLabel(row.role, row.role_label) },
          { key: 'required', label: tx('مطلوب', 'Required'), render: (row) => (row.required ? tx('نعم', 'Yes') : tx('اختياري', 'Optional')) },
          { key: 'display_order', label: tx('الترتيب', 'Order') },
        ],
        fields: [
          { name: 'screen_key', label: tx('الشاشة', 'Screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'field_key', label: tx('مفتاح الحقل', 'Field key'), type: 'text' },
          { name: 'field_label', label: tx('تسمية الحقل', 'Field label'), type: 'text' },
          { name: 'model_name', label: tx('اسم النموذج', 'Model name'), type: 'text' },
          { name: 'model_field', label: tx('حقل النموذج', 'Model field'), type: 'text' },
          { name: 'role', label: tx('الدور', 'Role'), type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: tx('الصلاحية', 'Permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'purpose', label: tx('الغرض', 'Purpose'), type: 'textarea' },
          { name: 'required', label: tx('مطلوب', 'Required'), type: 'checkbox' },
          { name: 'editable', label: tx('قابل للتعديل', 'Editable'), type: 'checkbox' },
          { name: 'data_type', label: tx('نوع البيانات', 'Data type'), type: 'text' },
          { name: 'accepted_format', label: tx('الصيغة المقبولة', 'Accepted format'), type: 'textarea' },
          { name: 'valid_example', label: tx('مثال صالح', 'Valid example'), type: 'text' },
          { name: 'invalid_example', label: tx('مثال غير صالح', 'Invalid example'), type: 'text' },
          { name: 'validation_rule', label: tx('قاعدة التحقق', 'Validation rule'), type: 'textarea' },
          { name: 'error_explanation', label: tx('شرح الخطأ', 'Error explanation'), type: 'textarea' },
          { name: 'placeholder_text', label: tx('النص النائب', 'Placeholder text'), type: 'text' },
          { name: 'tooltip_text', label: tx('نص التلميح', 'Tooltip text'), type: 'textarea' },
          { name: 'default_value', label: tx('القيمة الافتراضية', 'Default value'), type: 'text' },
          { name: 'max_length', label: tx('الحد الأقصى للطول', 'Max length'), type: 'number' },
          { name: 'who_can_edit', label: tx('من يمكنه التعديل', 'Who can edit'), type: 'textarea' },
          { name: 'locked_when', label: tx('يُقفل عندما', 'Locked when'), type: 'textarea' },
          { name: 'search_keywords', label: tx('كلمات البحث', 'Search keywords'), type: 'text' },
          { name: 'internal_notes', label: tx('ملاحظات داخلية', 'Internal notes'), type: 'textarea' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
      actions: {
        title: tx('دليل إجراء', 'Action guide'),
        newLabel: tx('دليل إجراء جديد', 'New action guide'),
        rows: actions,
        reload: reloadActions,
        create: api.createAdminHelpAction,
        update: api.updateAdminHelpAction,
        remove: api.deleteAdminHelpAction,
        restore: api.restoreAdminHelpAction,
        summary: (row) => row.button_label,
        columns: [
          { key: 'button_label', label: tx('الزر', 'Button') },
          { key: 'screen_label', label: tx('الشاشة', 'Screen'), render: (row) => screenLabel(row.screen_key, row.screen_label) },
          { key: 'role_label', label: tx('الدور', 'Role'), render: (row) => roleLabel(row.role, row.role_label) },
          { key: 'status_before_label', label: tx('قبل', 'Before'), render: (row) => row.status_before_label || row.status_before || tx('أي حالة', 'Any') },
          { key: 'status_after_label', label: tx('بعد', 'After'), render: (row) => row.status_after_label || row.status_after || tx('بدون تغيير', 'No change') },
        ],
        fields: [
          { name: 'screen_key', label: tx('الشاشة', 'Screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'button_key', label: tx('مفتاح الزر', 'Button key'), type: 'text' },
          { name: 'button_label', label: tx('تسمية الزر', 'Button label'), type: 'text' },
          { name: 'role', label: tx('الدور', 'Role'), type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: tx('الصلاحية', 'Permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'status_before', label: tx('الحالة قبل', 'Status before'), type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'status_after', label: tx('الحالة بعد', 'Status after'), type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'purpose', label: tx('الغرض', 'Purpose'), type: 'textarea' },
          { name: 'when_to_use', label: tx('متى تُستخدم', 'When to use'), type: 'textarea' },
          { name: 'action_result', label: tx('نتيجة الإجراء', 'Action result'), type: 'textarea' },
          { name: 'notification_triggered', label: tx('أثر الإشعار', 'Notification effect'), type: 'textarea' },
          { name: 'warning_message', label: tx('تحذير', 'Warning'), type: 'textarea' },
          { name: 'common_errors', label: tx('الأخطاء الشائعة', 'Common errors'), type: 'textarea' },
          { name: 'safety_rule', label: tx('قاعدة الأمان', 'Safety rule'), type: 'textarea' },
          { name: 'confirmation_message', label: tx('رسالة التأكيد', 'Confirmation message'), type: 'textarea' },
          { name: 'search_keywords', label: tx('كلمات البحث', 'Search keywords'), type: 'text' },
          { name: 'internal_notes', label: tx('ملاحظات داخلية', 'Internal notes'), type: 'textarea' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
      services: {
        title: tx('دليل خدمة', 'Service guide'),
        newLabel: tx('دليل خدمة جديد', 'New service guide'),
        rows: serviceGuides,
        reload: reloadServiceGuides,
        create: api.createAdminHelpService,
        update: api.updateAdminHelpService,
        remove: api.deleteAdminHelpService,
        restore: api.restoreAdminHelpService,
        summary: (row) => helpServiceName(row) || row.service,
        columns: [
          { key: 'service_name', label: tx('الخدمة', 'Service'), render: (row) => helpServiceName(row) },
          { key: 'category_name', label: tx('الفئة', 'Category'), render: (row) => helpCategoryName(row) },
          { key: 'role_label', label: tx('الدور', 'Role'), render: (row) => roleLabel(row.role, row.role_label) },
          { key: 'display_order', label: tx('الترتيب', 'Order') },
        ],
        fields: [
          { name: 'service', label: tx('الخدمة', 'Service'), type: 'select', options: serviceOptions, optionValue: 'id', optionLabel: 'display_name' },
          { name: 'screen_key', label: tx('الشاشة', 'Screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label', optional: true },
          { name: 'role', label: tx('الدور', 'Role'), type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: tx('الصلاحية', 'Permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'description', label: tx('الوصف', 'Description'), type: 'textarea' },
          { name: 'who_can_use', label: tx('من يمكنه الاستخدام', 'Who can use'), type: 'textarea' },
          { name: 'required_documents', label: tx('المستندات المطلوبة', 'Required documents'), type: 'textarea' },
          { name: 'optional_documents', label: tx('المستندات الاختيارية', 'Optional documents'), type: 'textarea' },
          { name: 'required_data', label: tx('البيانات المطلوبة', 'Required data'), type: 'textarea' },
          { name: 'prerequisites', label: tx('المتطلبات المسبقة', 'Prerequisites'), type: 'textarea' },
          { name: 'related_services', label: tx('الخدمات المرتبطة', 'Related services'), type: 'textarea' },
          { name: 'workflow_summary', label: tx('ملخص المسار', 'Workflow summary'), type: 'textarea' },
          { name: 'final_output', label: tx('المخرج النهائي', 'Final output'), type: 'textarea' },
          { name: 'common_errors', label: tx('الأخطاء الشائعة', 'Common errors'), type: 'textarea' },
          { name: 'common_rejection_reasons', label: tx('أسباب الرفض الشائعة', 'Common rejection reasons'), type: 'textarea' },
          { name: 'common_missing_document_reasons', label: tx('أسباب نقص المستندات', 'Missing document reasons'), type: 'textarea' },
          { name: 'estimated_processing_time', label: tx('مدة المعالجة المتوقعة', 'Estimated processing time'), type: 'text' },
          { name: 'price_rule', label: tx('قاعدة السعر', 'Price rule'), type: 'textarea' },
          { name: 'provider_requirement', label: tx('متطلبات المزود', 'Provider requirement'), type: 'textarea' },
          { name: 'search_keywords', label: tx('كلمات البحث', 'Search keywords'), type: 'text' },
          { name: 'internal_notes', label: tx('ملاحظات داخلية', 'Internal notes'), type: 'textarea' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
      workflows: {
        title: tx('دليل مسار', 'Workflow guide'),
        newLabel: tx('دليل مسار جديد', 'New workflow guide'),
        rows: workflows,
        reload: reloadWorkflows,
        create: api.createAdminHelpWorkflow,
        update: api.updateAdminHelpWorkflow,
        remove: api.deleteAdminHelpWorkflow,
        restore: api.restoreAdminHelpWorkflow,
        summary: (row) => row.workflow_key,
        columns: [
          { key: 'workflow_key', label: tx('مفتاح المسار', 'Workflow key') },
          { key: 'screen_label', label: tx('الشاشة', 'Screen'), render: (row) => screenLabel(row.screen_key, row.screen_label) },
          { key: 'current_status_label', label: tx('الحالة الحالية', 'Current status'), render: (row) => row.current_status_label || row.current_status || tx('أي حالة', 'Any') },
          { key: 'next_status_label', label: tx('الحالة التالية', 'Next status'), render: (row) => row.next_status_label || row.next_status || tx('بدون تغيير', 'No change') },
          { key: 'role_label', label: tx('الدور', 'Role'), render: (row) => roleLabel(row.role, row.role_label) },
        ],
        fields: [
          { name: 'screen_key', label: tx('الشاشة', 'Screen'), type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'workflow_key', label: tx('مفتاح المسار', 'Workflow key'), type: 'text' },
          { name: 'current_status', label: tx('الحالة الحالية', 'Current status'), type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'action_key', label: tx('مفتاح الإجراء', 'Action key'), type: 'text' },
          { name: 'action_label', label: tx('تسمية الإجراء', 'Action label'), type: 'text' },
          { name: 'button_key', label: tx('مفتاح الزر', 'Button key'), type: 'text' },
          { name: 'role', label: tx('الدور', 'Role'), type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: tx('الصلاحية', 'Permission'), type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'next_status', label: tx('الحالة التالية', 'Next status'), type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'required_fields', label: tx('الحقول المطلوبة', 'Required fields'), type: 'textarea' },
          { name: 'system_effect', label: tx('أثر النظام', 'System effect'), type: 'textarea' },
          { name: 'notification_effect', label: tx('أثر الإشعار', 'Notification effect'), type: 'textarea' },
          { name: 'blocked_cases', label: tx('الحالات الممنوعة', 'Blocked cases'), type: 'textarea' },
          { name: 'correction_process', label: tx('آلية التصحيح', 'Correction process'), type: 'textarea' },
          { name: 'search_keywords', label: tx('كلمات البحث', 'Search keywords'), type: 'text' },
          { name: 'internal_notes', label: tx('ملاحظات داخلية', 'Internal notes'), type: 'textarea' },
          { name: 'display_order', label: tx('ترتيب العرض', 'Display order'), type: 'number' },
          { name: 'is_active', label: tx('نشط', 'Active'), type: 'checkbox' },
        ],
      },
    }),
    // tx/roleLabel/screenLabel/categoryLabel only depend on the language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isArabic,
      actions,
      fields,
      permissionOptions,
      categoryOptions,
      reloadActions,
      reloadFields,
      reloadScreens,
      reloadScreenshots,
      reloadServiceGuides,
      reloadWorkflows,
      roleOptions,
      screens,
      screenshots,
      screenOptions,
      serviceGuides,
      serviceOptions,
      workflowOptions,
      workflows,
    ],
  )

  const currentConfig = entityConfig[activeTab]

  useEffect(() => {
    form.reset(
      selectedRecord
        ? {
            ...DEFAULT_VALUES[activeTab],
            ...selectedRecord,
            ...(activeTab === 'screenshots' ? { image: null } : {}),
          }
        : DEFAULT_VALUES[activeTab],
    )
  }, [activeTab, form, selectedRecord])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (currentConfig.rows || []).filter((row) => {
      if (roleFilter && row.role !== roleFilter) return false
      if (screenFilter && row.screen_key !== screenFilter) return false
      if (serviceFilter && String(row.service || row.service_id || '') !== String(serviceFilter)) return false
      if (!query) return true
      return Object.values(row)
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [currentConfig.rows, roleFilter, screenFilter, search, serviceFilter])

  function openCreate() {
    setSelectedRecord(null)
    setIsFormOpen(true)
  }

  function openEdit(row) {
    setSelectedRecord(row)
    setIsFormOpen(true)
  }

  function closeForm() {
    setSelectedRecord(null)
    setIsFormOpen(false)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    try {
      const payload =
        activeTab === 'screenshots'
          ? (() => {
              const formData = new FormData()
              Object.entries(values).forEach(([key, value]) => {
                if (key === 'image') {
                  if (value?.[0]) formData.append('image', value[0])
                  return
                }
                if (value == null || value === '') return
                if (typeof value === 'boolean') {
                  formData.append(key, value ? 'true' : 'false')
                  return
                }
                formData.append(key, String(value))
              })
              if (!values.placeholder_label && !values.static_path && !values.image?.[0]) {
                formData.append('placeholder_label', tx('صورة مطلوبة', 'Screenshot required'))
              }
              return formData
            })()
          : {
              ...values,
              display_order: Number(values.display_order || 0),
              max_length: Object.prototype.hasOwnProperty.call(values, 'max_length')
                ? values.max_length === '' ? null : Number(values.max_length || 0)
                : undefined,
            }
      if (!(payload instanceof FormData) && payload.max_length === undefined) {
        delete payload.max_length
      }
      if (selectedRecord?.id) {
        await currentConfig.update(selectedRecord.id, payload)
        toast(tx(`تم تحديث ${currentConfig.title}.`, `${currentConfig.title} updated.`), 'success')
      } else {
        await currentConfig.create(payload)
        toast(tx(`تم إنشاء ${currentConfig.title}.`, `${currentConfig.title} created.`), 'success')
      }
      currentConfig.reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      await currentConfig.remove(pendingDelete.id)
      toast(tx(`تم تعطيل ${currentConfig.title}.`, `${currentConfig.title} deactivated.`), 'success')
      currentConfig.reload()
      setPendingDelete(null)
      if (selectedRecord?.id === pendingDelete.id) closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleRestore() {
    if (!pendingRestore || !currentConfig.restore) return
    try {
      await currentConfig.restore(pendingRestore.id)
      toast(tx(`تمت استعادة ${currentConfig.title}.`, `${currentConfig.title} restored.`), 'success')
      currentConfig.reload()
      setPendingRestore(null)
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const loading = metadataLoading || permissionsLoading || servicesLoading || screensLoading || screenshotsLoading || fieldsLoading || actionsLoading || serviceGuidesLoading || workflowsLoading
  const previewValues = form.watch()
  const tableColumns = [
    ...currentConfig.columns,
    {
      key: 'status',
      label: tx('الحالة', 'Status'),
      render: (row) => (row.is_deleted ? tx('محذوف', 'Deleted') : row.is_active === false ? tx('غير نشط', 'Inactive') : tx('نشط', 'Active')),
    },
    {
      key: 'actions',
      label: tx('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore(row)} type="button">
              {tx('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEdit(row)} type="button">
                {tx('تعديل', 'Edit')}
              </button>
              <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => setPendingDelete(row)} type="button">
                {tx('تعطيل', 'Deactivate')}
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tx(
          'إدارة محتوى المساعدة السياقية للشاشات والحقول والأزرار والخدمات وخطوات المسار. تبقى المساعدة المعروضة للمستخدمين مفلترة حسب الدور والصلاحيات في الخادم.',
          'Manage contextual help content for screens, fields, buttons, services, and workflow steps. All user-facing help still stays filtered by backend role and permission checks.',
        )}
        eyebrow={tx('المساعدة داخل التطبيق', 'In-App Help')}
        icon={BookOpenText}
        title={isArabic ? 'إدارة دليل المستخدم' : 'Help Guide Management'}
        actions={
          <button className="btn-primary" onClick={openCreate} type="button">
            + {currentConfig.newLabel}
          </button>
        }
      />

      <div className="flex flex-wrap gap-3">
        {TABS.map((tab) => (
          <TabButton key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
        ))}
      </div>

      <section className="glass-panel space-y-4 p-6">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(180px,220px))]">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field ps-9" onChange={(event) => setSearch(event.target.value)} placeholder={tx('ابحث في محتوى المساعدة', 'Search help content')} value={search} />
          </div>
          <select className="field" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
            <option value="">{tx('كل الأدوار', 'All roles')}</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select className="field" onChange={(event) => setScreenFilter(event.target.value)} value={screenFilter}>
            <option value="">{tx('كل الشاشات', 'All screens')}</option>
            {screenOptions.map((screen) => (
              <option key={screen.screen_key} value={screen.screen_key}>
                {screen.label}
              </option>
            ))}
          </select>
          <select className="field" onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
            <option value="">{tx('كل الخدمات', 'All services')}</option>
            {serviceOptions.map((service) => (
              <option key={service.id} value={service.id}>
                {service.display_name}
              </option>
            ))}
          </select>
          <select className="field" onChange={(event) => setRecordStatus(event.target.value)} value={recordStatus}>
            <option value="active">{tx('النشطة', 'Active')}</option>
            <option value="deleted">{tx('المحذوفة', 'Deleted')}</option>
            <option value="all">{tx('الكل', 'All')}</option>
          </select>
        </div>

        <DataTable
          columns={tableColumns}
          emptyDescription={tx(`أضف أول ${currentConfig.title} لتوسيع الدليل داخل التطبيق.`, `Add the first ${currentConfig.title.toLowerCase()} to extend the in-app guide.`)}
          emptyTitle={tx(`لا توجد عناصر من نوع ${currentConfig.title}`, `No ${currentConfig.title.toLowerCase()}s found`)}
          loading={loading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={filteredRows}
        />
      </section>

      <FormModal
        description={tx(`أنشئ محتوى ${currentConfig.title} أو حدّثه، وراجع القيم الرئيسية، ثم احفظ بعد التأكد من الدور والشاشة.`, `Create or update ${currentConfig.title.toLowerCase()} content, preview the main values, and save when the role and screen filters are correct.`)}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {tx('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="help-guide-admin-form" type="submit">
              {selectedRecord ? tx('حفظ التغييرات', 'Save changes') : tx('إنشاء العنصر', 'Create entry')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="xl"
        title={selectedRecord ? currentConfig.summary(selectedRecord) : currentConfig.newLabel}
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form className="space-y-5" id="help-guide-admin-form" onSubmit={form.handleSubmit(handleSubmit)}>
            {currentConfig.fields.map((field) => {
              if (field.type === 'checkbox') {
                return (
                  <label key={field.name} className="flex items-center justify-between rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm font-medium text-ink">
                    <span>{field.label}</span>
                    <input className="h-4 w-4 accent-brand-600" type="checkbox" {...form.register(field.name)} />
                  </label>
                )
              }

              if (field.type === 'textarea') {
                return (
                  <Field key={field.name} hint={field.hint} label={field.label}>
                    <textarea className="field min-h-24" {...form.register(field.name)} />
                  </Field>
                )
              }

              if (field.type === 'file') {
                return (
                  <Field key={field.name} hint={field.hint} label={field.label}>
                    <input accept="image/*" className="field" type="file" {...form.register(field.name)} />
                  </Field>
                )
              }

              if (field.type === 'select') {
                return (
                  <Field key={field.name} hint={field.hint} label={field.label}>
                    <select className="field" {...form.register(field.name)}>
                      <option value="">{field.optional ? tx('اختياري', 'Optional') : tx('اختر قيمة', 'Choose value')}</option>
                      {(field.options || []).map((option) => (
                        <option key={option[field.optionValue]} value={option[field.optionValue]}>
                          {option[field.optionLabel]}
                        </option>
                      ))}
                    </select>
                  </Field>
                )
              }

              return (
                <Field key={field.name} hint={field.hint} label={field.label}>
                  <input className="field" type={field.type || 'text'} {...form.register(field.name)} />
                </Field>
              )
            })}
          </form>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-ink">{tx('ملخص المعاينة', 'Preview Summary')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {tx(
                  'هذه المعاينة مختصرة عمداً، وتساعد على التحقق من الشاشة والدور والخدمة والمسار والنص الرئيسي قبل الحفظ.',
                  'This preview is intentionally compact. It helps verify the target screen, role, service, workflow, and the main help wording before saving.',
                )}
              </p>
            </div>

            <div className="space-y-3 rounded-[28px] border border-border bg-slate-50/70 p-5 text-sm leading-7 text-slate-600">
              <div className="flex flex-wrap gap-2">
                {previewValues.screen_key ? (
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{screenLabel(previewValues.screen_key)}</span>
                ) : null}
                {previewValues.role ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {roleOptions.find((item) => item.value === previewValues.role)?.label || previewValues.role}
                  </span>
                ) : null}
                {previewValues.current_status || previewValues.workflow_status ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {previewValues.current_status || previewValues.workflow_status}
                  </span>
                ) : null}
              </div>
              <p className="text-lg font-bold text-ink">
                {previewValues.title || previewValues.field_label || previewValues.button_label || previewValues.workflow_key || currentConfig.title}
              </p>
              <p>{previewValues.short_description || previewValues.purpose || previewValues.description || previewValues.system_effect || tx('لا يوجد ملخص بعد.', 'No summary yet.')}</p>
              {previewValues.tooltip_text ? (
                <div className="rounded-2xl border border-border bg-white px-4 py-3 text-xs text-slate-600">{tx('التلميح', 'Tooltip')}: {previewValues.tooltip_text}</div>
              ) : null}
              {previewValues.warning_message ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">{tx('تحذير', 'Warning')}: {previewValues.warning_message}</div>
              ) : null}
              {previewValues.common_errors ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">{tx('الأخطاء الشائعة', 'Common errors')}: {previewValues.common_errors}</div>
              ) : null}
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel={tx('تعطيل العنصر', 'Deactivate entry')}
        description={tx(
          `سيُخفى "${pendingDelete ? currentConfig.summary(pendingDelete) : ''}" عن المستخدمين مع الاحتفاظ به في سجل التدقيق.`,
          `This will hide "${pendingDelete ? currentConfig.summary(pendingDelete) : ''}" from normal users while keeping it for audit history.`,
        )}
        loading={busy === 'delete'}
        onClose={() => setPendingDelete(null)}
        onConfirm={exclusive('delete', handleDelete)}
        open={!!pendingDelete}
        title={tx(`تعطيل ${currentConfig.title}`, `Deactivate ${currentConfig.title}`)}
        variant="danger"
      />
      <ConfirmModal
        confirmLabel={tx('استعادة', 'Restore')}
        description={tx(
          `ستتم إعادة "${pendingRestore ? currentConfig.summary(pendingRestore) : ''}" إلى محتوى المساعدة النشط.`,
          `This will restore "${pendingRestore ? currentConfig.summary(pendingRestore) : ''}" back to active help content.`,
        )}
        loading={busy === 'restore'}
        onClose={() => setPendingRestore(null)}
        onConfirm={exclusive('restore', handleRestore)}
        open={!!pendingRestore}
        title={tx(`استعادة ${currentConfig.title}`, `Restore ${currentConfig.title}`)}
      />
    </div>
  )
}

export default HelpGuideManagementPage
