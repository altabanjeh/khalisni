import { Files, FolderTree, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import AdminSoftDeleteModal from '../../components/AdminSoftDeleteModal'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { ImageUploadField } from '../../components/publicSite/PublicSiteFormFields'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { generateCatalogSlug, suggestCategoryIcon } from '../../utils/catalogDefaults'
import { resolveServiceImage } from '../../utils/catalogImagery'

const defaultCategoryValues = {
  name_ar: '',
  name_en: '',
  slug: '',
  description_ar: '',
  description_en: '',
  icon: '',
  image: undefined,
  clear_image: false,
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
  image: undefined,
  clear_image: false,
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
  estimated_duration_min: 1,
  estimated_duration_max: 3,
  estimated_duration_unit: 'days',
  delivery_time_mode: 'duration',
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
  allowed_extensions: ['.pdf', '.jpg', '.png'],
  max_file_size: 10485760,
  sort_order: 0,
  is_active: true,
}

const SERVICE_CURRENCY_CODE = 'JOD'
const DOCUMENT_EXTENSION_OPTIONS = [
  { value: '.pdf', label_ar: 'ملف PDF', label_en: 'PDF document' },
  { value: '.jpg', label_ar: 'صورة JPG', label_en: 'JPG image' },
  { value: '.jpeg', label_ar: 'صورة JPEG', label_en: 'JPEG image' },
  { value: '.png', label_ar: 'صورة PNG', label_en: 'PNG image' },
  { value: '.doc', label_ar: 'ملف Word DOC', label_en: 'Word DOC' },
  { value: '.docx', label_ar: 'ملف Word DOCX', label_en: 'Word DOCX' },
]
const DOCUMENT_SIZE_OPTIONS = [
  { value: 1 * 1024 * 1024, label: '1 MB' },
  { value: 2 * 1024 * 1024, label: '2 MB' },
  { value: 5 * 1024 * 1024, label: '5 MB' },
  { value: 10 * 1024 * 1024, label: '10 MB' },
  { value: 15 * 1024 * 1024, label: '15 MB' },
  { value: 20 * 1024 * 1024, label: '20 MB' },
]

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

function getDocumentExtensionLabel(value, isArabic) {
  const option = DOCUMENT_EXTENSION_OPTIONS.find((item) => item.value === value)
  if (!option) return value
  return isArabic ? option.label_ar : option.label_en
}

function formatExtensionList(value, isArabic) {
  const items = Array.isArray(value) ? value : []
  return items.map((item) => getDocumentExtensionLabel(item, isArabic)).join('، ') || (isArabic ? 'غير محدد' : 'Not set')
}

const schemaFieldTypeOptions = [
  { value: 'text', label_ar: 'نص قصير', label_en: 'Short text' },
  { value: 'textarea', label_ar: 'نص طويل', label_en: 'Long text' },
  { value: 'number', label_ar: 'رقم', label_en: 'Number' },
  { value: 'email', label_ar: 'بريد إلكتروني', label_en: 'Email' },
  { value: 'tel', label_ar: 'رقم هاتف', label_en: 'Phone number' },
  { value: 'date', label_ar: 'تاريخ', label_en: 'Date' },
  { value: 'select', label_ar: 'قائمة خيارات', label_en: 'Options list' },
  { value: 'checkbox', label_ar: 'صح / خطأ', label_en: 'True / false' },
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

function validateSchemaFieldRows(fields, isArabic) {
  const errors = []

  fields.forEach((field, index) => {
    if (isSchemaFieldRowBlank(field)) return

    if (!field.label_ar.trim() && !field.label.trim()) {
      errors.push(isArabic
        ? `الحقل ${index + 1}: أضف الاسم الذي سيظهر للمستخدم.`
        : `Field ${index + 1}: add the name shown to the user.`)
    }

    if (normalizeSchemaFieldType(field.type) === 'select' && !parseSchemaOptionsText(field.options_text).length) {
      errors.push(isArabic
        ? `الحقل ${index + 1}: أضف خيارات القائمة، كل خيار في سطر منفصل.`
        : `Field ${index + 1}: add the list options, one option per line.`)
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
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  return (
    <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-ink">{tr('البيانات المطلوبة من العميل', 'Information required from the customer')}</h3>
          <p className="text-sm leading-6 text-slate-600">
            {tr(
              'أضف الحقول التي سيملؤها العميل عند طلب الخدمة، وسيتم توليد JSON تلقائياً في الخلفية.',
              'Add the fields the customer fills in when requesting the service; the JSON is generated automatically in the background.',
            )}
          </p>
        </div>
        <button className="btn-secondary whitespace-nowrap" onClick={onAddField} type="button">
          {isArabic ? '+ حقل مطلوب' : '+ Required field'}
        </button>
      </div>

      {fields.length ? (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.row_id} className="space-y-4 rounded-[1.5rem] border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">{tr(`الحقل ${index + 1}`, `Field ${index + 1}`)}</p>
                  <p className="text-xs text-slate-500">
                    {tr('المعرّف المولّد:', 'Generated identifier:')}{' '}
                    <span className="font-mono text-ink">{getGeneratedSchemaFieldName(field, index)}</span>
                  </p>
                </div>
                <button
                  className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                  onClick={() => onRemoveField(field.row_id)}
                  type="button"
                >
                  {tr('حذف الحقل', 'Remove field')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={tr('الاسم الظاهر بالعربية', 'Display name (Arabic)')}>
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label_ar', event.target.value)}
                    placeholder="مثال: رقم الجواز"
                    value={field.label_ar}
                  />
                </Field>
                <Field hint={tr('يُستخدم أيضاً لتوليد معرّف مناسب إذا تُرك الحقل التقني فارغاً.', 'Also used to generate an identifier when the technical field is left blank.')} label={tr('الاسم الظاهر بالإنجليزية', 'Display name (English)')}>
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label', event.target.value)}
                    placeholder="Passport number"
                    value={field.label}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field hint={tr('اختياري. إن تُرك فارغاً سنولّده تلقائياً.', 'Optional. Generated automatically when left blank.')} label={tr('المعرّف التقني', 'Technical identifier')}>
                  <input
                    className="field font-mono"
                    dir="ltr"
                    onChange={(event) => onChangeField(field.row_id, 'technical_name', event.target.value)}
                    placeholder="passport_number"
                    value={field.technical_name}
                  />
                </Field>
                <Field label={tr('نوع الحقل', 'Field type')}>
                  <select className="field" onChange={(event) => onChangeField(field.row_id, 'type', event.target.value)} value={field.type}>
                    {schemaFieldTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {isArabic ? option.label_ar : option.label_en}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label={tr('نص توضيحي', 'Placeholder text')}>
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'placeholder', event.target.value)}
                    placeholder="أدخل رقم الجواز"
                    value={field.placeholder}
                  />
                </Field>
                <Field label={tr('شرح إضافي', 'Extra help text')}>
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'help_text', event.target.value)}
                    value={field.help_text}
                  />
                </Field>
              </div>

              {field.type === 'select' ? (
                <Field hint={tr('كل خيار في سطر منفصل.', 'One option per line.')} label={tr('خيارات القائمة', 'List options')}>
                  <textarea
                    className="field min-h-28"
                    onChange={(event) => onChangeField(field.row_id, 'options_text', event.target.value)}
                    value={field.options_text}
                  />
                </Field>
              ) : null}

              <CheckboxField
                label={isArabic ? 'الحقل مطلوب عند الطلب' : 'Field is required on request'}
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
          {tr(
            'إذا كانت الخدمة تحتاج بيانات إضافية من العميل فأضفها من هنا. إذا لم تحتج أي حقول إضافية سيبقى JSON فارغاً.',
            'Add fields here if the service needs extra information from the customer. If none are needed the JSON stays empty.',
          )}
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

function isClearImageValue(value) {
  return value === true || value === 'true' || value === 'on'
}

function formatDefinitionSummary(definition, isArabic) {
  const extensions = formatExtensionList(definition.allowed_extensions, isArabic)
  if (!extensions) return isArabic ? 'بدون امتدادات مخصصة' : 'No custom extensions'
  const sizeOption = DOCUMENT_SIZE_OPTIONS.find((option) => option.value === Number(definition.max_file_size || 0))
  return `${extensions} | ${sizeOption?.label || (isArabic ? 'حجم مخصص' : 'Custom size')}`
}

function ServicesManagementPage() {
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const tr = (ar, en) => (isArabic ? ar : en)
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
  const categoryImageFile = categoryForm.watch('image')
  const categoryClearImage = categoryForm.watch('clear_image')
  const serviceImageFile = serviceForm.watch('image')
  const watchedServiceSlug = serviceForm.watch('slug')
  const watchedCategoryId = serviceForm.watch('category_id')
  const serviceClearImage = serviceForm.watch('clear_image')
  const deliveryTimeMode = serviceForm.watch('delivery_time_mode')
  const selectedDefinitionExtensions = definitionForm.watch('allowed_extensions') || []
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
            image: undefined,
            clear_image: false,
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
            image: undefined,
            clear_image: false,
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
            estimated_duration_min: selectedService.estimated_duration_min ?? selectedService.estimated_duration ?? 1,
            estimated_duration_max: selectedService.estimated_duration_max ?? selectedService.estimated_duration ?? 1,
            estimated_duration_unit: selectedService.estimated_duration_unit || 'days',
            delivery_time_mode: selectedService.delivery_time_mode === 'date_range' ? 'duration' : selectedService.delivery_time_mode || 'duration',
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
            allowed_extensions: selectedDefinition.allowed_extensions || ['.pdf'],
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
        clear_image: isClearImageValue(values.clear_image),
        display_order: Number(values.display_order || 0),
      }

      if (selectedCategory) {
        await api.updateAdminCategory(selectedCategory.id, payload)
        toast(tr('تم تحديث الفئة.', 'Category updated.'), 'success')
      } else {
        await api.createAdminCategory(payload)
        toast(tr('تم إنشاء الفئة.', 'Category created.'), 'success')
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
      const schemaErrors = validateSchemaFieldRows(serviceSchemaFields, isArabic)
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
          message: tr('صيغة JSON غير صالحة.', 'Invalid JSON format.'),
        })
        setSubmitting(false)
        return
      }

      if (!Array.isArray(requiredInformationSchema)) {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: tr('يجب أن تكون البنية مصفوفة JSON.', 'The structure must be a JSON array.'),
        })
        setSubmitting(false)
        return
      }

      const requiredDocumentIds = normalizeSelectedIds(values.required_document_ids).map((item) => Number(item))
      const isDurationRange = values.delivery_time_mode === 'duration_range'
      const durationMin = Number(values.estimated_duration_min || values.estimated_duration || 1)
      const durationMax = Number(values.estimated_duration_max || values.estimated_duration || durationMin)
      const payload = {
        category_id: Number(values.category_id),
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
        slug: (values.slug || '').trim(),
        short_description_ar: values.short_description_ar.trim(),
        short_description_en: values.short_description_en.trim(),
        description_ar: values.description_ar.trim(),
        description_en: values.description_en.trim(),
        image: values.image,
        clear_image: isClearImageValue(values.clear_image),
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
        estimated_duration: isDurationRange ? durationMax : Number(values.estimated_duration || 1),
        estimated_duration_min: isDurationRange ? durationMin : null,
        estimated_duration_max: isDurationRange ? durationMax : null,
        estimated_duration_unit: values.estimated_duration_unit,
        delivery_time_mode: values.delivery_time_mode,
        delivery_start_date: null,
        delivery_end_date: null,
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
        toast(tr('تم تحديث الخدمة.', 'Service updated.'), 'success')
      } else {
        await api.createAdminService(payload)
        toast(tr('تم إنشاء الخدمة.', 'Service created.'), 'success')
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
        allowed_extensions: Array.isArray(values.allowed_extensions)
          ? values.allowed_extensions.filter(Boolean)
          : String(values.allowed_extensions || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
        max_file_size: Number(values.max_file_size || 0),
        sort_order: Number(values.sort_order || 0),
        is_active: Boolean(values.is_active),
      }

      if (selectedDefinition) {
        await api.updateAdminRequiredDocumentDefinition(selectedDefinition.id, payload)
        toast(tr('تم تحديث تعريف الوثيقة.', 'Document definition updated.'), 'success')
      } else {
        await api.createAdminRequiredDocumentDefinition(payload)
        toast(tr('تم إنشاء تعريف الوثيقة.', 'Document definition created.'), 'success')
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
        toast(tr('تم تعطيل الفئة.', 'Category deactivated.'), 'success')
      }

      if (type === 'service') {
        await api.deleteAdminService(item.id, payload)
        reloadServices()
        toast(tr('تم تعطيل الخدمة.', 'Service deactivated.'), 'success')
      }

      if (type === 'definition') {
        await api.deleteAdminRequiredDocumentDefinition(item.id, payload)
        reloadDefinitions()
        reloadServices()
        toast(tr('تم تعطيل تعريف الوثيقة.', 'Document definition deactivated.'), 'success')
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

      toast(tr('تمت الاستعادة بنجاح.', 'Record restored successfully.'), 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const statusCell = (row) => (row.is_deleted ? tr('محذوف', 'Deleted') : row.is_active ? tr('نشط', 'Active') : tr('موقوف', 'Inactive'))
  const deletedBadge = (row) =>
    row.is_deleted ? (
      <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
        {tr('محذوف', 'Deleted')}
      </span>
    ) : null

  const categoryColumns = [
    {
      key: 'name_ar',
      label: tr('الفئة', 'Category'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{isArabic ? row.name_ar : (row.name_en || row.name_ar)}</span>
          {deletedBadge(row)}
        </div>
      ),
    },
    { key: 'slug', label: tr('المعرّف', 'Slug') },
    { key: 'display_order', label: tr('الترتيب', 'Order') },
    { key: 'is_active', label: tr('الحالة', 'Status'), render: statusCell },
    {
      key: 'actions',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'category', item: row })} type="button">
              {tr('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openCategoryForm(row.id)} type="button">
                {tr('تعديل', 'Edit')}
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'category', item: row })}
                type="button"
              >
                {tr('حذف', 'Delete')}
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
      label: tr('الخدمة', 'Service'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{isArabic ? row.name_ar : (row.name_en || row.name_ar)}</span>
          {deletedBadge(row)}
        </div>
      ),
    },
    {
      key: 'category_name',
      label: tr('الفئة', 'Category'),
      render: (row) => (isArabic ? row.category?.name_ar : row.category?.name_en) || row.category?.name_ar || row.category_name || tr('غير مصنّفة', 'Unassigned'),
    },
    { key: 'duration_display', label: tr('التسليم', 'Delivery') },
    { key: 'required_documents', label: tr('الوثائق', 'Documents'), render: (row) => row.required_documents?.length || 0 },
    { key: 'show_on_public_site', label: tr('الموقع العام', 'Public site'), render: (row) => (row.show_on_public_site ? tr('ظاهرة', 'Visible') : tr('مخفية', 'Hidden')) },
    { key: 'is_active', label: tr('الحالة', 'Status'), render: statusCell },
    {
      key: 'actions',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'service', item: row })} type="button">
              {tr('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openServiceForm(row.id)} type="button">
                {tr('تعديل', 'Edit')}
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'service', item: row })}
                type="button"
              >
                {tr('حذف', 'Delete')}
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
      label: tr('الوثيقة', 'Document'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{isArabic ? row.name_ar : (row.name_en || row.name_ar)}</span>
          {deletedBadge(row)}
        </div>
      ),
    },
    { key: 'code', label: tr('الكود', 'Code') },
    {
      key: 'allowed_extensions',
      label: tr('الامتدادات', 'Extensions'),
      render: (row) => formatExtensionList(row.allowed_extensions, isArabic),
    },
    {
      key: 'max_file_size',
      label: tr('الحد الأقصى للحجم', 'Max size'),
      render: (row) => DOCUMENT_SIZE_OPTIONS.find((option) => option.value === Number(row.max_file_size || 0))?.label || tr('حجم مخصص', 'Custom size'),
    },
    { key: 'sort_order', label: tr('الترتيب', 'Order') },
    { key: 'is_active', label: tr('الحالة', 'Status'), render: statusCell },
    {
      key: 'actions',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore({ type: 'definition', item: row })} type="button">
              {tr('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openDefinitionForm(row.id)} type="button">
                {tr('تعديل', 'Edit')}
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete({ type: 'definition', item: row })}
                type="button"
              >
                {tr('حذف', 'Delete')}
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  const statusFilterOptions = (
    <>
      <option value="active">{tr('نشط', 'Active')}</option>
      <option value="deleted">{tr('محذوف', 'Deleted')}</option>
      <option value="all">{tr('الكل', 'All')}</option>
    </>
  )

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tr(
          'إدارة موحدة للفئات والخدمات وتعريفات الوثائق الرئيسية. الوثيقة تُنشأ مرة واحدة، ثم تُربط بالخدمة من داخل نموذج الخدمة نفسه.',
          'Unified management of categories, services and master document definitions. A document is created once, then linked to a service from the service form itself.',
        )}
        eyebrow={tr('الخدمات', 'Services')}
        icon={Settings}
        title={tr('إدارة الخدمات', 'Service management')}
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('الفئات', 'Categories')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{tr('نظّم كروت الموقع العام ومسارات العرض من نفس الصفحة.', 'Organise public site cards and browsing paths from the same page.')}</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('الخدمات', 'Services')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{tr('تحكم بالتسعير، مدة التسليم، الظهور العام، والبيانات المطلوبة من العميل.', 'Control pricing, delivery time, public visibility and the information required from the customer.')}</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('تعريفات الوثائق', 'Document definitions')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{tr('أنشئ تعريف الوثيقة مرة واحدة ثم اختره من الخدمات بدل تكرار نفس النصوص.', 'Create a document definition once, then pick it from services instead of retyping the same text.')}</p>
        </div>
      </section>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openCategoryForm()} type="button">
            {tr('+ فئة جديدة', '+ New category')}
          </button>
        }
        description={tr('أنشئ الفئات وعدّلها وعطّلها من شاشة الخدمات نفسها.', 'Create, edit and deactivate categories from the services screen itself.')}
        icon={FolderTree}
        title={tr('الفئات', 'Categories')}
      >
        <DataTable
          columns={categoryColumns}
          emptyDescription={tr('أضف أول فئة لتنظيم الخدمات.', 'Add the first category to organise services.')}
          emptyTitle={tr('لا توجد فئات', 'No categories')}
          loading={categoriesLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={categories}
          toolbar={
            <div className="grid gap-3 md:grid-cols-1">
              <select aria-label={tr('حالة التصنيفات', 'Category status')} className="field" value={categoryStatus} onChange={(event) => setCategoryStatus(event.target.value)}>
                {statusFilterOptions}
              </select>
            </div>
          }
        />
      </SectionCard>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openServiceForm()} type="button">
            {isArabic ? '+ خدمة جديدة' : '+ New service'}
          </button>
        }
        description={tr(
          'كل خصائص الخدمة الأساسية موجودة هنا، بما فيها اختيار الوثائق الرئيسية وآلية عرض الأسعار للعامة.',
          'All core service attributes live here, including master document selection and how prices are shown to the public.',
        )}
        icon={Settings}
        title={tr('الخدمات', 'Services')}
      >
        <DataTable
          columns={serviceColumns}
          emptyDescription={tr('أضف أول خدمة لتظهر في الموقع ولوحات التشغيل.', 'Add the first service so it appears on the site and operational boards.')}
          emptyTitle={tr('لا توجد خدمات', 'No services')}
          loading={servicesLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={services}
          toolbar={
            <div className="grid gap-3 md:grid-cols-2">
              <select aria-label={tr('حالة الخدمات', 'Service status')} className="field" value={serviceStatus} onChange={(event) => setServiceStatus(event.target.value)}>
                {statusFilterOptions}
              </select>
              <select aria-label={tr('تصفية حسب التصنيف', 'Filter by category')} className="field" value={serviceFilterCategory} onChange={(event) => setServiceFilterCategory(event.target.value)}>
                <option value="">{tr('كل الفئات', 'All categories')}</option>
                {categories.filter((category) => !category.is_deleted).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.full_path_name || (isArabic ? category.name_ar : (category.name_en || category.name_ar))}
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
            {tr('+ تعريف وثيقة', '+ Document definition')}
          </button>
        }
        description={tr('هذه هي القائمة الرئيسية التي يختار منها المسؤول الوثائق المطلوبة لكل خدمة.', 'This is the master list the admin picks required documents from for each service.')}
        icon={Files}
        title={tr('تعريفات الوثائق', 'Document definitions')}
      >
        <DataTable
          columns={definitionColumns}
          emptyDescription={tr('أضف أول تعريف وثيقة رئيسي.', 'Add the first master document definition.')}
          emptyTitle={tr('لا توجد تعريفات وثائق', 'No document definitions')}
          loading={definitionsLoading}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={definitions}
          toolbar={
            <div className="grid gap-3 md:grid-cols-1">
              <select aria-label={tr('حالة التعريفات', 'Definition status')} className="field" value={definitionStatus} onChange={(event) => setDefinitionStatus(event.target.value)}>
                {statusFilterOptions}
              </select>
            </div>
          }
        />
      </SectionCard>

      <FormModal
        description={tr('عدّل بيانات الفئة من هنا بدل توزيعها على شاشة أخرى.', 'Edit category details here instead of spreading them across another screen.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-category-form" type="submit">
              {selectedCategory ? tr('حفظ التعديلات', 'Save changes') : tr('إضافة الفئة', 'Add category')}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'category'}
        size="lg"
        title={selectedCategory ? tr(`تعديل الفئة: ${selectedCategory.name_ar}`, `Edit category: ${selectedCategory.name_en || selectedCategory.name_ar}`) : tr('فئة جديدة', 'New category')}
      >
        <form className="space-y-4" id="service-category-form" onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={tr('الاسم بالعربية', 'Name (Arabic)')}>
              <input className="field" {...categoryForm.register('name_ar', { required: true })} />
            </Field>
            <Field label={tr('الاسم بالإنجليزية', 'Name (English)')}>
              <input className="field" {...categoryForm.register('name_en', { required: true })} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint={tr('إذا تركته فارغاً سيُولد من الاسم.', 'Generated from the name when left blank.')} label={tr('المعرّف', 'Slug')}>
              <input
                className="field"
                {...categoryForm.register('slug', {
                  onChange: () => setCategorySlugEdited(true),
                })}
              />
            </Field>
            <Field label={tr('الأيقونة', 'Icon')}>
              <input
                className="field"
                {...categoryForm.register('icon', {
                  onChange: () => setCategoryIconEdited(true),
                })}
              />
            </Field>
          </div>
          <Field label={tr('الوصف بالعربية', 'Description (Arabic)')}>
            <textarea className="field min-h-24" {...categoryForm.register('description_ar')} />
          </Field>
          <Field label={tr('الوصف بالإنجليزية', 'Description (English)')}>
            <textarea className="field min-h-24" {...categoryForm.register('description_en')} />
          </Field>
          <input type="hidden" {...categoryForm.register('clear_image')} />
          <ImageUploadField
            accept="image/jpeg,image/png,image/webp"
            clearLabel={isArabic ? 'إزالة صورة الفئة' : 'Remove category image'}
            error={categoryForm.formState.errors.image}
            fileList={categoryImageFile}
            fileUrl={categoryClearImage ? '' : selectedCategory?.image_url || selectedCategory?.image || ''}
            hint={isArabic ? 'اختياري. تُعرض على بطاقات الفئات في الموقع العام. JPEG أو PNG أو WebP، حتى 5 ميجابايت.' : 'Optional. Shown on public category cards. JPEG, PNG or WebP, up to 5 MB.'}
            label={isArabic ? 'صورة الفئة' : 'Category Image'}
            onClear={
              selectedCategory?.image_url || selectedCategory?.image
                ? () => {
                    categoryForm.setValue('clear_image', true, { shouldDirty: true })
                    categoryForm.setValue('image', undefined, { shouldDirty: true })
                  }
                : undefined
            }
            registration={categoryForm.register('image')}
          />
          <Field label={tr('ترتيب العرض', 'Display order')}>
            <input className="field" type="number" {...categoryForm.register('display_order')} />
          </Field>
          <CheckboxField label={tr('الفئة نشطة', 'Category is active')} registration={categoryForm.register('is_active')} />
        </form>
      </FormModal>

      <FormModal
        description={tr(
          'تحرير كامل للخدمة: بياناتها، التسعير العام، التسليم، الوثائق الرئيسية، وبنية البيانات المطلوبة.',
          'Full service editing: details, public pricing, delivery, master documents and the required information structure.',
        )}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-form" type="submit">
              {selectedService ? tr('حفظ التعديلات', 'Save changes') : (isArabic ? 'إضافة الخدمة' : 'Add service')}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'service'}
        size="xl"
        title={selectedService ? tr(`تعديل الخدمة: ${selectedService.name_ar}`, `Edit service: ${selectedService.name_en || selectedService.name_ar}`) : tr('خدمة جديدة', 'New service')}
      >
        <form className="space-y-5" id="service-form" onSubmit={serviceForm.handleSubmit(handleServiceSubmit)}>
          <Field label={tr('الفئة', 'Category')}>
            <select className="field" {...serviceForm.register('category_id', { required: true })}>
              <option value="">{tr('اختر الفئة', 'Select category')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {isArabic ? category.name_ar : (category.name_en || category.name_ar)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={tr('اسم الخدمة بالعربية', 'Service name (Arabic)')}>
              <input className="field" {...serviceForm.register('name_ar', { required: true })} />
            </Field>
            <Field label={tr('اسم الخدمة بالإنجليزية', 'Service name (English)')}>
              <input className="field" {...serviceForm.register('name_en')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field hint={tr('إذا تركته فارغاً سيُولد من الاسم.', 'Generated from the name when left blank.')} label={tr('المعرّف', 'Slug')}>
              <input
                className="field"
                {...serviceForm.register('slug', {
                  onChange: () => setServiceSlugEdited(true),
                })}
              />
            </Field>
            <Field label={tr('ترتيب العرض', 'Display order')}>
              <input className="field" type="number" {...serviceForm.register('display_order')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={tr('وصف مختصر بالعربية', 'Short description (Arabic)')}>
              <input className="field" {...serviceForm.register('short_description_ar')} />
            </Field>
            <Field label={tr('وصف مختصر بالإنجليزية', 'Short description (English)')}>
              <input className="field" {...serviceForm.register('short_description_en')} />
            </Field>
          </div>

          <Field label={tr('الوصف بالعربية', 'Description (Arabic)')}>
            <textarea className="field min-h-28" {...serviceForm.register('description_ar', { required: true })} />
          </Field>
          <Field label={tr('الوصف بالإنجليزية', 'Description (English)')}>
            <textarea className="field min-h-28" {...serviceForm.register('description_en')} />
          </Field>

          <input type="hidden" {...serviceForm.register('clear_image')} />
          <ImageUploadField
            accept="image/jpeg,image/png,image/webp"
            clearLabel={isArabic ? 'إزالة صورة الخدمة' : 'Remove / reset service image'}
            error={serviceForm.formState.errors.image}
            fileList={serviceImageFile}
            fileUrl={serviceClearImage ? '' : selectedService?.image_url || selectedService?.image || ''}
            hint={isArabic ? 'اختياري. تظهر على بطاقات الخدمة وصفحة تفاصيل الخدمة في الموقع العام. JPEG أو PNG أو WebP، حتى 5 ميجابايت. عند عدم وجود صورة مرفوعة تُعرض صورة نظام افتراضية بهوية خلصني (ليست صورة حقيقية للخدمة).' : 'Optional. Appears on public service cards and the service detail page. JPEG, PNG or WebP, up to 5 MB. When no image is uploaded, a Khalsni-branded system fallback cover is shown (not a real photo of the service).'}
            label={isArabic ? 'صورة الخدمة المرفوعة' : 'Uploaded service image'}
            onClear={
              selectedService?.image_url || selectedService?.image
                ? () => {
                    serviceForm.setValue('clear_image', true, { shouldDirty: true })
                    serviceForm.setValue('image', undefined, { shouldDirty: true })
                  }
                : undefined
            }
            registration={serviceForm.register('image')}
          />
          {selectedService?.image_url || selectedService?.image ? (
            <p className="-mt-2 text-xs text-slate-500">
              {tr('الحالة: صورة مرفوعة خاصة بالخدمة.', 'Status: an uploaded image specific to this service.')}
            </p>
          ) : (
            <div className="-mt-2 flex items-center gap-3 rounded-2xl border border-border bg-brand-50/40 p-3">
              <img
                alt=""
                className="h-14 w-24 shrink-0 rounded-xl object-cover ring-1 ring-border"
                src={resolveServiceImage({
                  slug: watchedServiceSlug || selectedService?.slug,
                  category: categories.find((item) => String(item.id) === String(watchedCategoryId)) || selectedService?.category,
                }).url}
              />
              <p className="text-xs text-slate-500">
                {tr(
                  'لا توجد صورة مرفوعة. هذه هي الصورة الافتراضية للنظام التي تظهر للعملاء حالياً — ارفع صورة حقيقية لاستبدالها دون أي تغيير في الكود.',
                  'No custom image uploaded. This is the current public system fallback shown to customers — upload a real image to replace it, no code change needed.',
                )}
              </p>
            </div>
          )}

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
              <h3 className="text-base font-bold text-ink">{tr('تعريفات الوثائق المطلوبة', 'Required document definitions')}</h3>
              <p className="text-sm leading-6 text-slate-600">{tr('اختر من القائمة الرئيسية. إذا كانت الوثيقة غير موجودة، أنشئها أولاً من قسم تعريفات الوثائق.', 'Pick from the master list. If a document is missing, create it first in the document definitions section.')}</p>
            </div>
            {definitions.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {definitions.map((definition) => (
                  <label key={definition.id} className="rounded-2xl border border-border bg-white p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">{tr('تعريف وثيقة', 'Document definition')}</p>
                        <p className="font-semibold text-ink">{isArabic ? definition.name_ar : (definition.name_en || definition.name_ar)}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{definition.code}</p>
                        {(isArabic ? definition.description_ar : definition.description_en || definition.description_ar) ? (
                          <p className="mt-2 text-slate-500">{isArabic ? definition.description_ar : (definition.description_en || definition.description_ar)}</p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">{formatDefinitionSummary(definition, isArabic)}</p>
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
                {tr('لا توجد تعريفات وثائق بعد. أضف تعريفاً رئيسياً ثم عد لاختياره داخل الخدمة.', 'No document definitions yet. Add a master definition then come back to select it inside the service.')}
              </div>
            )}
            <p className="text-sm text-slate-500">{tr(`المحدد الآن: ${selectedRequiredDocumentIds.length} تعريف`, `Selected: ${selectedRequiredDocumentIds.length} definition(s)`)}</p>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold text-ink">{tr('التسعير والظهور العام', 'Pricing and public visibility')}</h3>
              <p className="text-sm leading-6 text-slate-600">{tr('كل الرسوم تحفظ داخلياً دائماً، لكنك تختار ما يظهر على الموقع العام.', 'All fees are always stored internally, but you choose what appears on the public site.')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field hint={tr(`جميع الأسعار تستخدم ${SERVICE_CURRENCY_CODE}.`, `All prices use ${SERVICE_CURRENCY_CODE}.`)} label={tr('العملة', 'Currency')}>
                <input className="field bg-slate-50 text-slate-600" readOnly value={SERVICE_CURRENCY_CODE} />
              </Field>
              <Field label={tr(`السعر الأساسي (${SERVICE_CURRENCY_CODE})`, `Base price (${SERVICE_CURRENCY_CODE})`)}>
                <input className="field" step="0.01" type="number" {...serviceForm.register('base_price')} />
              </Field>
              <Field label={tr(`رسوم الشركة (${SERVICE_CURRENCY_CODE})`, `Company fee (${SERVICE_CURRENCY_CODE})`)}>
                <input className="field" step="0.01" type="number" {...serviceForm.register('service_fee')} />
              </Field>
              <Field label={tr(`الرسوم الحكومية (${SERVICE_CURRENCY_CODE})`, `Government fee (${SERVICE_CURRENCY_CODE})`)}>
                <input className="field" step="0.01" type="number" {...serviceForm.register('government_fee')} />
              </Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <CheckboxField label={tr('إظهار السعر الإجمالي للعامة', 'Show total price publicly')} registration={serviceForm.register('show_total_price_public')} />
              <CheckboxField label={tr('إظهار الرسوم الحكومية للعامة', 'Show government fee publicly')} registration={serviceForm.register('show_government_fee_public')} />
              <CheckboxField label={tr('إظهار رسوم الشركة للعامة', 'Show company fee publicly')} registration={serviceForm.register('show_company_fee_public')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('ملاحظة السعر بالعربية', 'Price note (Arabic)')}>
                <textarea className="field min-h-24" {...serviceForm.register('public_price_note_ar')} />
              </Field>
              <Field label={tr('ملاحظة السعر بالإنجليزية', 'Price note (English)')}>
                <textarea className="field min-h-24" {...serviceForm.register('public_price_note_en')} />
              </Field>
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] border border-border bg-slate-50/60 p-4 sm:p-5">
            <div>
              <h3 className="text-base font-bold text-ink">{tr('التسليم', 'Delivery')}</h3>
              <p className="text-sm leading-6 text-slate-600">{tr('يمكنك استخدام مدة متوقعة أو نطاق زمني للخدمات التي تتأثر بجهة خارجية.', 'Use an expected duration or an expected range for services that depend on an external party.')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={tr('نوع التسليم', 'Delivery type')}>
                <select className="field" {...serviceForm.register('delivery_time_mode')}>
                  <option value="duration">{tr('مدة متوقعة', 'Expected duration')}</option>
                  <option value="duration_range">{tr('نطاق زمني متوقع', 'Expected range')}</option>
                </select>
              </Field>
              <Field label={tr('نوع السعر', 'Price type')}>
                <select className="field" {...serviceForm.register('price_type')}>
                  <option value="fixed">{tr('ثابت', 'Fixed')}</option>
                  <option value="starts_from">{tr('يبدأ من', 'Starts from')}</option>
                  <option value="quotation">{tr('عرض سعر', 'Quotation')}</option>
                  <option value="free">{tr('مجاني', 'Free')}</option>
                </select>
              </Field>
              <Field label={tr('وحدة المدة', 'Duration unit')}>
                <select className="field" {...serviceForm.register('estimated_duration_unit')}>
                  <option value="hours">{tr('ساعات', 'Hours')}</option>
                  <option value="days">{tr('أيام', 'Days')}</option>
                  <option value="weeks">{tr('أسابيع', 'Weeks')}</option>
                </select>
              </Field>
            </div>

            {deliveryTimeMode === 'duration_range' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={tr('من', 'From')}>
                  <input className="field" min="1" type="number" {...serviceForm.register('estimated_duration_min')} />
                </Field>
                <Field label={tr('إلى', 'To')}>
                  <input className="field" min="1" type="number" {...serviceForm.register('estimated_duration_max')} />
                </Field>
              </div>
            ) : (
              <Field label={tr('مدة التنفيذ', 'Execution time')}>
                <input className="field" min="1" type="number" {...serviceForm.register('estimated_duration')} />
              </Field>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tr('ملاحظة التسليم بالعربية', 'Delivery note (Arabic)')}>
                <textarea className="field min-h-24" {...serviceForm.register('delivery_note_ar')} />
              </Field>
              <Field label={tr('ملاحظة التسليم بالإنجليزية', 'Delivery note (English)')}>
                <textarea className="field min-h-24" {...serviceForm.register('delivery_note_en')} />
              </Field>
            </div>
          </div>

          <Field label={tr('الشروط بالعربية', 'Terms (Arabic)')}>
            <textarea className="field min-h-24" {...serviceForm.register('terms_ar')} />
          </Field>
          <Field label={tr('الشروط بالإنجليزية', 'Terms (English)')}>
            <textarea className="field min-h-24" {...serviceForm.register('terms_en')} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label={tr('الخدمة نشطة', 'Service is active')} registration={serviceForm.register('is_active')} />
            <CheckboxField label={tr('تظهر في الموقع العام', 'Visible on public site')} registration={serviceForm.register('show_on_public_site')} />
            <CheckboxField label={tr('تنفذ أونلاين', 'Delivered online')} registration={serviceForm.register('is_online')} />
            <CheckboxField label={tr('تحتاج مزود خدمة', 'Requires a service provider')} registration={serviceForm.register('provider_required')} />
            <CheckboxField label={tr('تحتاج مراجعة يدوية', 'Requires manual review')} registration={serviceForm.register('requires_manual_review')} />
            <CheckboxField label={tr('تحتاج موعد', 'Requires an appointment')} registration={serviceForm.register('requires_appointment')} />
            <CheckboxField label={tr('خدمة مميزة', 'Featured service')} registration={serviceForm.register('is_featured')} />
          </div>
        </form>
      </FormModal>

      <FormModal
        description={tr('أنشئ أو عدّل تعريف الوثيقة الرئيسي الذي سيُستخدم داخل الخدمات.', 'Create or edit the master document definition used inside services.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="document-definition-form" type="submit">
              {selectedDefinition ? tr('حفظ التعديلات', 'Save changes') : tr('إضافة التعريف', 'Add definition')}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'definition'}
        size="lg"
        title={selectedDefinition ? tr(`تعديل التعريف: ${selectedDefinition.name_ar}`, `Edit definition: ${selectedDefinition.name_en || selectedDefinition.name_ar}`) : tr('تعريف وثيقة جديد', 'New document definition')}
      >
        <form className="space-y-4" id="document-definition-form" onSubmit={definitionForm.handleSubmit(handleDefinitionSubmit)}>
          <p className="rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-xs text-slate-600">
            {tr(
              'هذا تعريف وثيقة (نموذج بيانات رئيسي) — وليس ملفاً رفعه عميل. الملفات التي يرفعها العملاء تُدار من داخل الطلبات.',
              'This is a document definition (a master data template) — not a file uploaded by a customer. Customer-uploaded files are managed inside orders.',
            )}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint={tr('كود ثابت يُستخدم في الربط والتحقق.', 'A stable code used for linking and verification.')} label={tr('الكود', 'Code')}>
              <input className="field font-mono" {...definitionForm.register('code', { required: true })} />
            </Field>
            <Field label={tr('ترتيب العرض', 'Display order')}>
              <input className="field" type="number" {...definitionForm.register('sort_order')} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={tr('الاسم بالعربية', 'Name (Arabic)')}>
              <input className="field" {...definitionForm.register('name_ar', { required: true })} />
            </Field>
            <Field label={tr('الاسم بالإنجليزية', 'Name (English)')}>
              <input className="field" {...definitionForm.register('name_en')} />
            </Field>
          </div>
          <Field label={tr('الوصف بالعربية', 'Description (Arabic)')}>
            <textarea className="field min-h-24" {...definitionForm.register('description_ar')} />
          </Field>
          <Field label={tr('الوصف بالإنجليزية', 'Description (English)')}>
            <textarea className="field min-h-24" {...definitionForm.register('description_en')} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint={tr('اختر أنواع الملفات التي يسمح برفعها.', 'Choose which file types can be uploaded.')} label={tr('أنواع الملفات المسموحة', 'Allowed file types')}>
              <div className="grid gap-3 md:grid-cols-1">
                {DOCUMENT_EXTENSION_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                    <input
                      checked={selectedDefinitionExtensions.includes(option.value)}
                      onChange={(event) =>
                        definitionForm.setValue(
                          'allowed_extensions',
                          event.target.checked
                            ? [...selectedDefinitionExtensions, option.value]
                            : selectedDefinitionExtensions.filter((item) => item !== option.value),
                          { shouldDirty: true },
                        )
                      }
                      type="checkbox"
                    />
                    <span>{isArabic ? option.label_ar : option.label_en}</span>
                  </label>
                ))}
              </div>
            </Field>
            <Field hint={tr('اختر الحد الأقصى من قائمة جاهزة.', 'Pick the maximum from a ready-made list.')} label={tr('الحد الأقصى لحجم الملف', 'Maximum file size')}>
              <select className="field" {...definitionForm.register('max_file_size')}>
                {DOCUMENT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <CheckboxField label={tr('التعريف نشط', 'Definition is active')} registration={definitionForm.register('is_active')} />
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
