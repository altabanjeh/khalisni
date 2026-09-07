import { Megaphone, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { broadcastPublicSiteUpdate } from '../../utils/publicSiteSync'
import {
  ColorPickerField,
  FieldGroup,
  FormMessage,
  ImageUploadField,
  ToggleField,
} from '../../components/publicSite/PublicSiteFormFields'

const advertisementTypes = [
  { value: 'new_service', label_ar: 'خدمة جديدة', label_en: 'New service' },
  { value: 'office_announcement', label_ar: 'إعلان مكتبي', label_en: 'Office announcement' },
  { value: 'offer', label_ar: 'عرض', label_en: 'Offer' },
  { value: 'important_alert', label_ar: 'تنبيه مهم', label_en: 'Important alert' },
  { value: 'general', label_ar: 'عام', label_en: 'General' },
]

const defaultValues = {
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
  advertisement_type: 'general',
  image: undefined,
  button_text_ar: '',
  button_text_en: '',
  button_url: '',
  background_color: '',
  text_color: '',
  display_order: 0,
  start_date: '',
  end_date: '',
  is_active: true,
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toApiDateTime(value) {
  return value ? new Date(value).toISOString() : null
}

function applyServerErrors(error, setError, setFeedback) {
  Object.entries(error?.fieldErrors || {}).forEach(([field, messages]) => {
    setError(field, { type: 'server', message: messages[0] })
  })
  setFeedback({ type: 'error', text: getDisplayError(error) })
}

function AdvertisementManagerPage() {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [statusFilter, setStatusFilter] = useState('active')
  const { data: advertisements = [], loading, reload } = useAsyncData(
    () => api.getAdminPublicSiteAdvertisements({ status: statusFilter }),
    [statusFilter],
    [],
  )
  const [selectedId, setSelectedId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const form = useForm({ defaultValues })
  const imageFile = form.watch('image')
  const backgroundColor = form.watch('background_color')
  const textColor = form.watch('text_color')

  const selectedAdvertisement = useMemo(
    () => advertisements.find((advertisement) => String(advertisement.id) === String(selectedId)) || null,
    [advertisements, selectedId],
  )

  useEffect(() => {
    if (!selectedAdvertisement) {
      form.reset(defaultValues)
      return
    }

    form.reset({
      title_ar: selectedAdvertisement.title_ar || '',
      title_en: selectedAdvertisement.title_en || '',
      description_ar: selectedAdvertisement.description_ar || '',
      description_en: selectedAdvertisement.description_en || '',
      advertisement_type: selectedAdvertisement.advertisement_type || 'general',
      image: undefined,
      button_text_ar: selectedAdvertisement.button_text_ar || '',
      button_text_en: selectedAdvertisement.button_text_en || '',
      button_url: selectedAdvertisement.button_url || '',
      background_color: selectedAdvertisement.background_color || '',
      text_color: selectedAdvertisement.text_color || '',
      display_order: selectedAdvertisement.display_order ?? 0,
      start_date: toDateTimeLocal(selectedAdvertisement.start_date),
      end_date: toDateTimeLocal(selectedAdvertisement.end_date),
      is_active: Boolean(selectedAdvertisement.is_active),
    })
  }, [selectedAdvertisement, form])

  function closeForm() {
    setIsFormOpen(false)
    setSelectedId(null)
    setFeedback(null)
    form.reset(defaultValues)
  }

  function openCreateForm() {
    setSelectedId(null)
    setFeedback(null)
    form.reset(defaultValues)
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedId(id)
    setFeedback(null)
    setIsFormOpen(true)
  }

  async function onSubmit(values) {
    setFeedback(null)
    const payload = {
      ...values,
      image: values.image?.[0],
      display_order: Number(values.display_order || 0),
      start_date: toApiDateTime(values.start_date),
      end_date: toApiDateTime(values.end_date),
      is_active: Boolean(values.is_active),
    }

    try {
      if (selectedAdvertisement) {
        await api.updateAdminPublicSiteAdvertisement(selectedAdvertisement.id, payload)
        broadcastPublicSiteUpdate('advertisement-update')
        setFeedback({ type: 'success', text: tr('تم تحديث الإعلان.', 'Advertisement updated.') })
      } else {
        await api.createAdminPublicSiteAdvertisement(payload)
        broadcastPublicSiteUpdate('advertisement-create')
        setFeedback({ type: 'success', text: tr('تم إنشاء الإعلان.', 'Advertisement created.') })
      }
      reload()
      closeForm()
    } catch (error) {
      applyServerErrors(error, form.setError, setFeedback)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm(tr('سيتم حذف الإعلان وإخفاؤه من الموقع العام. يمكن استعادته لاحقاً. هل تريد المتابعة؟', 'The advertisement will be removed and hidden from the public site. It can be restored later. Continue?'))) return
    try {
      await api.deleteAdminPublicSiteAdvertisement(id)
      broadcastPublicSiteUpdate('advertisement-delete')
      setFeedback({ type: 'success', text: tr('تم حذف الإعلان.', 'Advertisement deleted.') })
      if (String(selectedId) === String(id)) {
        closeForm()
      }
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  async function handleRestore(id) {
    if (!window.confirm(tr('استعادة هذا الإعلان؟', 'Restore this advertisement?'))) return
    try {
      await api.restoreAdminPublicSiteAdvertisement(id)
      broadcastPublicSiteUpdate('advertisement-restore')
      setFeedback({ type: 'success', text: tr('تمت استعادة الإعلان.', 'Advertisement restored.') })
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  const tableColumns = [
    {
      key: 'title_display',
      label: tr('العنوان', 'Title'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{(isArabic ? row.title_ar : row.title_en) || row.title_ar}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              {tr('محذوف', 'Deleted')}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'advertisement_type',
      label: tr('النوع', 'Type'),
      render: (row) => {
        const match = advertisementTypes.find((type) => type.value === row.advertisement_type)
        return match ? (isArabic ? match.label_ar : match.label_en) : row.advertisement_type.replace(/_/g, ' ')
      },
    },
    { key: 'display_order', label: tr('الترتيب', 'Order') },
    {
      key: 'schedule',
      label: tr('الفترة', 'Schedule'),
      render: (row) => `${toDateTimeLocal(row.start_date).replace('T', ' ')}${row.end_date ? ` → ${toDateTimeLocal(row.end_date).replace('T', ' ')}` : ''}`,
    },
    {
      key: 'status_display',
      label: tr('الحالة', 'Status'),
      render: (row) => (row.is_deleted ? tr('محذوف', 'Deleted') : row.is_active ? tr('نشط', 'Active') : tr('موقوف', 'Inactive')),
    },
    {
      key: 'actions_display',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => handleRestore(row.id)} type="button">
              {tr('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                {tr('تعديل', 'Edit')}
              </button>
              <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDelete(row.id)} type="button">
                {tr('حذف', 'Delete')}
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
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            <Plus className="h-4 w-4" />
            {tr('إعلان جديد', 'New advertisement')}
          </button>
        }
        description={tr(
          'أنشئ الحملات العامة والتنبيهات المهمة من نافذة منظمة وواضحة بدون ضغط الجدول أو تشتيت الصفحة.',
          'Create public campaigns and important alerts from an organised dialog without crowding the table or the page.',
        )}
        eyebrow={isArabic ? 'الموقع العام' : 'Public site'}
        icon={Megaphone}
        title={isArabic ? 'إدارة الإعلانات' : 'Advertisement Manager'}
      />

      <section className="glass-panel p-6">
        {loading ? (
          <div className="text-sm text-slate-500">{tr('جارٍ تحميل الإعلانات...', 'Loading advertisements…')}</div>
        ) : (
          <DataTable
            columns={tableColumns}
            emptyDescription={tr('أضف أول إعلان لعرضه أسفل البطل أو في قسم الإعلانات العامة.', 'Add the first advertisement to show it below the hero or in the public announcements section.')}
            emptyTitle={tr('لا توجد إعلانات', 'No advertisements')}
            mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
            rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
            rows={advertisements}
            toolbar={
              <select aria-label={tr('تصفية حسب الحالة', 'Filter by status')} className="field max-w-56" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="active">{tr('نشط', 'Active')}</option>
                <option value="deleted">{tr('محذوف', 'Deleted')}</option>
                <option value="all">{tr('الكل', 'All')}</option>
              </select>
            }
          />
        )}
        <div className="mt-4">
          <FormMessage message={feedback} />
        </div>
      </section>

      <FormModal
        description={tr(
          'حرر نص الإعلان وزمن ظهوره وألوانه في نافذة مستقلة تبقي قائمة الإعلانات واضحة أثناء العمل.',
          'Edit the advertisement text, schedule and colours in a dedicated dialog that keeps the list readable while you work.',
        )}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" form="advertisement-form" type="submit">
              {selectedAdvertisement ? tr('حفظ التعديلات', 'Save changes') : tr('إضافة الإعلان', 'Add advertisement')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedAdvertisement ? tr('تعديل الإعلان', 'Edit advertisement') : tr('إعلان جديد', 'New advertisement')}
      >
        <form className="space-y-5" id="advertisement-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup error={form.formState.errors.title_ar} label={tr('العنوان (عربي)', 'Title (Arabic)')}>
            <input className="field" {...form.register('title_ar', { required: tr('العنوان العربي مطلوب', 'Arabic title is required') })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.title_en} label={tr('العنوان (إنجليزي)', 'Title (English)')}>
            <input className="field" {...form.register('title_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.description_ar} label={tr('الوصف (عربي)', 'Description (Arabic)')}>
            <textarea className="field min-h-28" {...form.register('description_ar', { required: tr('الوصف العربي مطلوب', 'Arabic description is required') })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.description_en} label={tr('الوصف (إنجليزي)', 'Description (English)')}>
            <textarea className="field min-h-28" {...form.register('description_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.advertisement_type} label={tr('النوع', 'Type')}>
            <select className="field" {...form.register('advertisement_type')}>
              {advertisementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {isArabic ? type.label_ar : type.label_en}
                </option>
              ))}
            </select>
          </FieldGroup>
          <ImageUploadField
            accept="image/png,image/jpeg,image/webp,image/gif"
            error={form.formState.errors.image}
            fileList={imageFile}
            fileUrl={selectedAdvertisement?.image_url}
            hint={tr('صورة اختيارية للبانر أو بطاقة الإعلان', 'Optional visual for the banner or announcement card')}
            label={tr('صورة الإعلان', 'Advertisement image')}
            registration={form.register('image')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.button_text_ar} label={tr('نص الزر (عربي)', 'Button text (Arabic)')}>
              <input className="field" {...form.register('button_text_ar')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.button_text_en} label={tr('نص الزر (إنجليزي)', 'Button text (English)')}>
              <input className="field" {...form.register('button_text_en')} />
            </FieldGroup>
          </div>
          <FieldGroup error={form.formState.errors.button_url} label={tr('رابط الزر', 'Button URL')}>
            <input className="field" {...form.register('button_url')} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorPickerField allowClear error={form.formState.errors.background_color} hint={tr('اختياري', 'Optional')} label={tr('لون الخلفية', 'Background colour')} name="background_color" register={form.register} setValue={form.setValue} value={backgroundColor} />
            <ColorPickerField allowClear error={form.formState.errors.text_color} hint={tr('اختياري', 'Optional')} label={tr('لون النص', 'Text colour')} name="text_color" register={form.register} setValue={form.setValue} value={textColor} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.display_order} label={tr('ترتيب العرض', 'Display order')}>
              <input className="field" type="number" {...form.register('display_order')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.start_date} label={tr('بداية العرض', 'Start date')}>
              <input className="field" type="datetime-local" {...form.register('start_date', { required: tr('تاريخ البداية مطلوب', 'Start date is required') })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.end_date} label={tr('نهاية العرض', 'End date')}>
              <input className="field" type="datetime-local" {...form.register('end_date')} />
            </FieldGroup>
          </div>
          <ToggleField
            description={tr('يمكن تعطيل الإعلان بدون حذفه.', 'The advertisement can be disabled without deleting it.')}
            label={tr('نشط', 'Active')}
            registration={form.register('is_active')}
          />
          <FormMessage message={feedback} />
        </form>
      </FormModal>
    </div>
  )
}

export default AdvertisementManagerPage
