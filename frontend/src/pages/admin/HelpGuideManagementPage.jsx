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
  const { isArabic } = useLanguage()
  const { toast } = useToast()
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
  const [roleFilter, setRoleFilter] = useState('')
  const [screenFilter, setScreenFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues: DEFAULT_VALUES.screens })

  const { data: metadata = { screens: [], roles: [], workflow_statuses: [] }, loading: metadataLoading } = useAsyncData(
    () => api.getHelpGuideMetadata(),
    [],
    { screens: [], roles: [], workflow_statuses: [] },
  )
  const { data: permissions = {}, loading: permissionsLoading } = useAsyncData(() => api.getAvailablePermissions(), [], {})
  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: screens = [], loading: screensLoading, reload: reloadScreens } = useAsyncData(() => api.getAdminHelpScreens(), [], [])
  const { data: screenshots = [], loading: screenshotsLoading, reload: reloadScreenshots } = useAsyncData(() => api.getAdminHelpScreenshots(), [], [])
  const { data: fields = [], loading: fieldsLoading, reload: reloadFields } = useAsyncData(() => api.getAdminHelpFields(), [], [])
  const { data: actions = [], loading: actionsLoading, reload: reloadActions } = useAsyncData(() => api.getAdminHelpActions(), [], [])
  const { data: serviceGuides = [], loading: serviceGuidesLoading, reload: reloadServiceGuides } = useAsyncData(
    () => api.getAdminHelpServices(),
    [],
    [],
  )
  const { data: workflows = [], loading: workflowsLoading, reload: reloadWorkflows } = useAsyncData(
    () => api.getAdminHelpWorkflows(),
    [],
    [],
  )

  const permissionOptions = useMemo(() => flattenPermissionOptions(permissions), [permissions])
  const screenOptions = useMemo(() => metadata.screens || [], [metadata.screens])
  const roleOptions = useMemo(() => metadata.roles || [], [metadata.roles])
  const categoryOptions = useMemo(() => metadata.categories || [], [metadata.categories])
  const workflowOptions = useMemo(() => metadata.workflow_statuses || [], [metadata.workflow_statuses])

  const entityConfig = useMemo(
    () => ({
      screens: {
        title: 'Screen guide',
        rows: screens,
        reload: reloadScreens,
        create: api.createAdminHelpScreen,
        update: api.updateAdminHelpScreen,
        remove: api.deleteAdminHelpScreen,
        summary: (row) => row.title,
        columns: [
          { key: 'title', label: 'Title' },
          { key: 'category', label: 'Category' },
          { key: 'screen_label', label: 'Screen', render: (row) => row.screen_label || getHelpScreenLabel(row.screen_key) },
          { key: 'role_label', label: 'Role', render: (row) => row.role_label || row.role },
          { key: 'workflow_status_label', label: 'Workflow', render: (row) => row.workflow_status_label || row.workflow_status || 'General' },
          { key: 'display_order', label: 'Order' },
        ],
        fields: [
          { name: 'slug', label: 'Slug', type: 'text' },
          { name: 'screen_key', label: 'Screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'role', label: 'Role', type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'category', label: 'Category', type: 'select', options: categoryOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: 'Permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'workflow_status', label: 'Workflow status', type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'title', label: 'Title', type: 'text' },
          { name: 'route_path', label: 'Route path', type: 'text' },
          { name: 'short_description', label: 'Short description', type: 'textarea' },
          { name: 'purpose', label: 'Purpose', type: 'textarea' },
          { name: 'before_you_start', label: 'Before you start', type: 'textarea' },
          { name: 'step_by_step_guide', label: 'Steps', type: 'textarea', hint: 'One step per line.' },
          { name: 'when_to_use', label: 'When to use', type: 'textarea' },
          { name: 'main_workflow', label: 'Main workflow', type: 'text' },
          { name: 'expected_result', label: 'Expected result', type: 'textarea' },
          { name: 'common_errors', label: 'Common problems', type: 'textarea' },
          { name: 'next_step', label: 'Next step', type: 'textarea' },
          { name: 'troubleshooting', label: 'Troubleshooting', type: 'textarea' },
          { name: 'related_screen', label: 'Related screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label', optional: true },
          { name: 'related_permission', label: 'Related permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'search_keywords', label: 'Search keywords', type: 'text' },
          { name: 'internal_notes', label: 'Internal notes', type: 'textarea' },
          { name: 'is_quick_link', label: 'Show as quick link', type: 'checkbox' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
      screenshots: {
        title: 'Screenshot',
        rows: screenshots,
        reload: reloadScreenshots,
        create: api.createAdminHelpScreenshot,
        update: api.updateAdminHelpScreenshot,
        remove: api.deleteAdminHelpScreenshot,
        summary: (row) => row.caption,
        columns: [
          { key: 'caption', label: 'Caption' },
          { key: 'help_guide_title', label: 'Guide' },
          { key: 'step_reference', label: 'Step' },
          { key: 'display_order', label: 'Order' },
        ],
        fields: [
          { name: 'help_guide', label: 'Guide page', type: 'select', options: screens, optionValue: 'id', optionLabel: 'title' },
          { name: 'caption', label: 'Caption', type: 'text' },
          { name: 'image', label: 'Upload image', type: 'file', hint: 'Optional. Use this for real screenshots; keep blank when using a placeholder or static path.' },
          { name: 'static_path', label: 'Static path', type: 'text' },
          { name: 'placeholder_label', label: 'Placeholder label', type: 'text' },
          { name: 'alt_text', label: 'Alt text', type: 'text' },
          { name: 'step_reference', label: 'Step reference', type: 'text' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
      fields: {
        title: 'Field guide',
        rows: fields,
        reload: reloadFields,
        create: api.createAdminHelpField,
        update: api.updateAdminHelpField,
        remove: api.deleteAdminHelpField,
        summary: (row) => row.field_label,
        columns: [
          { key: 'field_label', label: 'Field' },
          { key: 'screen_label', label: 'Screen', render: (row) => row.screen_label || getHelpScreenLabel(row.screen_key) },
          { key: 'role_label', label: 'Role', render: (row) => row.role_label || row.role },
          { key: 'required', label: 'Required', render: (row) => (row.required ? 'Yes' : 'Optional') },
          { key: 'display_order', label: 'Order' },
        ],
        fields: [
          { name: 'screen_key', label: 'Screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'field_key', label: 'Field key', type: 'text' },
          { name: 'field_label', label: 'Field label', type: 'text' },
          { name: 'model_name', label: 'Model name', type: 'text' },
          { name: 'model_field', label: 'Model field', type: 'text' },
          { name: 'role', label: 'Role', type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: 'Permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'purpose', label: 'Purpose', type: 'textarea' },
          { name: 'required', label: 'Required', type: 'checkbox' },
          { name: 'editable', label: 'Editable', type: 'checkbox' },
          { name: 'data_type', label: 'Data type', type: 'text' },
          { name: 'accepted_format', label: 'Accepted format', type: 'textarea' },
          { name: 'valid_example', label: 'Valid example', type: 'text' },
          { name: 'invalid_example', label: 'Invalid example', type: 'text' },
          { name: 'validation_rule', label: 'Validation rule', type: 'textarea' },
          { name: 'error_explanation', label: 'Error explanation', type: 'textarea' },
          { name: 'placeholder_text', label: 'Placeholder text', type: 'text' },
          { name: 'tooltip_text', label: 'Tooltip text', type: 'textarea' },
          { name: 'default_value', label: 'Default value', type: 'text' },
          { name: 'max_length', label: 'Max length', type: 'number' },
          { name: 'who_can_edit', label: 'Who can edit', type: 'textarea' },
          { name: 'locked_when', label: 'Locked when', type: 'textarea' },
          { name: 'search_keywords', label: 'Search keywords', type: 'text' },
          { name: 'internal_notes', label: 'Internal notes', type: 'textarea' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
      actions: {
        title: 'Action guide',
        rows: actions,
        reload: reloadActions,
        create: api.createAdminHelpAction,
        update: api.updateAdminHelpAction,
        remove: api.deleteAdminHelpAction,
        summary: (row) => row.button_label,
        columns: [
          { key: 'button_label', label: 'Button' },
          { key: 'screen_label', label: 'Screen', render: (row) => row.screen_label || getHelpScreenLabel(row.screen_key) },
          { key: 'role_label', label: 'Role', render: (row) => row.role_label || row.role },
          { key: 'status_before_label', label: 'Before', render: (row) => row.status_before_label || row.status_before || 'Any' },
          { key: 'status_after_label', label: 'After', render: (row) => row.status_after_label || row.status_after || 'No change' },
        ],
        fields: [
          { name: 'screen_key', label: 'Screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'button_key', label: 'Button key', type: 'text' },
          { name: 'button_label', label: 'Button label', type: 'text' },
          { name: 'role', label: 'Role', type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: 'Permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'status_before', label: 'Status before', type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'status_after', label: 'Status after', type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'purpose', label: 'Purpose', type: 'textarea' },
          { name: 'when_to_use', label: 'When to use', type: 'textarea' },
          { name: 'action_result', label: 'Action result', type: 'textarea' },
          { name: 'notification_triggered', label: 'Notification effect', type: 'textarea' },
          { name: 'warning_message', label: 'Warning', type: 'textarea' },
          { name: 'common_errors', label: 'Common errors', type: 'textarea' },
          { name: 'safety_rule', label: 'Safety rule', type: 'textarea' },
          { name: 'confirmation_message', label: 'Confirmation message', type: 'textarea' },
          { name: 'search_keywords', label: 'Search keywords', type: 'text' },
          { name: 'internal_notes', label: 'Internal notes', type: 'textarea' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
      services: {
        title: 'Service guide',
        rows: serviceGuides,
        reload: reloadServiceGuides,
        create: api.createAdminHelpService,
        update: api.updateAdminHelpService,
        remove: api.deleteAdminHelpService,
        summary: (row) => row.service_name || row.service,
        columns: [
          { key: 'service_name', label: 'Service' },
          { key: 'category_name', label: 'Category' },
          { key: 'role_label', label: 'Role', render: (row) => row.role_label || row.role },
          { key: 'display_order', label: 'Order' },
        ],
        fields: [
          { name: 'service', label: 'Service', type: 'select', options: services, optionValue: 'id', optionLabel: 'name_ar' },
          { name: 'screen_key', label: 'Screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label', optional: true },
          { name: 'role', label: 'Role', type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: 'Permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'who_can_use', label: 'Who can use', type: 'textarea' },
          { name: 'required_documents', label: 'Required documents', type: 'textarea' },
          { name: 'optional_documents', label: 'Optional documents', type: 'textarea' },
          { name: 'required_data', label: 'Required data', type: 'textarea' },
          { name: 'prerequisites', label: 'Prerequisites', type: 'textarea' },
          { name: 'related_services', label: 'Related services', type: 'textarea' },
          { name: 'workflow_summary', label: 'Workflow summary', type: 'textarea' },
          { name: 'final_output', label: 'Final output', type: 'textarea' },
          { name: 'common_errors', label: 'Common errors', type: 'textarea' },
          { name: 'common_rejection_reasons', label: 'Common rejection reasons', type: 'textarea' },
          { name: 'common_missing_document_reasons', label: 'Missing document reasons', type: 'textarea' },
          { name: 'estimated_processing_time', label: 'Estimated processing time', type: 'text' },
          { name: 'price_rule', label: 'Price rule', type: 'textarea' },
          { name: 'provider_requirement', label: 'Provider requirement', type: 'textarea' },
          { name: 'search_keywords', label: 'Search keywords', type: 'text' },
          { name: 'internal_notes', label: 'Internal notes', type: 'textarea' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
      workflows: {
        title: 'Workflow guide',
        rows: workflows,
        reload: reloadWorkflows,
        create: api.createAdminHelpWorkflow,
        update: api.updateAdminHelpWorkflow,
        remove: api.deleteAdminHelpWorkflow,
        summary: (row) => row.workflow_key,
        columns: [
          { key: 'workflow_key', label: 'Workflow key' },
          { key: 'screen_label', label: 'Screen', render: (row) => row.screen_label || getHelpScreenLabel(row.screen_key) },
          { key: 'current_status_label', label: 'Current status', render: (row) => row.current_status_label || row.current_status || 'Any' },
          { key: 'next_status_label', label: 'Next status', render: (row) => row.next_status_label || row.next_status || 'No change' },
          { key: 'role_label', label: 'Role', render: (row) => row.role_label || row.role },
        ],
        fields: [
          { name: 'screen_key', label: 'Screen', type: 'select', options: screenOptions, optionValue: 'screen_key', optionLabel: 'label' },
          { name: 'workflow_key', label: 'Workflow key', type: 'text' },
          { name: 'current_status', label: 'Current status', type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'action_key', label: 'Action key', type: 'text' },
          { name: 'action_label', label: 'Action label', type: 'text' },
          { name: 'button_key', label: 'Button key', type: 'text' },
          { name: 'role', label: 'Role', type: 'select', options: roleOptions, optionValue: 'value', optionLabel: 'label' },
          { name: 'permission_key', label: 'Permission', type: 'select', options: permissionOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'next_status', label: 'Next status', type: 'select', options: workflowOptions, optionValue: 'value', optionLabel: 'label', optional: true },
          { name: 'required_fields', label: 'Required fields', type: 'textarea' },
          { name: 'system_effect', label: 'System effect', type: 'textarea' },
          { name: 'notification_effect', label: 'Notification effect', type: 'textarea' },
          { name: 'blocked_cases', label: 'Blocked cases', type: 'textarea' },
          { name: 'correction_process', label: 'Correction process', type: 'textarea' },
          { name: 'search_keywords', label: 'Search keywords', type: 'text' },
          { name: 'internal_notes', label: 'Internal notes', type: 'textarea' },
          { name: 'display_order', label: 'Display order', type: 'number' },
          { name: 'is_active', label: 'Active', type: 'checkbox' },
        ],
      },
    }),
    [
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
      services,
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
                formData.append('placeholder_label', 'Screenshot required')
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
        toast(`${currentConfig.title} updated.`, 'success')
      } else {
        await currentConfig.create(payload)
        toast(`${currentConfig.title} created.`, 'success')
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
      toast(`${currentConfig.title} deactivated.`, 'success')
      currentConfig.reload()
      setPendingDelete(null)
      if (selectedRecord?.id === pendingDelete.id) closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const loading = metadataLoading || permissionsLoading || servicesLoading || screensLoading || screenshotsLoading || fieldsLoading || actionsLoading || serviceGuidesLoading || workflowsLoading
  const previewValues = form.watch()

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="Manage contextual help content for screens, fields, buttons, services, and workflow steps. All user-facing help still stays filtered by backend role and permission checks."
        eyebrow="In-App Help"
        icon={BookOpenText}
        title={isArabic ? 'إدارة دليل المستخدم' : 'Help Guide Management'}
        actions={
          <button className="btn-primary" onClick={openCreate} type="button">
            + New {currentConfig.title}
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
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field pr-9" onChange={(event) => setSearch(event.target.value)} placeholder="Search help content" value={search} />
          </div>
          <select className="field" onChange={(event) => setRoleFilter(event.target.value)} value={roleFilter}>
            <option value="">All roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <select className="field" onChange={(event) => setScreenFilter(event.target.value)} value={screenFilter}>
            <option value="">All screens</option>
            {screenOptions.map((screen) => (
              <option key={screen.screen_key} value={screen.screen_key}>
                {screen.label}
              </option>
            ))}
          </select>
          <select className="field" onChange={(event) => setServiceFilter(event.target.value)} value={serviceFilter}>
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name_ar}
              </option>
            ))}
          </select>
        </div>

        <DataTable
          columns={[
            ...currentConfig.columns,
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEdit(row)} type="button">
                    Edit
                  </button>
                  <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => setPendingDelete(row)} type="button">
                    Deactivate
                  </button>
                </div>
              ),
            },
          ]}
          emptyDescription={`Add the first ${currentConfig.title.toLowerCase()} to extend the in-app guide.`}
          emptyTitle={`No ${currentConfig.title.toLowerCase()}s found`}
          loading={loading}
          rows={filteredRows}
        />
      </section>

      <FormModal
        description={`Create or update ${currentConfig.title.toLowerCase()} content, preview the main values, and save when the role and screen filters are correct.`}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              Cancel
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="help-guide-admin-form" type="submit">
              {selectedRecord ? 'Save changes' : 'Create entry'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="xl"
        title={selectedRecord ? currentConfig.summary(selectedRecord) : `New ${currentConfig.title}`}
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
                      <option value="">{field.optional ? 'Optional' : 'Choose value'}</option>
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
              <p className="text-sm font-bold text-ink">Preview Summary</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                This preview is intentionally compact. It helps verify the target screen, role, service, workflow, and the main help wording before saving.
              </p>
            </div>

            <div className="space-y-3 rounded-[28px] border border-border bg-slate-50/70 p-5 text-sm leading-7 text-slate-600">
              <div className="flex flex-wrap gap-2">
                {previewValues.screen_key ? (
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{getHelpScreenLabel(previewValues.screen_key)}</span>
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
              <p>{previewValues.short_description || previewValues.purpose || previewValues.description || previewValues.system_effect || 'No summary yet.'}</p>
              {previewValues.tooltip_text ? (
                <div className="rounded-2xl border border-border bg-white px-4 py-3 text-xs text-slate-600">Tooltip: {previewValues.tooltip_text}</div>
              ) : null}
              {previewValues.warning_message ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">Warning: {previewValues.warning_message}</div>
              ) : null}
              {previewValues.common_errors ? (
                <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs text-danger">Common errors: {previewValues.common_errors}</div>
              ) : null}
            </div>
          </div>
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel="Deactivate entry"
        description={`This will hide "${pendingDelete ? currentConfig.summary(pendingDelete) : ''}" from normal users while keeping it for audit history.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        open={!!pendingDelete}
        title={`Deactivate ${currentConfig.title}`}
        variant="danger"
      />
    </div>
  )
}

export default HelpGuideManagementPage
