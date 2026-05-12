import { CalendarRange, Megaphone, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
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
  const { data: advertisements = [], loading, reload } = useAsyncData(() => api.getAdminPublicSiteAdvertisements(), [], [])
  const [selectedId, setSelectedId] = useState(null)
  const [feedback, setFeedback] = useState(null)
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
      setSelectedId(null)
      form.reset(defaultValues)
      reload()
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
        setSelectedId(null)
        form.reset(defaultValues)
      }
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
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedId(row.id)} type="button">
            تعديل
          </button>
          <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger" onClick={() => handleDelete(row.id)} type="button">
            حذف
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        icon={Megaphone}
        title="Advertisement Manager"
        eyebrow="PUBLIC SITE"
        description="أنشئ حملات عامة وتنبيهات مهمة مع ترتيب عرض وجدولة زمنية وتفعيل/تعطيل سريع بدون حذف المحتوى."
        actions={
          <button
            className="btn-primary"
            onClick={() => {
              setSelectedId(null)
              form.reset(defaultValues)
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            إعلان جديد
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="glass-panel p-6">
          {loading ? (
            <div className="text-sm text-slate-500">جاري تحميل الإعلانات...</div>
          ) : (
            <DataTable
              columns={columns}
              emptyDescription="أضف أول إعلان لعرضه أسفل البطل أو في قسم الإعلانات العامة."
              emptyTitle="لا توجد إعلانات"
              rows={advertisements}
            />
          )}
        </section>

        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="glass-panel space-y-5 p-6">
            <div className="flex items-center gap-3">
              <span className="icon-chip">
                <CalendarRange className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-ink">{selectedAdvertisement ? 'تعديل الإعلان' : 'إعلان جديد'}</h2>
                <p className="text-sm text-slate-500">الألوان والجدولة والروابط كلها اختيارية ما عدا النص الأساسي.</p>
              </div>
            </div>

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
          </section>

          <section className="glass-panel space-y-4 p-6">
            <button className="btn-primary w-full" type="submit">
              <Save className="h-4 w-4" />
              {selectedAdvertisement ? 'حفظ التعديل' : 'إضافة الإعلان'}
            </button>
            {selectedAdvertisement ? (
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  setSelectedId(null)
                  form.reset(defaultValues)
                }}
                type="button"
              >
                <Trash2 className="h-4 w-4" />
                إلغاء التحديد
              </button>
            ) : null}
            <FormMessage message={feedback} />
          </section>
        </form>
      </div>
    </div>
  )
}

export default AdvertisementManagerPage
