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
  { value: 'new_service', label: 'New Service / خدمة جديدة' },
  { value: 'office_announcement', label: 'Office Announcement / إعلان مكتبي' },
  { value: 'offer', label: 'Offer / عرض' },
  { value: 'important_alert', label: 'Important Alert / تنبيه مهم' },
  { value: 'general', label: 'General / عام' },
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
        setFeedback({ type: 'success', text: 'تم تحديث الإعلان.' })
      } else {
        await api.createAdminPublicSiteAdvertisement(payload)
        broadcastPublicSiteUpdate('advertisement-create')
        setFeedback({ type: 'success', text: 'تم إنشاء الإعلان.' })
      }
      reload()
      closeForm()
    } catch (error) {
      applyServerErrors(error, form.setError, setFeedback)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('سيتم حذف الإعلان نهائياً. هل تريد المتابعة؟')) return
    try {
      await api.deleteAdminPublicSiteAdvertisement(id)
      broadcastPublicSiteUpdate('advertisement-delete')
      setFeedback({ type: 'success', text: 'تم حذف الإعلان.' })
      if (String(selectedId) === String(id)) {
        closeForm()
      }
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  async function handleRestore(id) {
    if (!window.confirm('Restore this advertisement?')) return
    try {
      await api.restoreAdminPublicSiteAdvertisement(id)
      broadcastPublicSiteUpdate('advertisement-restore')
      setFeedback({ type: 'success', text: 'Advertisement restored.' })
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  const columns = [
    { key: 'title_ar', label: 'العنوان' },
    {
      key: 'advertisement_type',
      label: 'النوع',
      render: (row) => row.advertisement_type.replace(/_/g, ' '),
    },
    { key: 'display_order', label: 'الترتيب' },
    {
      key: 'schedule',
      label: 'الفترة',
      render: (row) => `${toDateTimeLocal(row.start_date).replace('T', ' ')}${row.end_date ? ` → ${toDateTimeLocal(row.end_date).replace('T', ' ')}` : ''}`,
    },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (row) => (row.is_active ? 'نشط' : 'متوقف'),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDelete(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  const tableColumns = [
    {
      key: 'title_display',
      label: isArabic ? 'العنوان' : 'Title',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.title_ar}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              {isArabic ? 'محذوف' : 'Deleted'}
            </span>
          ) : null}
        </div>
      ),
    },
    columns[1],
    columns[2],
    columns[3],
    {
      key: 'status_display',
      label: isArabic ? 'الحالة' : 'Status',
      render: (row) => (row.is_deleted ? (isArabic ? 'محذوف' : 'Deleted') : row.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Inactive')),
    },
    {
      key: 'actions_display',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => handleRestore(row.id)} type="button">
              {isArabic ? 'استعادة' : 'Restore'}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                {isArabic ? 'تعديل' : 'Edit'}
              </button>
              <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDelete(row.id)} type="button">
                {isArabic ? 'حذف' : 'Delete'}
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
            إعلان جديد
          </button>
        }
        description="أنشئ الحملات العامة والتنبيهات المهمة من نافذة منظمة وواضحة بدون ضغط الجدول أو تشتيت الصفحة."
        eyebrow={isArabic ? 'الموقع العام' : 'PUBLIC SITE'}
        icon={Megaphone}
        title={isArabic ? 'إدارة الإعلانات' : 'Advertisement Manager'}
      />

      <section className="glass-panel p-6">
        {loading ? (
          <div className="text-sm text-slate-500">جاري تحميل الإعلانات...</div>
        ) : (
          <DataTable
            columns={tableColumns}
            emptyDescription="أضف أول إعلان لعرضه أسفل البطل أو في قسم الإعلانات العامة."
            emptyTitle="لا توجد إعلانات"
            mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
            rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
            rows={advertisements}
            toolbar={
              <select className="field max-w-56" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                <option value="active">{isArabic ? 'Ø§Ù„Ù†Ø´Ø·Ø©' : 'Active'}</option>
                <option value="deleted">{isArabic ? 'Ø§Ù„Ù…Ø­Ø°ÙˆÙØ©' : 'Deleted'}</option>
                <option value="all">{isArabic ? 'Ø§Ù„ÙƒÙ„' : 'All'}</option>
              </select>
            }
          />
        )}
        <div className="mt-4">
          <FormMessage message={feedback} />
        </div>
      </section>

      <FormModal
        description="حرر نص الإعلان وزمن ظهوره وألوانه في نافذة مستقلة تبقي قائمة الإعلانات واضحة أثناء العمل."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" form="advertisement-form" type="submit">
              {selectedAdvertisement ? 'حفظ التعديلات' : 'إضافة الإعلان'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedAdvertisement ? 'تعديل الإعلان' : 'إعلان جديد'}
      >
        <form className="space-y-5" id="advertisement-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup error={form.formState.errors.title_ar} label="Title AR / العنوان العربي">
            <input className="field" {...form.register('title_ar', { required: 'العنوان العربي مطلوب' })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.title_en} label="Title EN / العنوان الإنجليزي">
            <input className="field" {...form.register('title_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.description_ar} label="Description AR / الوصف العربي">
            <textarea className="field min-h-28" {...form.register('description_ar', { required: 'الوصف العربي مطلوب' })} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.description_en} label="Description EN / الوصف الإنجليزي">
            <textarea className="field min-h-28" {...form.register('description_en')} />
          </FieldGroup>
          <FieldGroup error={form.formState.errors.advertisement_type} label="Type / النوع">
            <select className="field" {...form.register('advertisement_type')}>
              {advertisementTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FieldGroup>
          <ImageUploadField
            accept="image/png,image/jpeg,image/webp,image/gif"
            error={form.formState.errors.image}
            fileList={imageFile}
            fileUrl={selectedAdvertisement?.image_url}
            hint="Optional visual for the banner or announcement card"
            label="Image / صورة الإعلان"
            registration={form.register('image')}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.button_text_ar} label="Button AR / نص الزر العربي">
              <input className="field" {...form.register('button_text_ar')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.button_text_en} label="Button EN / نص الزر الإنجليزي">
              <input className="field" {...form.register('button_text_en')} />
            </FieldGroup>
          </div>
          <FieldGroup error={form.formState.errors.button_url} label="Button URL / رابط الزر">
            <input className="field" {...form.register('button_url')} />
          </FieldGroup>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorPickerField allowClear error={form.formState.errors.background_color} hint="Optional" label="Background color / لون الخلفية" name="background_color" register={form.register} setValue={form.setValue} value={backgroundColor} />
            <ColorPickerField allowClear error={form.formState.errors.text_color} hint="Optional" label="Text color / لون النص" name="text_color" register={form.register} setValue={form.setValue} value={textColor} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup error={form.formState.errors.display_order} label="Display order / ترتيب العرض">
              <input className="field" type="number" {...form.register('display_order')} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.start_date} label="Start date / بداية العرض">
              <input className="field" type="datetime-local" {...form.register('start_date', { required: 'تاريخ البداية مطلوب' })} />
            </FieldGroup>
            <FieldGroup error={form.formState.errors.end_date} label="End date / نهاية العرض">
              <input className="field" type="datetime-local" {...form.register('end_date')} />
            </FieldGroup>
          </div>
          <ToggleField
            description="يمكن تعطيل الإعلان بدون حذفه."
            label="Active / نشط"
            registration={form.register('is_active')}
          />
          <FormMessage message={feedback} />
        </form>
      </FormModal>
    </div>
  )
}

export default AdvertisementManagerPage
