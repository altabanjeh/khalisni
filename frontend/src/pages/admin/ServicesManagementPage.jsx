import { Files, FolderTree, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import AdminSoftDeleteModal from '../../components/AdminSoftDeleteModal'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { generateCatalogSlug, suggestCategoryIcon } from '../../utils/catalogDefaults'

const defaultCategoryValues = {
  name_ar: '',
  name_en: '',
  slug: '',
  description_ar: '',
  description_en: '',
  icon: '',
  display_order: 0,
  is_active: true,
}

const defaultServiceValues = {
  category_id: '',
  name_ar: '',
  name_en: '',
  slug: '',
  short_description_ar: '',
  short_description_en: '',
  description_ar: '',
  description_en: '',
  required_information_schema_text: '[]',
  required_document_ids: [],
  terms_ar: '',
  terms_en: '',
  base_price: '0.00',
  government_fee: '0.00',
  service_fee: '0.00',
  show_total_price_public: true,
  show_government_fee_public: false,
  show_company_fee_public: false,
  public_price_note_ar: '',
  public_price_note_en: '',
  estimated_duration: 1,
  estimated_duration_unit: 'days',
  delivery_time_mode: 'duration',
  delivery_start_date: '',
  delivery_end_date: '',
  delivery_note_ar: '',
  delivery_note_en: '',
  price_type: 'fixed',
  is_online: true,
  provider_required: true,
  requires_manual_review: true,
  requires_appointment: false,
  is_featured: false,
  is_active: true,
  show_on_public_site: true,
  display_order: 0,
}

const defaultDefinitionValues = {
  code: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  description_en: '',
  allowed_extensions_text: '.pdf, .jpg, .png',
  max_file_size: 10485760,
  sort_order: 0,
  is_active: true,
}

function CheckboxField({ label, registration }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
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

function SectionCard({ icon: Icon, title, description, action, children }) {
  return (
    <section className="glass-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="icon-chip">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            <p className="text-sm leading-7 text-slate-600">{description}</p>
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function toExtensionArray(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const schemaFieldTypeOptions = [
  { value: 'text', label: 'Ù†Øµ Ù‚ØµÙŠØ±' },
  { value: 'textarea', label: 'Ù†Øµ Ø·ÙˆÙŠÙ„' },
  { value: 'number', label: 'Ø±Ù‚Ù…' },
  { value: 'email', label: 'Ø¨Ø±ÙŠØ¯ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' },
  { value: 'tel', label: 'Ø±Ù‚Ù… Ù‡Ø§ØªÙ' },
  { value: 'date', label: 'ØªØ§Ø±ÙŠØ®' },
  { value: 'select', label: 'Ù‚Ø§Ø¦Ù…Ø© Ø®ÙŠØ§Ø±Ø§Øª' },
  { value: 'checkbox', label: 'ØµØ­ / Ø®Ø·Ø£' },
]

let schemaFieldRowCounter = 0

function nextSchemaFieldRowId() {
  schemaFieldRowCounter += 1
  return `schema-field-${schemaFieldRowCounter}`
}

function normalizeSchemaFieldType(value) {
  const nextValue = String(value || 'text').trim().toLowerCase()
  if (schemaFieldTypeOptions.some((option) => option.value === nextValue)) {
    return nextValue
  }
  return 'text'
}

function serializeSchemaOptions(value) {
  if (!Array.isArray(value)) return ''

  return value
    .map((option) => {
      if (option && typeof option === 'object') {
        return String(option.label ?? option.value ?? option.name ?? '').trim()
      }
      return String(option || '').trim()
    })
    .filter(Boolean)
    .join('\n')
}

function parseSchemaOptionsText(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function sanitizeSchemaFieldToken(value, fallback) {
  const nextValue = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return nextValue || fallback
}

function createSchemaFieldRow(field = {}) {
  return {
    row_id: nextSchemaFieldRowId(),
    technical_name: String(field.name ?? field.key ?? field.field ?? '').trim(),
    label_ar: String(field.label_ar ?? field.name_ar ?? '').trim(),
    label: String(field.label ?? field.title ?? '').trim(),
    type: normalizeSchemaFieldType(field.type ?? field.field_type ?? field.input_type),
    required: Boolean(field.required),
    placeholder: String(field.placeholder ?? '').trim(),
    help_text: String(field.help_text ?? field.description ?? '').trim(),
    options_text: serializeSchemaOptions(field.options ?? field.choices ?? field.values),
  }
}

function isSchemaFieldRowBlank(field) {
  return (
    !field.technical_name.trim() &&
    !field.label_ar.trim() &&
    !field.label.trim() &&
    !field.placeholder.trim() &&
    !field.help_text.trim() &&
    !field.options_text.trim() &&
    !field.required &&
    normalizeSchemaFieldType(field.type) === 'text'
  )
}

function getGeneratedSchemaFieldName(field, index) {
  if (field.technical_name.trim()) {
    return sanitizeSchemaFieldToken(field.technical_name, `field_${index + 1}`)
  }

  return sanitizeSchemaFieldToken(field.label || field.placeholder || `field_${index + 1}`, `field_${index + 1}`)
}

function validateSchemaFieldRows(fields) {
  const errors = []

  fields.forEach((field, index) => {
    if (isSchemaFieldRowBlank(field)) return

    if (!field.label_ar.trim() && !field.label.trim()) {
      errors.push(`Ø§Ù„Ø­Ù‚Ù„ ${index + 1}: Ø£Ø¶Ù Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø°ÙŠ Ø³ÙŠØ¸Ù‡Ø± Ù„Ù„Ù…Ø³ØªØ®Ø¯Ù….`)
    }

    if (normalizeSchemaFieldType(field.type) === 'select' && !parseSchemaOptionsText(field.options_text).length) {
      errors.push(`Ø§Ù„Ø­Ù‚Ù„ ${index + 1}: Ø£Ø¶Ù Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©ØŒ ÙƒÙ„ Ø®ÙŠØ§Ø± ÙÙŠ Ø³Ø·Ø± Ù…Ù†ÙØµÙ„.`)
    }
  })

  return errors
}

function buildRequiredInformationSchema(fields) {
  return fields
    .filter((field) => !isSchemaFieldRowBlank(field))
    .map((field, index) => {
      const type = normalizeSchemaFieldType(field.type)
      const payload = {
        name: getGeneratedSchemaFieldName(field, index),
        type,
        required: Boolean(field.required),
      }

      if (field.label_ar.trim()) payload.label_ar = field.label_ar.trim()
      if (field.label.trim()) payload.label = field.label.trim()
      if (field.placeholder.trim()) payload.placeholder = field.placeholder.trim()
      if (field.help_text.trim()) payload.help_text = field.help_text.trim()
      if (type === 'select') payload.options = parseSchemaOptionsText(field.options_text)

      return payload
    })
}

function ServiceSchemaBuilder({ fields, errorMessages, onAddField, onChangeField, onRemoveField }) {
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-ink">Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„</h3>
          <p className="text-sm leading-6 text-slate-600">
            Ø£Ø¶Ù Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø§Ù„ØªÙŠ Ø³ÙŠÙ…Ù„Ø¤Ù‡Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ù†Ø¯ Ø·Ù„Ø¨ Ø§Ù„Ø®Ø¯Ù…Ø©ØŒ ÙˆØ³ÙŠØªÙ… ØªÙˆÙ„ÙŠØ¯ JSON ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹ ÙÙŠ Ø§Ù„Ø®Ù„ÙÙŠØ©.
          </p>
        </div>
        <button className="btn-secondary whitespace-nowrap" onClick={onAddField} type="button">
          + Ø­Ù‚Ù„ Ù…Ø·Ù„ÙˆØ¨
        </button>
      </div>

      {fields.length ? (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.row_id} className="space-y-4 rounded-[1.5rem] border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Ø§Ù„Ø­Ù‚Ù„ {index + 1}</p>
                  <p className="text-xs text-slate-500">
                    Ø§Ù„Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ù…ÙˆÙ„Ù‘Ø¯: <span className="font-mono text-ink">{getGeneratedSchemaFieldName(field, index)}</span>
                  </p>
                </div>
                <button
                  className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                  onClick={() => onRemoveField(field.row_id)}
                  type="button"
                >
                  Ø­Ø°Ù Ø§Ù„Ø­Ù‚Ù„
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¸Ø§Ù‡Ø± Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label_ar', event.target.value)}
                    placeholder="Ù…Ø«Ø§Ù„: Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ø²"
                    value={field.label_ar}
                  />
                </Field>
                <Field hint="ÙŠÙØ³ØªØ®Ø¯Ù… Ø£ÙŠØ¶Ø§Ù‹ Ù„ØªÙˆÙ„ÙŠØ¯ Ù…Ø¹Ø±Ù‘Ù Ù…Ù†Ø§Ø³Ø¨ Ø¥Ø°Ø§ ØªÙØ±Ùƒ Ø§Ù„Ø­Ù‚Ù„ Ø§Ù„ØªÙ‚Ù†ÙŠ ÙØ§Ø±ØºØ§Ù‹." label="Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ø¸Ø§Ù‡Ø± Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label', event.target.value)}
                    placeholder="Passport number"
                    value={field.label}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field hint="Ø§Ø®ØªÙŠØ§Ø±ÙŠ. Ø¥Ù† ØªÙØ±Ùƒ ÙØ§Ø±ØºØ§Ù‹ Ø³Ù†ÙˆÙ„Ù‘Ø¯Ù‡ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹." label="Ø§Ù„Ù…Ø¹Ø±Ù‘Ù Ø§Ù„ØªÙ‚Ù†ÙŠ">
                  <input
                    className="field font-mono"
                    dir="ltr"
                    onChange={(event) => onChangeField(field.row_id, 'technical_name', event.target.value)}
                    placeholder="passport_number"
                    value={field.technical_name}
                  />
                </Field>
                <Field label="Ù†ÙˆØ¹ Ø§Ù„Ø­Ù‚Ù„">
                  <select className="field" onChange={(event) => onChangeField(field.row_id, 'type', event.target.value)} value={field.type}>
                    {schemaFieldTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ù†Øµ ØªÙˆØ¶ÙŠØ­ÙŠ">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'placeholder', event.target.value)}
                    placeholder="Ø£Ø¯Ø®Ù„ Ø±Ù‚Ù… Ø§Ù„Ø¬ÙˆØ§Ø²"
                    value={field.placeholder}
                  />
                </Field>
                <Field label="Ø´Ø±Ø­ Ø¥Ø¶Ø§ÙÙŠ">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'help_text', event.target.value)}
                    value={field.help_text}
                  />
                </Field>
              </div>

              {field.type === 'select' ? (
                <Field hint="ÙƒÙ„ Ø®ÙŠØ§Ø± ÙÙŠ Ø³Ø·Ø± Ù…Ù†ÙØµÙ„." label="Ø®ÙŠØ§Ø±Ø§Øª Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©">
                  <textarea
                    className="field min-h-28"
                    onChange={(event) => onChangeField(field.row_id, 'options_text', event.target.value)}
                    value={field.options_text}
                  />
                </Field>
              ) : null}

              <CheckboxField
                label="Ø§Ù„Ø­Ù‚Ù„ Ù…Ø·Ù„ÙˆØ¨ Ø¹Ù†Ø¯ Ø§Ù„Ø·Ù„Ø¨"
                registration={{
                  checked: field.required,
                  onChange: (event) => onChangeField(field.row_id, 'required', event.target.checked),
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-white px-4 py-6 text-sm text-slate-500">
          Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„Ø®Ø¯Ù…Ø© ØªØ­ØªØ§Ø¬ Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ø¶Ø§ÙÙŠØ© Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„ ÙØ£Ø¶ÙÙ‡Ø§ Ù…Ù† Ù‡Ù†Ø§. Ø¥Ø°Ø§ Ù„Ù… ØªØ­ØªØ¬ Ø£ÙŠ Ø­Ù‚ÙˆÙ„ Ø¥Ø¶Ø§ÙÙŠØ© Ø³ÙŠØ¨Ù‚Ù‰ JSON ÙØ§Ø±ØºØ§Ù‹.
        </div>
      )}

      {errorMessages.length ? (
        <div className="space-y-1 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {errorMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function normalizeSelectedIds(value) {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (value == null || value === '') return []
  return [String(value)]
}

function formatDefinitionSummary(definition) {
  const extensions = (definition.allowed_extensions || []).join(', ')
  if (!extensions) return 'Ø¨Ø¯ÙˆÙ† Ø§Ù…ØªØ¯Ø§Ø¯Ø§Øª Ù…Ø®ØµØµØ©'
  return `${extensions} | ${definition.max_file_size || 0} bytes`
}

function ServicesManagementPage() {
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const [serviceFilterCategory, setServiceFilterCategory] = useState('')
  const [categoryStatus, setCategoryStatus] = useState('active')
  const [serviceStatus, setServiceStatus] = useState('active')
  const [definitionStatus, setDefinitionStatus] = useState('active')
  const { data: categories = [], loading: categoriesLoading, reload: reloadCategories } = useAsyncData(
    () => api.getAdminCategories({ status: categoryStatus }),
    [categoryStatus],
    [],
  )
  const { data: services = [], loading: servicesLoading, reload: reloadServices } = useAsyncData(
    () => api.getAdminServices({ ...(serviceFilterCategory ? { category: serviceFilterCategory } : {}), status: serviceStatus }),
    [serviceFilterCategory, serviceStatus],
    [],
  )
  const { data: definitions = [], loading: definitionsLoading, reload: reloadDefinitions } = useAsyncData(
    () => api.getAdminRequiredDocumentDefinitions({ status: definitionStatus }),
    [definitionStatus],
    [],
  )

  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serviceSchemaFields, setServiceSchemaFields] = useState([])
  const [serviceSchemaErrors, setServiceSchemaErrors] = useState([])
  const [categorySlugEdited, setCategorySlugEdited] = useState(false)
  const [categoryIconEdited, setCategoryIconEdited] = useState(false)
  const [serviceSlugEdited, setServiceSlugEdited] = useState(false)

  const categoryForm = useForm({ defaultValues: defaultCategoryValues })
  const serviceForm = useForm({ defaultValues: defaultServiceValues })
  const definitionForm = useForm({ defaultValues: defaultDefinitionValues })
  const categoryNameAr = categoryForm.watch('name_ar')
  const categoryNameEn = categoryForm.watch('name_en')
  const serviceNameAr = serviceForm.watch('name_ar')
  const serviceNameEn = serviceForm.watch('name_en')
  const deliveryTimeMode = serviceForm.watch('delivery_time_mode')
  const selectedRequiredDocumentIds = normalizeSelectedIds(serviceForm.watch('required_document_ids'))

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId],
  )
  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId],
  )
  const selectedDefinition = useMemo(
    () => definitions.find((item) => String(item.id) === String(selectedDefinitionId)) || null,
    [definitions, selectedDefinitionId],
  )
  const schemaPreviewJson = useMemo(() => JSON.stringify(buildRequiredInformationSchema(serviceSchemaFields), null, 2), [serviceSchemaFields])

  useEffect(() => {
    categoryForm.reset(
      selectedCategory
        ? {
            name_ar: selectedCategory.name_ar || '',
            name_en: selectedCategory.name_en || '',
            slug: selectedCategory.slug || '',
            description_ar: selectedCategory.description_ar || '',
            description_en: selectedCategory.description_en || '',
            icon: selectedCategory.icon || '',
            display_order: selectedCategory.display_order ?? 0,
            is_active: Boolean(selectedCategory.is_active),
          }
        : defaultCategoryValues,
    )
    setCategorySlugEdited(Boolean(selectedCategory))
    setCategoryIconEdited(Boolean(selectedCategory))
  }, [categoryForm, selectedCategory])

  useEffect(() => {
    serviceForm.reset(
      selectedService
        ? {
            category_id: selectedService.category?.id || '',
            name_ar: selectedService.name_ar || '',
            name_en: selectedService.name_en || '',
            slug: selectedService.slug || '',
            short_description_ar: selectedService.short_description_ar || '',
            short_description_en: selectedService.short_description_en || '',
            description_ar: selectedService.description_ar || '',
            description_en: selectedService.description_en || '',
            required_information_schema_text: JSON.stringify(selectedService.required_information_schema ?? [], null, 2),
            required_document_ids: (selectedService.required_documents || []).map(
              (item) => item.document_definition?.id || item.document_definition_id || item.definition_id,
            ).filter(Boolean),
            terms_ar: selectedService.terms_ar || '',
            terms_en: selectedService.terms_en || '',
            base_price: selectedService.base_price ?? '0.00',
            government_fee: selectedService.government_fee ?? '0.00',
            service_fee: selectedService.service_fee ?? '0.00',
            show_total_price_public: Boolean(selectedService.show_total_price_public ?? true),
            show_government_fee_public: Boolean(selectedService.show_government_fee_public),
            show_company_fee_public: Boolean(selectedService.show_company_fee_public),
            public_price_note_ar: selectedService.public_price_note_ar || '',
            public_price_note_en: selectedService.public_price_note_en || '',
            estimated_duration: selectedService.estimated_duration ?? 1,
            estimated_duration_unit: selectedService.estimated_duration_unit || 'days',
            delivery_time_mode: selectedService.delivery_time_mode || 'duration',
            delivery_start_date: selectedService.delivery_start_date || '',
            delivery_end_date: selectedService.delivery_end_date || '',
            delivery_note_ar: selectedService.delivery_note_ar || '',
            delivery_note_en: selectedService.delivery_note_en || '',
            price_type: selectedService.price_type || 'fixed',
            is_online: Boolean(selectedService.is_online),
            provider_required: Boolean(selectedService.provider_required),
            requires_manual_review: Boolean(selectedService.requires_manual_review),
            requires_appointment: Boolean(selectedService.requires_appointment),
            is_featured: Boolean(selectedService.is_featured),
            is_active: Boolean(selectedService.is_active),
            show_on_public_site: Boolean(selectedService.show_on_public_site ?? true),
            display_order: selectedService.display_order ?? 0,
          }
        : defaultServiceValues,
    )
    setServiceSlugEdited(Boolean(selectedService))
    setServiceSchemaFields(
      Array.isArray(selectedService?.required_information_schema)
        ? selectedService.required_information_schema.map((field) => createSchemaFieldRow(field))
        : [],
    )
    setServiceSchemaErrors([])
  }, [selectedService, serviceForm])

  useEffect(() => {
    definitionForm.reset(
      selectedDefinition
        ? {
            code: selectedDefinition.code || '',
            name_ar: selectedDefinition.name_ar || '',
            name_en: selectedDefinition.name_en || '',
            description_ar: selectedDefinition.description_ar || '',
            description_en: selectedDefinition.description_en || '',
            allowed_extensions_text: (selectedDefinition.allowed_extensions || []).join(', '),
            max_file_size: selectedDefinition.max_file_size ?? 10485760,
            sort_order: selectedDefinition.sort_order ?? 0,
            is_active: Boolean(selectedDefinition.is_active),
          }
        : defaultDefinitionValues,
    )
  }, [definitionForm, selectedDefinition])

  useEffect(() => {
    if (selectedCategory || categorySlugEdited) return
    categoryForm.setValue('slug', generateCatalogSlug([categoryNameEn, categoryNameAr], 'category'), { shouldDirty: false })
  }, [categoryForm, categoryNameAr, categoryNameEn, categorySlugEdited, selectedCategory])

  useEffect(() => {
    if (selectedCategory || categoryIconEdited) return
    categoryForm.setValue('icon', suggestCategoryIcon(categoryNameEn, categoryNameAr), { shouldDirty: false })
  }, [categoryForm, categoryIconEdited, categoryNameAr, categoryNameEn, selectedCategory])

  useEffect(() => {
    if (selectedService || serviceSlugEdited) return
    serviceForm.setValue('slug', generateCatalogSlug([serviceNameEn, serviceNameAr], 'service'), { shouldDirty: false })
  }, [selectedService, serviceForm, serviceNameAr, serviceNameEn, serviceSlugEdited])

  useEffect(() => {
    serviceForm.setValue('required_information_schema_text', schemaPreviewJson, {
      shouldDirty: false,
      shouldValidate: false,
    })
  }, [schemaPreviewJson, serviceForm])

  function closeModal() {
    setActiveModal(null)
    setSelectedCategoryId(null)
    setSelectedServiceId(null)
    setSelectedDefinitionId(null)
    setServiceSchemaFields([])
    setServiceSchemaErrors([])
    categoryForm.reset(defaultCategoryValues)
    serviceForm.reset(defaultServiceValues)
    definitionForm.reset(defaultDefinitionValues)
    setCategorySlugEdited(false)
    setCategoryIconEdited(false)
    setServiceSlugEdited(false)
  }

  function openCategoryForm(id = null) {
    setSelectedCategoryId(id)
    setCategorySlugEdited(Boolean(id))
    setCategoryIconEdited(Boolean(id))
    setActiveModal('category')
  }

  function openServiceForm(id = null) {
    setSelectedServiceId(id)
    setServiceSlugEdited(Boolean(id))
    setActiveModal('service')
  }

  function openDefinitionForm(id = null) {
    setSelectedDefinitionId(id)
    setActiveModal('definition')
  }

  async function handleCategorySubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        slug: (values.slug || '').trim(),
        icon: (values.icon || '').trim(),
        display_order: Number(values.display_order || 0),
      }

      if (selectedCategory) {
        await api.updateAdminCategory(selectedCategory.id, payload)
        toast('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„ÙØ¦Ø©.', 'success')
      } else {
        await api.createAdminCategory(payload)
        toast('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ¦Ø©.', 'success')
      }

      reloadCategories()
      reloadServices()
      closeModal()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleServiceSubmit(values) {
    setSubmitting(true)
    try {
      const schemaErrors = validateSchemaFieldRows(serviceSchemaFields)
      if (schemaErrors.length) {
        setServiceSchemaErrors(schemaErrors)
        setSubmitting(false)
        return
      }

      let requiredInformationSchema = []
      try {
        requiredInformationSchema = JSON.parse(values.required_information_schema_text || '[]')
      } catch {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: 'ØµÙŠØºØ© JSON ØºÙŠØ± ØµØ§Ù„Ø­Ø©.',
        })
        setSubmitting(false)
        return
      }

      if (!Array.isArray(requiredInformationSchema)) {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: 'ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† Ø§Ù„Ø¨Ù†ÙŠØ© Ù…ØµÙÙˆÙØ© JSON.',
        })
        setSubmitting(false)
        return
      }

      const requiredDocumentIds = normalizeSelectedIds(values.required_document_ids).map((item) => Number(item))
      const payload = {
        category_id: Number(values.category_id),
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
        slug: (values.slug || '').trim(),
        short_description_ar: values.short_description_ar.trim(),
        short_description_en: values.short_description_en.trim(),
        description_ar: values.description_ar.trim(),
        description_en: values.description_en.trim(),
        required_information_schema: requiredInformationSchema,
        required_document_ids: requiredDocumentIds,
        terms_ar: values.terms_ar.trim(),
        terms_en: values.terms_en.trim(),
        base_price: values.base_price,
        government_fee: values.government_fee,
        service_fee: values.service_fee,
        show_total_price_public: Boolean(values.show_total_price_public),
        show_government_fee_public: Boolean(values.show_government_fee_public),
        show_company_fee_public: Boolean(values.show_company_fee_public),
        public_price_note_ar: values.public_price_note_ar.trim(),
        public_price_note_en: values.public_price_note_en.trim(),
        estimated_duration: Number(values.estimated_duration || 1),
        estimated_duration_unit: values.estimated_duration_unit,
        delivery_time_mode: values.delivery_time_mode,
        delivery_start_date: values.delivery_start_date || null,
        delivery_end_date: values.delivery_end_date || null,
        delivery_note_ar: values.delivery_note_ar.trim(),
        delivery_note_en: values.delivery_note_en.trim(),
        price_type: values.price_type,
        is_online: Boolean(values.is_online),
        provider_required: Boolean(values.provider_required),
        requires_manual_review: Boolean(values.requires_manual_review),
        requires_appointment: Boolean(values.requires_appointment),
        is_featured: Boolean(values.is_featured),
        is_active: Boolean(values.is_active),
        show_on_public_site: Boolean(values.show_on_public_site),
        display_order: Number(values.display_order || 0),
      }

      if (selectedService) {
        await api.updateAdminService(selectedService.id, payload)
        toast('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø®Ø¯Ù…Ø©.', 'success')
      } else {
        await api.createAdminService(payload)
        toast('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø®Ø¯Ù…Ø©.', 'success')
      }

      reloadServices()
      closeModal()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function addServiceSchemaField() {
    setServiceSchemaErrors([])
    setServiceSchemaFields((current) => [...current, createSchemaFieldRow()])
  }

  function updateServiceSchemaField(rowId, key, value) {
    setServiceSchemaErrors([])
    setServiceSchemaFields((current) =>
      current.map((field) =>
        field.row_id === rowId
          ? {
              ...field,
              [key]: key === 'type' ? normalizeSchemaFieldType(value) : value,
              ...(key === 'type' && value !== 'select' ? { options_text: '' } : {}),
            }
          : field,
      ),
    )
  }

  function removeServiceSchemaField(rowId) {
    setServiceSchemaErrors([])
    setServiceSchemaFields((current) => current.filter((field) => field.row_id !== rowId))
  }

  async function handleDefinitionSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        code: values.code.trim(),
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
        description_ar: values.description_ar.trim(),
        description_en: values.description_en.trim(),
        allowed_extensions: toExtensionArray(values.allowed_extensions_text),
        max_file_size: Number(values.max_file_size || 0),
        sort_order: Number(values.sort_order || 0),
        is_active: Boolean(values.is_active),
      }

      if (selectedDefinition) {
        await api.updateAdminRequiredDocumentDefinition(selectedDefinition.id, payload)
        toast('ØªÙ… ØªØ­Ø¯ÙŠØ« ØªØ¹Ø±ÙŠÙ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø©.', 'success')
      } else {
        await api.createAdminRequiredDocumentDefinition(payload)
        toast('ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØªØ¹Ø±ÙŠÙ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø©.', 'success')
      }

      reloadDefinitions()
      reloadServices()
      closeModal()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm(payload) {
    if (!pendingDelete) return

    const { type, item } = pendingDelete
    setPendingDelete(null)

    try {
      if (type === 'category') {
        await api.deleteAdminCategory(item.id, payload)
        reloadCategories()
        reloadServices()
        toast('ØªÙ… ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙØ¦Ø©.', 'success')
      }

      if (type === 'service') {
        await api.deleteAdminService(item.id, payload)
        reloadServices()
        toast('ØªÙ… ØªØ¹Ø·ÙŠÙ„ Ø§Ù„Ø®Ø¯Ù…Ø©.', 'success')
      }

      if (type === 'definition') {
        await api.deleteAdminRequiredDocumentDefinition(item.id, payload)
        reloadDefinitions()
        reloadServices()
        toast('ØªÙ… ØªØ¹Ø·ÙŠÙ„ ØªØ¹Ø±ÙŠÙ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø©.', 'success')
      }

      if (
        String(selectedCategoryId) === String(item.id)
        || String(selectedServiceId) === String(item.id)
        || String(selectedDefinitionId) === String(item.id)
      ) {
        closeModal()
      }
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleRestoreConfirm() {
    if (!pendingRestore) return

    const { type, item } = pendingRestore
    setPendingRestore(null)

    try {
      if (type === 'category') {
        await api.restoreAdminCategory(item.id)
        reloadCategories()
        reloadServices()
      }

      if (type === 'service') {
        await api.restoreAdminService(item.id)
        reloadServices()
      }

      if (type === 'definition') {
        await api.restoreAdminRequiredDocumentDefinition(item.id)
        reloadDefinitions()
        reloadServices()
      }

      toast(isArabic ? 'ØªÙ…Øª Ø§Ù„Ø§Ø³ØªØ¹Ø§Ø¯Ø© Ø¨Ù†Ø¬Ø§Ø­.' : 'Record restored successfully.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const categoryColumns = [
    {
      key: 'name_ar',
      label: 'Category',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.name_ar}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              Deleted
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'slug', label: 'Slug' },
    { key: 'display_order', label: 'Order' },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (row.is_deleted ? 'Deleted' : row.is_active ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'category', item: row })} type="button">
              Restore
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openCategoryForm(row.id)} type="button">
                Edit
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'category', item: row })}
                type="button"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const serviceColumns = [
    {
      key: 'name_ar',
      label: 'Service',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.name_ar}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              Deleted
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'category_name', label: 'Category', render: (row) => row.category?.name_ar || row.category_name || 'Unassigned' },
    { key: 'duration_display', label: 'Delivery' },
    { key: 'required_documents', label: 'Documents', render: (row) => row.required_documents?.length || 0 },
    { key: 'show_on_public_site', label: 'Public site', render: (row) => (row.show_on_public_site ? 'Visible' : 'Hidden') },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (row.is_deleted ? 'Deleted' : row.is_active ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'service', item: row })} type="button">
              Restore
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openServiceForm(row.id)} type="button">
                Edit
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'service', item: row })}
                type="button"
              >
                Delete
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const definitionColumns = [
    {
      key: 'name_ar',
      label: 'Document',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.name_ar}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              Deleted
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'code', label: 'Code' },
    {
      key: 'allowed_extensions',
      label: 'Extensions',
      render: (row) => (row.allowed_extensions || []).join(', ') || 'Not set',
    },
    { key: 'sort_order', label: 'Order' },
    {
      key: 'is_active',
      label: 'Status',
      render: (row) => (row.is_deleted ? 'Deleted' : row.is_active ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'definition', item: row })} type="button">
              Restore
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openDefinitionForm(row.id)} type="button">
                Edit
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'definition', item: row })}
                type="button"
              >
                Delete
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
        description="Ø¥Ø¯Ø§Ø±Ø© Ù…ÙˆØ­Ø¯Ø© Ù„Ù„ÙØ¦Ø§Øª ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª ÙˆØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©. Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© ØªÙÙ†Ø´Ø£ Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø©ØŒ Ø«Ù… ØªÙØ±Ø¨Ø· Ø¨Ø§Ù„Ø®Ø¯Ù…Ø© Ù…Ù† Ø¯Ø§Ø®Ù„ Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„Ø®Ø¯Ù…Ø© Ù†ÙØ³Ù‡."
        eyebrow="Ø§Ù„Ø®Ø¯Ù…Ø§Øª"
        icon={Settings}
        title="Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø®Ø¯Ù…Ø§Øª"
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">Ø§Ù„ÙØ¦Ø§Øª</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">Ù†Ø¸Ù‘Ù… ÙƒØ±ÙˆØª Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ø§Ù… ÙˆÙ…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ø±Ø¶ Ù…Ù† Ù†ÙØ³ Ø§Ù„ØµÙØ­Ø©.</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">Ø§Ù„Ø®Ø¯Ù…Ø§Øª</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">ØªØ­ÙƒÙ… Ø¨Ø§Ù„ØªØ³Ø¹ÙŠØ±ØŒ Ù…Ø¯Ø© Ø§Ù„ØªØ³Ù„ÙŠÙ…ØŒ Ø§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„Ø¹Ø§Ù…ØŒ ÙˆØ§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù…Ù† Ø§Ù„Ø¹Ù…ÙŠÙ„.</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">ØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">Ø£Ù†Ø´Ø¦ ØªØ¹Ø±ÙŠÙ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© Ù…Ø±Ø© ÙˆØ§Ø­Ø¯Ø© Ø«Ù… Ø§Ø®ØªØ±Ù‡ Ù…Ù† Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ø¨Ø¯Ù„ ØªÙƒØ±Ø§Ø± Ù†ÙØ³ Ø§Ù„Ù†ØµÙˆØµ.</p>
        </div>
      </section>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openCategoryForm()} type="button">
            + ÙØ¦Ø© Ø¬Ø¯ÙŠØ¯Ø©
          </button>
        }
        description="Ø£Ù†Ø´Ø¦ Ø§Ù„ÙØ¦Ø§Øª ÙˆØ¹Ø¯Ù‘Ù„Ù‡Ø§ ÙˆØ¹Ø·Ù‘Ù„Ù‡Ø§ Ù…Ù† Ø´Ø§Ø´Ø© Ø§Ù„Ø®Ø¯Ù…Ø§Øª Ù†ÙØ³Ù‡Ø§."
        icon={FolderTree}
        title="Ø§Ù„ÙØ¦Ø§Øª"
      >
        <DataTable
          columns={categoryColumns}
          emptyDescription="Ø£Ø¶Ù Ø£ÙˆÙ„ ÙØ¦Ø© Ù„ØªÙ†Ø¸ÙŠÙ… Ø§Ù„Ø®Ø¯Ù…Ø§Øª."
          emptyTitle="Ù„Ø§ ØªÙˆØ¬Ø¯ ÙØ¦Ø§Øª"
          loading={categoriesLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={categories}
          toolbar={
            <div className="grid gap-3 md:grid-cols-1">
              <select className="field" value={categoryStatus} onChange={(event) => setCategoryStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </div>
          }
        />
      </SectionCard>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openServiceForm()} type="button">
            + Ø®Ø¯Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©
          </button>
        }
        description="ÙƒÙ„ Ø®ØµØ§Ø¦Øµ Ø§Ù„Ø®Ø¯Ù…Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© Ù…ÙˆØ¬ÙˆØ¯Ø© Ù‡Ù†Ø§ØŒ Ø¨Ù…Ø§ ÙÙŠÙ‡Ø§ Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© ÙˆØ¢Ù„ÙŠØ© Ø¹Ø±Ø¶ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± Ù„Ù„Ø¹Ø§Ù…Ø©."
        icon={Settings}
        title="Ø§Ù„Ø®Ø¯Ù…Ø§Øª"
      >
        <DataTable
          columns={serviceColumns}
          emptyDescription="Ø£Ø¶Ù Ø£ÙˆÙ„ Ø®Ø¯Ù…Ø© Ù„ØªØ¸Ù‡Ø± ÙÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹ ÙˆÙ„ÙˆØ­Ø§Øª Ø§Ù„ØªØ´ØºÙŠÙ„."
          emptyTitle="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø®Ø¯Ù…Ø§Øª"
          loading={servicesLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={services}
          toolbar={
            <div className="grid gap-3 md:grid-cols-2">
              <select className="field" value={serviceStatus} onChange={(event) => setServiceStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
              <select className="field" value={serviceFilterCategory} onChange={(event) => setServiceFilterCategory(event.target.value)}>
                <option value="">ÙƒÙ„ Ø§Ù„ÙØ¦Ø§Øª</option>
                {categories.filter((category) => !category.is_deleted).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || category.name_ar}
                  </option>
                ))}
              </select>
            </div>
          }
        />
      </SectionCard>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openDefinitionForm()} type="button">
            + ØªØ¹Ø±ÙŠÙ ÙˆØ«ÙŠÙ‚Ø©
          </button>
        }
        description="Ù‡Ø°Ù‡ Ù‡ÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ø§Ù„ØªÙŠ ÙŠØ®ØªØ§Ø± Ù…Ù†Ù‡Ø§ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø© Ù„ÙƒÙ„ Ø®Ø¯Ù…Ø©."
        icon={Files}
        title="ØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚"
      >
        <DataTable
          columns={definitionColumns}
          emptyDescription="Ø£Ø¶Ù Ø£ÙˆÙ„ ØªØ¹Ø±ÙŠÙ ÙˆØ«ÙŠÙ‚Ø© Ø±Ø¦ÙŠØ³ÙŠ."
          emptyTitle="Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ¹Ø±ÙŠÙØ§Øª ÙˆØ«Ø§Ø¦Ù‚"
          loading={definitionsLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={definitions}
          toolbar={
            <div className="grid gap-3 md:grid-cols-1">
              <select className="field" value={definitionStatus} onChange={(event) => setDefinitionStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="deleted">Deleted</option>
                <option value="all">All</option>
              </select>
            </div>
          }
        />
      </SectionCard>

      <FormModal
        description="Ø¹Ø¯Ù‘Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ÙØ¦Ø© Ù…Ù† Ù‡Ù†Ø§ Ø¨Ø¯Ù„ ØªÙˆØ²ÙŠØ¹Ù‡Ø§ Ø¹Ù„Ù‰ Ø´Ø§Ø´Ø© Ø£Ø®Ø±Ù‰."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              Ø¥Ù„ØºØ§Ø¡
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-category-form" type="submit">
              {selectedCategory ? 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Ø¥Ø¶Ø§ÙØ© Ø§Ù„ÙØ¦Ø©'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'category'}
        size="lg"
        title={selectedCategory ? `ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ÙØ¦Ø©: ${selectedCategory.name_ar}` : 'ÙØ¦Ø© Ø¬Ø¯ÙŠØ¯Ø©'}
      >
        <form className="space-y-4" id="service-category-form" onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
              <input className="field" {...categoryForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
              <input className="field" {...categoryForm.register('name_en', { required: true })} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="Ø¥Ø°Ø§ ØªØ±ÙƒØªÙ‡ ÙØ§Ø±ØºØ§Ù‹ Ø³ÙŠÙÙˆÙ„Ø¯ Ù…Ù† Ø§Ù„Ø§Ø³Ù…." label="Ø§Ù„Ù…Ø¹Ø±Ù‘Ù">
              <input
                className="field"
                {...categoryForm.register('slug', {
                  onChange: () => setCategorySlugEdited(true),
                })}
              />
            </Field>
            <Field label="Ø§Ù„Ø£ÙŠÙ‚ÙˆÙ†Ø©">
              <input
                className="field"
                {...categoryForm.register('icon', {
                  onChange: () => setCategoryIconEdited(true),
                })}
              />
            </Field>
          </div>
          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
            <textarea className="field min-h-24" {...categoryForm.register('description_ar')} />
          </Field>
          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
            <textarea className="field min-h-24" {...categoryForm.register('description_en')} />
          </Field>
          <Field label="ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¹Ø±Ø¶">
            <input className="field" type="number" {...categoryForm.register('display_order')} />
          </Field>
          <CheckboxField label="Ø§Ù„ÙØ¦Ø© Ù†Ø´Ø·Ø©" registration={categoryForm.register('is_active')} />
        </form>
      </FormModal>

      <FormModal
        description="ØªØ­Ø±ÙŠØ± ÙƒØ§Ù…Ù„ Ù„Ù„Ø®Ø¯Ù…Ø©: Ø¨ÙŠØ§Ù†Ø§ØªÙ‡Ø§ØŒ Ø§Ù„ØªØ³Ø¹ÙŠØ± Ø§Ù„Ø¹Ø§Ù…ØŒ Ø§Ù„ØªØ³Ù„ÙŠÙ…ØŒ Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©ØŒ ÙˆØ¨Ù†ÙŠØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              Ø¥Ù„ØºØ§Ø¡
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-form" type="submit">
              {selectedService ? 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø®Ø¯Ù…Ø©'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'service'}
        size="xl"
        title={selectedService ? `ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø®Ø¯Ù…Ø©: ${selectedService.name_ar}` : 'Ø®Ø¯Ù…Ø© Ø¬Ø¯ÙŠØ¯Ø©'}
      >
        <form className="space-y-5" id="service-form" onSubmit={serviceForm.handleSubmit(handleServiceSubmit)}>
          <Field label="Ø§Ù„ÙØ¦Ø©">
            <select className="field" {...serviceForm.register('category_id', { required: true })}>
              <option value="">Ø§Ø®ØªØ± Ø§Ù„ÙØ¦Ø©</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ø§Ø³Ù… Ø§Ù„Ø®Ø¯Ù…Ø© Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
              <input className="field" {...serviceForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="Ø§Ø³Ù… Ø§Ù„Ø®Ø¯Ù…Ø© Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
              <input className="field" {...serviceForm.register('name_en')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="Ø¥Ø°Ø§ ØªØ±ÙƒØªÙ‡ ÙØ§Ø±ØºØ§Ù‹ Ø³ÙŠÙÙˆÙ„Ø¯ Ù…Ù† Ø§Ù„Ø§Ø³Ù…." label="Ø§Ù„Ù…Ø¹Ø±Ù‘Ù">
              <input
                className="field"
                {...serviceForm.register('slug', {
                  onChange: () => setServiceSlugEdited(true),
                })}
              />
            </Field>
            <Field label="ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¹Ø±Ø¶">
              <input className="field" type="number" {...serviceForm.register('display_order')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ± Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
              <input className="field" {...serviceForm.register('short_description_ar')} />
            </Field>
            <Field label="ÙˆØµÙ Ù…Ø®ØªØµØ± Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
              <input className="field" {...serviceForm.register('short_description_en')} />
            </Field>
          </div>

          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
            <textarea className="field min-h-28" {...serviceForm.register('description_ar', { required: true })} />
          </Field>
          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
            <textarea className="field min-h-28" {...serviceForm.register('description_en')} />
          </Field>

          <ServiceSchemaBuilder
            errorMessages={serviceSchemaErrors}
            fields={serviceSchemaFields}
            onAddField={addServiceSchemaField}
            onChangeField={updateServiceSchemaField}
            onRemoveField={removeServiceSchemaField}
          />
          <input type="hidden" {...serviceForm.register('required_information_schema_text')} />
          {serviceForm.formState.errors.required_information_schema_text ? (
            <p className="text-sm text-danger">{serviceForm.formState.errors.required_information_schema_text.message}</p>
          ) : null}

          <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold text-ink">ØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©</h3>
              <p className="text-sm leading-6 text-slate-600">Ø§Ø®ØªØ± Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©. Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©ØŒ Ø£Ù†Ø´Ø¦Ù‡Ø§ Ø£ÙˆÙ„Ø§Ù‹ Ù…Ù† Ù‚Ø³Ù… ØªØ¹Ø±ÙŠÙØ§Øª Ø§Ù„ÙˆØ«Ø§Ø¦Ù‚.</p>
            </div>
            {definitions.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {definitions.map((definition) => (
                  <label key={definition.id} className="rounded-2xl border border-border bg-white p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{definition.name_ar}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{definition.code}</p>
                        {definition.description_ar ? <p className="mt-2 text-slate-500">{definition.description_ar}</p> : null}
                        <p className="mt-2 text-xs text-slate-500">{formatDefinitionSummary(definition)}</p>
                      </div>
                      <input
                        className="mt-1 h-4 w-4 accent-brand-600"
                        type="checkbox"
                        value={String(definition.id)}
                        {...serviceForm.register('required_document_ids')}
                      />
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white px-4 py-5 text-sm text-slate-500">
                Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ¹Ø±ÙŠÙØ§Øª ÙˆØ«Ø§Ø¦Ù‚ Ø¨Ø¹Ø¯. Ø£Ø¶Ù ØªØ¹Ø±ÙŠÙØ§Ù‹ Ø±Ø¦ÙŠØ³ÙŠØ§Ù‹ Ø«Ù… Ø¹Ø¯ Ù„Ø§Ø®ØªÙŠØ§Ø±Ù‡ Ø¯Ø§Ø®Ù„ Ø§Ù„Ø®Ø¯Ù…Ø©.
              </div>
            )}
            <p className="text-sm text-slate-500">Ø§Ù„Ù…Ø­Ø¯Ø¯ Ø§Ù„Ø¢Ù†: {selectedRequiredDocumentIds.length} ØªØ¹Ø±ÙŠÙ</p>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold text-ink">Ø§Ù„ØªØ³Ø¹ÙŠØ± ÙˆØ§Ù„Ø¸Ù‡ÙˆØ± Ø§Ù„Ø¹Ø§Ù…</h3>
              <p className="text-sm leading-6 text-slate-600">ÙƒÙ„ Ø§Ù„Ø±Ø³ÙˆÙ… ØªØ­ÙØ¸ Ø¯Ø§Ø®Ù„ÙŠØ§Ù‹ Ø¯Ø§Ø¦Ù…Ø§Ù‹ØŒ Ù„ÙƒÙ†Ùƒ ØªØ®ØªØ§Ø± Ù…Ø§ ÙŠØ¸Ù‡Ø± Ø¹Ù„Ù‰ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ø§Ù….</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø£Ø³Ø§Ø³ÙŠ">
                <input className="field" step="0.01" type="number" {...serviceForm.register('base_price')} />
              </Field>
              <Field label="Ø±Ø³ÙˆÙ… Ø§Ù„Ø´Ø±ÙƒØ©">
                <input className="field" step="0.01" type="number" {...serviceForm.register('service_fee')} />
              </Field>
              <Field label="Ø§Ù„Ø±Ø³ÙˆÙ… Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ©">
                <input className="field" step="0.01" type="number" {...serviceForm.register('government_fee')} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <CheckboxField label="Ø¥Ø¸Ù‡Ø§Ø± Ø§Ù„Ø³Ø¹Ø± Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù„Ù„Ø¹Ø§Ù…Ø©" registration={serviceForm.register('show_total_price_public')} />
              <CheckboxField label="Ø¥Ø¸Ù‡Ø§Ø± Ø§Ù„Ø±Ø³ÙˆÙ… Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ© Ù„Ù„Ø¹Ø§Ù…Ø©" registration={serviceForm.register('show_government_fee_public')} />
              <CheckboxField label="Ø¥Ø¸Ù‡Ø§Ø± Ø±Ø³ÙˆÙ… Ø§Ù„Ø´Ø±ÙƒØ© Ù„Ù„Ø¹Ø§Ù…Ø©" registration={serviceForm.register('show_company_fee_public')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ù…Ù„Ø§Ø­Ø¸Ø© Ø§Ù„Ø³Ø¹Ø± Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
                <textarea className="field min-h-24" {...serviceForm.register('public_price_note_ar')} />
              </Field>
              <Field label="Ù…Ù„Ø§Ø­Ø¸Ø© Ø§Ù„Ø³Ø¹Ø± Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
                <textarea className="field min-h-24" {...serviceForm.register('public_price_note_en')} />
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold text-ink">Ø§Ù„ØªØ³Ù„ÙŠÙ…</h3>
              <p className="text-sm leading-6 text-slate-600">ÙŠÙ…ÙƒÙ†Ùƒ Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù…Ø¯Ø© Ù…ØªÙˆÙ‚Ø¹Ø© Ø£Ùˆ ÙØªØ±Ø© Ù…Ù† ØªØ§Ø±ÙŠØ® Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ® Ù„Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„ØªÙŠ ØªØªØ£Ø«Ø± Ø¨Ø¬Ù‡Ø© Ø®Ø§Ø±Ø¬ÙŠØ©.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Ù†ÙˆØ¹ Ø§Ù„ØªØ³Ù„ÙŠÙ…">
                <select className="field" {...serviceForm.register('delivery_time_mode')}>
                  <option value="duration">Ù…Ø¯Ø© Ù…ØªÙˆÙ‚Ø¹Ø©</option>
                  <option value="date_range">ÙØªØ±Ø© Ø²Ù…Ù†ÙŠØ©</option>
                </select>
              </Field>
              <Field label="Ù†ÙˆØ¹ Ø§Ù„Ø³Ø¹Ø±">
                <select className="field" {...serviceForm.register('price_type')}>
                  <option value="fixed">Fixed</option>
                  <option value="starts_from">Starts from</option>
                  <option value="quotation">Quotation</option>
                  <option value="free">Free</option>
                </select>
              </Field>
              <Field label="ÙˆØ­Ø¯Ø© Ø§Ù„Ù…Ø¯Ø©">
                <select className="field" {...serviceForm.register('estimated_duration_unit')}>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                </select>
              </Field>
            </div>

            {deliveryTimeMode === 'date_range' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Ù…Ù† ØªØ§Ø±ÙŠØ®">
                  <input className="field" type="date" {...serviceForm.register('delivery_start_date')} />
                </Field>
                <Field label="Ø¥Ù„Ù‰ ØªØ§Ø±ÙŠØ®">
                  <input className="field" type="date" {...serviceForm.register('delivery_end_date')} />
                </Field>
              </div>
            ) : (
              <Field label="Ù…Ø¯Ø© Ø§Ù„ØªÙ†ÙÙŠØ°">
                <input className="field" min="1" type="number" {...serviceForm.register('estimated_duration')} />
              </Field>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ù…Ù„Ø§Ø­Ø¸Ø© Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
                <textarea className="field min-h-24" {...serviceForm.register('delivery_note_ar')} />
              </Field>
              <Field label="Ù…Ù„Ø§Ø­Ø¸Ø© Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
                <textarea className="field min-h-24" {...serviceForm.register('delivery_note_en')} />
              </Field>
            </div>
          </div>

          <Field label="Ø§Ù„Ø´Ø±ÙˆØ· Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
            <textarea className="field min-h-24" {...serviceForm.register('terms_ar')} />
          </Field>
          <Field label="Ø§Ù„Ø´Ø±ÙˆØ· Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
            <textarea className="field min-h-24" {...serviceForm.register('terms_en')} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label="Ø§Ù„Ø®Ø¯Ù…Ø© Ù†Ø´Ø·Ø©" registration={serviceForm.register('is_active')} />
            <CheckboxField label="ØªØ¸Ù‡Ø± ÙÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ø§Ù…" registration={serviceForm.register('show_on_public_site')} />
            <CheckboxField label="ØªÙ†ÙØ° Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†" registration={serviceForm.register('is_online')} />
            <CheckboxField label="ØªØ­ØªØ§Ø¬ Ù…Ø²ÙˆØ¯ Ø®Ø¯Ù…Ø©" registration={serviceForm.register('provider_required')} />
            <CheckboxField label="ØªØ­ØªØ§Ø¬ Ù…Ø±Ø§Ø¬Ø¹Ø© ÙŠØ¯ÙˆÙŠØ©" registration={serviceForm.register('requires_manual_review')} />
            <CheckboxField label="ØªØ­ØªØ§Ø¬ Ù…ÙˆØ¹Ø¯" registration={serviceForm.register('requires_appointment')} />
            <CheckboxField label="Ø®Ø¯Ù…Ø© Ù…Ù…ÙŠØ²Ø©" registration={serviceForm.register('is_featured')} />
          </div>
        </form>
      </FormModal>

      <FormModal
        description="Ø£Ù†Ø´Ø¦ Ø£Ùˆ Ø¹Ø¯Ù‘Ù„ ØªØ¹Ø±ÙŠÙ Ø§Ù„ÙˆØ«ÙŠÙ‚Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ Ø§Ù„Ø°ÙŠ Ø³ÙŠÙØ³ØªØ®Ø¯Ù… Ø¯Ø§Ø®Ù„ Ø§Ù„Ø®Ø¯Ù…Ø§Øª."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              Ø¥Ù„ØºØ§Ø¡
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="document-definition-form" type="submit">
              {selectedDefinition ? 'Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Ø¥Ø¶Ø§ÙØ© Ø§Ù„ØªØ¹Ø±ÙŠÙ'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'definition'}
        size="lg"
        title={selectedDefinition ? `ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„ØªØ¹Ø±ÙŠÙ: ${selectedDefinition.name_ar}` : 'ØªØ¹Ø±ÙŠÙ ÙˆØ«ÙŠÙ‚Ø© Ø¬Ø¯ÙŠØ¯'}
      >
        <form className="space-y-4" id="document-definition-form" onSubmit={definitionForm.handleSubmit(handleDefinitionSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="ÙƒÙˆØ¯ Ø«Ø§Ø¨Øª ÙŠÙØ³ØªØ®Ø¯Ù… ÙÙŠ Ø§Ù„Ø±Ø¨Ø· ÙˆØ§Ù„ØªØ­Ù‚Ù‚." label="Ø§Ù„ÙƒÙˆØ¯">
              <input className="field font-mono" {...definitionForm.register('code', { required: true })} />
            </Field>
            <Field label="ØªØ±ØªÙŠØ¨ Ø§Ù„Ø¹Ø±Ø¶">
              <input className="field" type="number" {...definitionForm.register('sort_order')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
              <input className="field" {...definitionForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="Ø§Ù„Ø§Ø³Ù… Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
              <input className="field" {...definitionForm.register('name_en')} />
            </Field>
          </div>
          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©">
            <textarea className="field min-h-24" {...definitionForm.register('description_ar')} />
          </Field>
          <Field label="Ø§Ù„ÙˆØµÙ Ø¨Ø§Ù„Ø¥Ù†Ø¬Ù„ÙŠØ²ÙŠØ©">
            <textarea className="field min-h-24" {...definitionForm.register('description_en')} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="Ù…Ø«Ø§Ù„: .pdf, .jpg, .png" label="Ø§Ù„Ø§Ù…ØªØ¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø³Ù…ÙˆØ­Ø©">
              <input className="field" {...definitionForm.register('allowed_extensions_text')} />
            </Field>
            <Field hint="Ø¨Ø§Ù„Ø¨Ø§ÙŠØª" label="Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ù‚ØµÙ‰ Ù„Ù„Ø­Ø¬Ù…">
              <input className="field" min="1" type="number" {...definitionForm.register('max_file_size')} />
            </Field>
          </div>
          <CheckboxField label="Ø§Ù„ØªØ¹Ø±ÙŠÙ Ù†Ø´Ø·" registration={definitionForm.register('is_active')} />
        </form>
      </FormModal>

      <AdminSoftDeleteModal
        confirmLabel={isArabic ? 'تأكيد الحذف' : 'Confirm delete'}
        description={
          isArabic
            ? 'سيتم إخفاء هذا العنصر من النظام مع الإبقاء عليه للتدقيق والاسترجاع.'
            : 'This will hide the record from the system while keeping it for audit and recovery.'
        }
        impact={
          isArabic
            ? 'الحذف هنا حذف مرن: يختفي العنصر من الشاشات التشغيلية ويبقى محفوظاً للتاريخ والاسترجاع.'
            : 'This is a soft delete: the record disappears from active screens but stays available for history and restore.'
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        requireReason
        title={isArabic ? 'تأكيد الحذف' : 'Confirm delete'}
      />

      <ConfirmModal
        confirmLabel={isArabic ? 'استعادة' : 'Restore'}
        description={
          isArabic
            ? 'ستتم استعادة العنصر المحدد ليعود إلى الشاشات الإدارية والمسارات النشطة.'
            : 'This will restore the selected record back to admin screens and active flows.'
        }
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        open={!!pendingRestore}
        title={isArabic ? 'استعادة العنصر' : 'Restore record'}
      />
    </div>
  )
}

export default ServicesManagementPage



