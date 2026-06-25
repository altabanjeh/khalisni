import { Files, FolderTree, Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
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
  terms_ar: '',
  terms_en: '',
  base_price: '0.00',
  government_fee: '0.00',
  service_fee: '0.00',
  estimated_duration: 1,
  estimated_duration_unit: 'days',
  price_type: 'fixed',
  is_online: true,
  provider_required: true,
  requires_manual_review: true,
  requires_appointment: false,
  is_featured: false,
  is_active: true,
  display_order: 0,
}

const defaultDocumentValues = {
  service_id: '',
  document_type: '',
  name_ar: '',
  name_en: '',
  allowed_extensions_text: '.pdf, .jpg, .png',
  max_file_size: 10485760,
  is_required: true,
  requires_verification: true,
  client_can_replace_file: true,
  provider_can_view_file: false,
  display_order: 0,
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
  { value: 'text', label: 'نص قصير' },
  { value: 'textarea', label: 'نص طويل' },
  { value: 'number', label: 'رقم' },
  { value: 'email', label: 'بريد إلكتروني' },
  { value: 'tel', label: 'رقم هاتف' },
  { value: 'date', label: 'تاريخ' },
  { value: 'select', label: 'قائمة خيارات' },
  { value: 'checkbox', label: 'صح / خطأ' },
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
      errors.push(`الحقل ${index + 1}: أضف الاسم الذي سيظهر للمستخدم.`)
    }

    if (normalizeSchemaFieldType(field.type) === 'select' && !parseSchemaOptionsText(field.options_text).length) {
      errors.push(`الحقل ${index + 1}: أضف خيارات القائمة، كل خيار في سطر منفصل.`)
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
          <h3 className="text-base font-bold text-ink">البيانات المطلوبة من العميل</h3>
          <p className="text-sm leading-6 text-slate-600">
            أضف الحقول التي سيملؤها العميل عند طلب الخدمة، وسيتم توليد JSON تلقائياً في الخلفية.
          </p>
        </div>
        <button className="btn-secondary whitespace-nowrap" onClick={onAddField} type="button">
          + حقل مطلوب
        </button>
      </div>

      {fields.length ? (
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.row_id} className="space-y-4 rounded-[1.5rem] border border-border bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">الحقل {index + 1}</p>
                  <p className="text-xs text-slate-500">
                    المعرّف المولّد: <span className="font-mono text-ink">{getGeneratedSchemaFieldName(field, index)}</span>
                  </p>
                </div>
                <button
                  className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                  onClick={() => onRemoveField(field.row_id)}
                  type="button"
                >
                  حذف الحقل
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الاسم الظاهر بالعربية">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label_ar', event.target.value)}
                    placeholder="مثال: رقم الجواز"
                    value={field.label_ar}
                  />
                </Field>
                <Field hint="يُستخدم أيضاً لتوليد معرّف مناسب إذا تُرك الحقل التقني فارغاً." label="الاسم الظاهر بالإنجليزية">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'label', event.target.value)}
                    placeholder="Passport number"
                    value={field.label}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field hint="اختياري. إن تُرك فارغاً سنولّده تلقائياً." label="المعرّف التقني">
                  <input
                    className="field font-mono"
                    dir="ltr"
                    onChange={(event) => onChangeField(field.row_id, 'technical_name', event.target.value)}
                    placeholder="passport_number"
                    value={field.technical_name}
                  />
                </Field>
                <Field label="نوع الحقل">
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
                <Field label="نص مساعد داخل الحقل">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'placeholder', event.target.value)}
                    placeholder="أدخل رقم الجواز"
                    value={field.placeholder}
                  />
                </Field>
                <Field label="ملاحظة توضيحية">
                  <input
                    className="field"
                    onChange={(event) => onChangeField(field.row_id, 'help_text', event.target.value)}
                    placeholder="كما هو مكتوب في الوثيقة الرسمية"
                    value={field.help_text}
                  />
                </Field>
              </div>

              {field.type === 'select' ? (
                <Field hint="كل خيار في سطر منفصل. سيُستخدم النص نفسه كقيمة واسم ظاهر." label="خيارات القائمة">
                  <textarea
                    className="field min-h-24"
                    onChange={(event) => onChangeField(field.row_id, 'options_text', event.target.value)}
                    placeholder={'ذكر\nأنثى'}
                    value={field.options_text}
                  />
                </Field>
              ) : null}

              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
                <span>الحقل مطلوب عند الطلب</span>
                <input
                  checked={field.required}
                  onChange={(event) => onChangeField(field.row_id, 'required', event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border bg-white px-4 py-6 text-sm text-slate-500">
          إذا كانت الخدمة تحتاج بيانات إضافية من العميل فأضفها من هنا. إذا لم تحتج أي حقول إضافية سيبقى JSON فارغاً.
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

function ServicesManagementPage() {
  const { toast } = useToast()
  const [serviceFilterCategory, setServiceFilterCategory] = useState('')
  const { data: categories = [], loading: categoriesLoading, reload: reloadCategories } = useAsyncData(() => api.getAdminCategories(), [], [])
  const { data: services = [], loading: servicesLoading, reload: reloadServices } = useAsyncData(
    () => api.getAdminServices(serviceFilterCategory ? { category: serviceFilterCategory } : {}),
    [serviceFilterCategory],
    [],
  )
  const { data: documentRules = [], loading: documentsLoading, reload: reloadDocuments } = useAsyncData(() => api.getAdminServiceDocuments(), [], [])

  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [activeModal, setActiveModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [serviceSchemaFields, setServiceSchemaFields] = useState([])
  const [serviceSchemaErrors, setServiceSchemaErrors] = useState([])
  const [categorySlugEdited, setCategorySlugEdited] = useState(false)
  const [categoryIconEdited, setCategoryIconEdited] = useState(false)
  const [serviceSlugEdited, setServiceSlugEdited] = useState(false)

  const categoryForm = useForm({ defaultValues: defaultCategoryValues })
  const serviceForm = useForm({ defaultValues: defaultServiceValues })
  const documentForm = useForm({ defaultValues: defaultDocumentValues })
  const categoryNameAr = categoryForm.watch('name_ar')
  const categoryNameEn = categoryForm.watch('name_en')
  const serviceNameAr = serviceForm.watch('name_ar')
  const serviceNameEn = serviceForm.watch('name_en')

  const selectedCategory = useMemo(
    () => categories.find((item) => String(item.id) === String(selectedCategoryId)) || null,
    [categories, selectedCategoryId],
  )
  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId],
  )
  const selectedDocument = useMemo(
    () => documentRules.find((item) => String(item.id) === String(selectedDocumentId)) || null,
    [documentRules, selectedDocumentId],
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
            terms_ar: selectedService.terms_ar || '',
            terms_en: selectedService.terms_en || '',
            base_price: selectedService.base_price ?? '0.00',
            government_fee: selectedService.government_fee ?? '0.00',
            service_fee: selectedService.service_fee ?? '0.00',
            estimated_duration: selectedService.estimated_duration ?? 1,
            estimated_duration_unit: selectedService.estimated_duration_unit || 'days',
            price_type: selectedService.price_type || 'fixed',
            is_online: Boolean(selectedService.is_online),
            provider_required: Boolean(selectedService.provider_required),
            requires_manual_review: Boolean(selectedService.requires_manual_review),
            requires_appointment: Boolean(selectedService.requires_appointment),
            is_featured: Boolean(selectedService.is_featured),
            is_active: Boolean(selectedService.is_active),
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
    documentForm.reset(
      selectedDocument
        ? {
            service_id: selectedDocument.service_id || '',
            document_type: selectedDocument.document_type || '',
            name_ar: selectedDocument.name_ar || '',
            name_en: selectedDocument.name_en || '',
            allowed_extensions_text: (selectedDocument.allowed_extensions || []).join(', '),
            max_file_size: selectedDocument.max_file_size ?? 10485760,
            is_required: Boolean(selectedDocument.is_required),
            requires_verification: Boolean(selectedDocument.requires_verification),
            client_can_replace_file: Boolean(selectedDocument.client_can_replace_file),
            provider_can_view_file: Boolean(selectedDocument.provider_can_view_file),
            display_order: selectedDocument.display_order ?? 0,
            is_active: Boolean(selectedDocument.is_active),
          }
        : defaultDocumentValues,
    )
  }, [documentForm, selectedDocument])

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
    setSelectedDocumentId(null)
    setServiceSchemaFields([])
    setServiceSchemaErrors([])
    categoryForm.reset(defaultCategoryValues)
    serviceForm.reset(defaultServiceValues)
    documentForm.reset(defaultDocumentValues)
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

  function openDocumentForm(id = null) {
    setSelectedDocumentId(id)
    setActiveModal('document')
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
        toast('تم تحديث الفئة.', 'success')
      } else {
        await api.createAdminCategory(payload)
        toast('تم إنشاء الفئة.', 'success')
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
          message: 'صيغة JSON غير صالحة.',
        })
        setSubmitting(false)
        return
      }

      if (!Array.isArray(requiredInformationSchema)) {
        serviceForm.setError('required_information_schema_text', {
          type: 'manual',
          message: 'يجب أن تكون البنية مصفوفة JSON.',
        })
        setSubmitting(false)
        return
      }

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
        terms_ar: values.terms_ar.trim(),
        terms_en: values.terms_en.trim(),
        base_price: values.base_price,
        government_fee: values.government_fee,
        service_fee: values.service_fee,
        estimated_duration: Number(values.estimated_duration || 1),
        estimated_duration_unit: values.estimated_duration_unit,
        price_type: values.price_type,
        is_online: Boolean(values.is_online),
        provider_required: Boolean(values.provider_required),
        requires_manual_review: Boolean(values.requires_manual_review),
        requires_appointment: Boolean(values.requires_appointment),
        is_featured: Boolean(values.is_featured),
        is_active: Boolean(values.is_active),
        display_order: Number(values.display_order || 0),
      }

      if (selectedService) {
        await api.updateAdminService(selectedService.id, payload)
        toast('تم تحديث الخدمة.', 'success')
      } else {
        await api.createAdminService(payload)
        toast('تم إنشاء الخدمة.', 'success')
      }

      reloadServices()
      reloadDocuments()
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

  async function handleDocumentSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        service_id: Number(values.service_id),
        document_type: values.document_type.trim(),
        name_ar: values.name_ar.trim(),
        name_en: values.name_en.trim(),
        allowed_extensions: toExtensionArray(values.allowed_extensions_text),
        max_file_size: Number(values.max_file_size || 0),
        is_required: Boolean(values.is_required),
        requires_verification: Boolean(values.requires_verification),
        client_can_replace_file: Boolean(values.client_can_replace_file),
        provider_can_view_file: Boolean(values.provider_can_view_file),
        display_order: Number(values.display_order || 0),
        is_active: Boolean(values.is_active),
      }

      if (selectedDocument) {
        await api.updateAdminServiceDocument(selectedDocument.id, payload)
        toast('تم تحديث قاعدة الوثيقة.', 'success')
      } else {
        await api.createAdminServiceDocument(payload)
        toast('تم إنشاء قاعدة الوثيقة.', 'success')
      }

      reloadDocuments()
      closeModal()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return

    const { type, item } = pendingDelete
    setPendingDelete(null)

    try {
      if (type === 'category') {
        await api.deleteAdminCategory(item.id)
        reloadCategories()
        reloadServices()
        toast('تم تعطيل الفئة.', 'success')
      }

      if (type === 'service') {
        await api.deleteAdminService(item.id)
        reloadServices()
        reloadDocuments()
        toast('تم تعطيل الخدمة.', 'success')
      }

      if (type === 'document') {
        await api.deleteAdminServiceDocument(item.id)
        reloadDocuments()
        toast('تم تعطيل قاعدة الوثيقة.', 'success')
      }

      if (String(selectedCategoryId) === String(item.id) || String(selectedServiceId) === String(item.id) || String(selectedDocumentId) === String(item.id)) {
        closeModal()
      }
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const categoryColumns = [
    { key: 'name_ar', label: 'الفئة' },
    { key: 'slug', label: 'المعرف' },
    { key: 'display_order', label: 'الترتيب' },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشطة' : 'معطلة') },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openCategoryForm(row.id)} type="button">
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => setPendingDelete({ type: 'category', item: row })}
            type="button"
          >
            تعطيل
          </button>
        </div>
      ),
    },
  ]

  const serviceColumns = [
    { key: 'name_ar', label: 'الخدمة' },
    { key: 'category_name', label: 'الفئة', render: (row) => row.category?.name_ar || row.category_name || 'غير محدد' },
    { key: 'service_fee', label: 'رسوم الخدمة' },
    { key: 'government_fee', label: 'الرسوم الحكومية' },
    { key: 'duration_display', label: 'المدة' },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشطة' : 'معطلة') },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openServiceForm(row.id)} type="button">
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => setPendingDelete({ type: 'service', item: row })}
            type="button"
          >
            تعطيل
          </button>
        </div>
      ),
    },
  ]

  const documentColumns = [
    {
      key: 'service_name',
      label: 'الخدمة',
      render: (row) => row.service_name || services.find((service) => String(service.id) === String(row.service_id))?.name_ar || 'غير محدد',
    },
    { key: 'name_ar', label: 'اسم الوثيقة' },
    { key: 'document_type', label: 'النوع التقني' },
    {
      key: 'allowed_extensions',
      label: 'الامتدادات',
      render: (row) => (row.allowed_extensions || []).join(', ') || 'غير محدد',
    },
    {
      key: 'is_required',
      label: 'الإلزام',
      render: (row) => (row.is_required ? 'إلزامية' : 'اختيارية'),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openDocumentForm(row.id)} type="button">
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => setPendingDelete({ type: 'document', item: row })}
            type="button"
          >
            تعطيل
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="تم تجميع كل CRUD الخاص بالخدمات في هذه الشاشة نفسها: الفئات، الخدمات، ووثائقها المطلوبة. لم تعد هذه العناصر موزعة بين صفحات أخرى أو مكررة داخل شاشة CMS."
        eyebrow="الخدمات"
        icon={Settings}
        title="إدارة الخدمات"
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">الفئات</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">إدارة مجموعات الخدمات ومفاتيح العرض وترتيبها من نفس الصفحة.</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">الخدمات</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">تحرير البيانات التجارية والتشغيلية الكاملة بدلا من نموذج مختصر ناقص الحقول.</p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">الوثائق المطلوبة</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">قواعد الوثائق الآن في مكانها الصحيح مع الخدمة بدلا من أن تبقى مفقودة من الإدارة.</p>
        </div>
      </section>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openCategoryForm()} type="button">
            + فئة جديدة
          </button>
        }
        description="أنشئ الفئات وعدلها وعطّلها من شاشة الخدمات نفسها."
        icon={FolderTree}
        title="الفئات"
      >
        <DataTable
          columns={categoryColumns}
          emptyDescription="أضف أول فئة لتنظيم الخدمات."
          emptyTitle="لا توجد فئات"
          loading={categoriesLoading}
          rows={categories}
        />
      </SectionCard>

      <SectionCard
        action={
          <button className="btn-primary" onClick={() => openServiceForm()} type="button">
            + خدمة جديدة
          </button>
        }
        description="هذه الشاشة تملك الآن كامل CRUD للخدمة نفسها بكل تفاصيلها."
        icon={Settings}
        title="الخدمات"
      >
        <DataTable
          columns={serviceColumns}
          emptyDescription="أضف أول خدمة لتظهر في الموقع ولوحات المتابعة."
          emptyTitle="لا توجد خدمات"
          loading={servicesLoading}
          rows={services}
          toolbar={
            <div className="grid gap-3 md:grid-cols-2">
              <select className="field" value={serviceFilterCategory} onChange={(event) => setServiceFilterCategory(event.target.value)}>
                <option value="">كل الفئات</option>
                {categories.map((category) => (
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
          <button className="btn-primary" onClick={() => openDocumentForm()} type="button">
            + وثيقة مطلوبة
          </button>
        }
        description="كل خدمة يمكن أن تملك قواعد وثائقها من هنا مباشرة."
        icon={Files}
        title="الوثائق المطلوبة"
      >
        <DataTable
          columns={documentColumns}
          emptyDescription="أضف أول قاعدة وثيقة مطلوبة مرتبطة بخدمة."
          emptyTitle="لا توجد قواعد وثائق"
          loading={documentsLoading}
          rows={documentRules}
        />
      </SectionCard>

      <FormModal
        description="عدّل بيانات الفئة من هنا بدلا من توزيعها على شاشة أخرى."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-category-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedCategory ? 'حفظ التعديلات' : 'إضافة الفئة'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'category'}
        size="lg"
        title={selectedCategory ? `تعديل الفئة: ${selectedCategory.name_ar}` : 'فئة جديدة'}
      >
        <form className="space-y-4" id="service-category-form" onSubmit={categoryForm.handleSubmit(handleCategorySubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الاسم بالعربية">
              <input className="field" {...categoryForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="الاسم بالإنجليزية">
              <input className="field" {...categoryForm.register('name_en', { required: true })} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="إذا تركته فارغا سيُولد من الاسم." label="المعرف">
              <input
                className="field"
                {...categoryForm.register('slug', {
                  onChange: () => setCategorySlugEdited(true),
                })}
              />
            </Field>
            <Field label="الأيقونة">
              <input
                className="field"
                {...categoryForm.register('icon', {
                  onChange: () => setCategoryIconEdited(true),
                })}
              />
            </Field>
          </div>
          <Field label="الوصف بالعربية">
            <textarea className="field min-h-24" {...categoryForm.register('description_ar')} />
          </Field>
          <Field label="الوصف بالإنجليزية">
            <textarea className="field min-h-24" {...categoryForm.register('description_en')} />
          </Field>
          <Field label="ترتيب العرض">
            <input className="field" type="number" {...categoryForm.register('display_order')} />
          </Field>
          <CheckboxField label="الفئة نشطة" registration={categoryForm.register('is_active')} />
        </form>
      </FormModal>

      <FormModal
        description="تحرير كامل للخدمة: بياناتها، تسعيرها، شروطها، وبنية البيانات المطلوبة."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedService ? 'حفظ التعديلات' : 'إضافة الخدمة'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'service'}
        size="xl"
        title={selectedService ? `تعديل الخدمة: ${selectedService.name_ar}` : 'خدمة جديدة'}
      >
        <form className="space-y-5" id="service-form" onSubmit={serviceForm.handleSubmit(handleServiceSubmit)}>
          <Field label="الفئة">
            <select className="field" {...serviceForm.register('category_id', { required: true })}>
              <option value="">اختر الفئة</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الخدمة بالعربية">
              <input className="field" {...serviceForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="اسم الخدمة بالإنجليزية">
              <input className="field" {...serviceForm.register('name_en')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="إذا تركته فارغا سيُولد من الاسم." label="المعرف">
              <input
                className="field"
                {...serviceForm.register('slug', {
                  onChange: () => setServiceSlugEdited(true),
                })}
              />
            </Field>
            <Field label="ترتيب العرض">
              <input className="field" type="number" {...serviceForm.register('display_order')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="وصف مختصر بالعربية">
              <input className="field" {...serviceForm.register('short_description_ar')} />
            </Field>
            <Field label="وصف مختصر بالإنجليزية">
              <input className="field" {...serviceForm.register('short_description_en')} />
            </Field>
          </div>

          <Field label="الوصف بالعربية">
            <textarea className="field min-h-28" {...serviceForm.register('description_ar', { required: true })} />
          </Field>
          <Field label="الوصف بالإنجليزية">
            <textarea className="field min-h-28" {...serviceForm.register('description_en')} />
          </Field>

          <div className="space-y-2">
            <ServiceSchemaBuilder
              errorMessages={serviceSchemaErrors}
              fields={serviceSchemaFields}
              onAddField={addServiceSchemaField}
              onChangeField={updateServiceSchemaField}
              onRemoveField={removeServiceSchemaField}
            />
            <input type="hidden" {...serviceForm.register('required_information_schema_text')} />
          </div>
          {serviceForm.formState.errors.required_information_schema_text ? (
            <p className="text-sm text-danger">{serviceForm.formState.errors.required_information_schema_text.message}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="السعر الأساسي">
              <input className="field" step="0.01" type="number" {...serviceForm.register('base_price')} />
            </Field>
            <Field label="رسوم الخدمة">
              <input className="field" step="0.01" type="number" {...serviceForm.register('service_fee')} />
            </Field>
            <Field label="الرسوم الحكومية">
              <input className="field" step="0.01" type="number" {...serviceForm.register('government_fee')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="مدة التنفيذ">
              <input className="field" min="1" type="number" {...serviceForm.register('estimated_duration')} />
            </Field>
            <Field label="وحدة المدة">
              <select className="field" {...serviceForm.register('estimated_duration_unit')}>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </Field>
            <Field label="نوع السعر">
              <select className="field" {...serviceForm.register('price_type')}>
                <option value="fixed">Fixed</option>
                <option value="starts_from">Starts from</option>
                <option value="quotation">Quotation</option>
                <option value="free">Free</option>
              </select>
            </Field>
          </div>

          <Field label="الشروط بالعربية">
            <textarea className="field min-h-24" {...serviceForm.register('terms_ar')} />
          </Field>
          <Field label="الشروط بالإنجليزية">
            <textarea className="field min-h-24" {...serviceForm.register('terms_en')} />
          </Field>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <CheckboxField label="الخدمة نشطة" registration={serviceForm.register('is_active')} />
            <CheckboxField label="تنفذ أونلاين" registration={serviceForm.register('is_online')} />
            <CheckboxField label="تحتاج مزود خدمة" registration={serviceForm.register('provider_required')} />
            <CheckboxField label="تحتاج مراجعة يدوية" registration={serviceForm.register('requires_manual_review')} />
            <CheckboxField label="تحتاج موعد" registration={serviceForm.register('requires_appointment')} />
            <CheckboxField label="خدمة مميزة" registration={serviceForm.register('is_featured')} />
          </div>
        </form>
      </FormModal>

      <FormModal
        description="أنشئ أو عدل قاعدة الوثيقة المطلوبة المرتبطة بالخدمة."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeModal} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="service-document-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedDocument ? 'حفظ التعديلات' : 'إضافة الوثيقة'}
            </button>
          </div>
        }
        onClose={closeModal}
        open={activeModal === 'document'}
        size="lg"
        title={selectedDocument ? `تعديل الوثيقة: ${selectedDocument.name_ar}` : 'وثيقة مطلوبة جديدة'}
      >
        <form className="space-y-4" id="service-document-form" onSubmit={documentForm.handleSubmit(handleDocumentSubmit)}>
          <Field label="الخدمة">
            <select className="field" {...documentForm.register('service_id', { required: true })}>
              <option value="">اختر الخدمة</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name_ar}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الوثيقة بالعربية">
              <input className="field" {...documentForm.register('name_ar', { required: true })} />
            </Field>
            <Field label="اسم الوثيقة بالإنجليزية">
              <input className="field" {...documentForm.register('name_en')} />
            </Field>
          </div>
          <Field hint="معرف تقني فريد داخل نفس الخدمة" label="نوع الوثيقة">
            <input className="field" {...documentForm.register('document_type', { required: true })} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field hint="مثال: .pdf, .jpg, .png" label="الامتدادات المسموحة">
              <input className="field" {...documentForm.register('allowed_extensions_text')} />
            </Field>
            <Field hint="بالبايت" label="الحد الأقصى للحجم">
              <input className="field" min="1" type="number" {...documentForm.register('max_file_size')} />
            </Field>
          </div>
          <Field label="ترتيب العرض">
            <input className="field" type="number" {...documentForm.register('display_order')} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <CheckboxField label="وثيقة إلزامية" registration={documentForm.register('is_required')} />
            <CheckboxField label="تحتاج تحقق" registration={documentForm.register('requires_verification')} />
            <CheckboxField label="العميل يستطيع استبدال الملف" registration={documentForm.register('client_can_replace_file')} />
            <CheckboxField label="المزود يستطيع رؤية الملف" registration={documentForm.register('provider_can_view_file')} />
            <CheckboxField label="القاعدة نشطة" registration={documentForm.register('is_active')} />
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        confirmLabel="نعم، عطّل العنصر"
        description="سيتم تعطيل هذا العنصر وإخفاؤه من المسارات التشغيلية دون فقد السجل."
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title="تأكيد التعطيل"
        variant="danger"
      />
    </div>
  )
}

export default ServicesManagementPage
