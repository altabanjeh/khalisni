import { Settings } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultServiceValues = {
  category: '',
  name_ar: '',
  name_en: '',
  slug: '',
  short_description_ar: '',
  short_description_en: '',
  base_price: '0.00',
  government_fee: '0.00',
  service_fee: '0.00',
  estimated_duration: 1,
  price_type: 'fixed',
  is_online: true,
  provider_required: true,
  requires_manual_review: true,
  is_featured: false,
  is_active: true,
  display_order: 0,
}

function CheckboxField({ label, registration }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
  )
}

function ServicesManagementPage() {
  const { data: services = [], loading, reload } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: categories = [] } = useAsyncData(() => api.getAdminCategories(), [], [])
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const form = useForm({ defaultValues: defaultServiceValues })

  const selectedService = useMemo(
    () => services.find((item) => String(item.id) === String(selectedServiceId)) || null,
    [services, selectedServiceId],
  )

  useEffect(() => {
    if (selectedService) {
      form.reset({
        category: selectedService.category?.id || selectedService.category || '',
        name_ar: selectedService.name_ar || '',
        name_en: selectedService.name_en || '',
        slug: selectedService.slug || '',
        short_description_ar: selectedService.short_description_ar || '',
        short_description_en: selectedService.short_description_en || '',
        base_price: selectedService.base_price || '0.00',
        government_fee: selectedService.government_fee || '0.00',
        service_fee: selectedService.service_fee || '0.00',
        estimated_duration: selectedService.estimated_duration || 1,
        price_type: selectedService.price_type || 'fixed',
        is_online: Boolean(selectedService.is_online),
        provider_required: Boolean(selectedService.provider_required),
        requires_manual_review: Boolean(selectedService.requires_manual_review),
        is_featured: Boolean(selectedService.is_featured),
        is_active: Boolean(selectedService.is_active),
        display_order: selectedService.display_order || 0,
      })
    } else {
      form.reset(defaultServiceValues)
    }
    setFeedback(null)
  }, [selectedService, form])

  async function handleSubmit(values) {
    try {
      if (selectedService) {
        await api.updateAdminService(selectedService.id, values)
        setFeedback({ type: 'success', text: 'تم تحديث الخدمة.' })
      } else {
        await api.createAdminService(values)
        setFeedback({ type: 'success', text: 'تم إنشاء الخدمة.' })
        form.reset(defaultServiceValues)
        setSelectedServiceId(null)
      }
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  async function handleDelete(service) {
    if (!window.confirm(`سيتم حذف الخدمة "${service.name_ar}" نهائياً. هل تريد المتابعة؟`)) return
    try {
      await api.deleteAdminService(service.id)
      if (String(selectedServiceId) === String(service.id)) {
        setSelectedServiceId(null)
      }
      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل الخدمات...</div>
  }

  const columns = [
    { key: 'name_ar', label: 'اسم الخدمة' },
    { key: 'category', label: 'التصنيف', render: (row) => row.category?.name_ar || '—' },
    { key: 'estimated_duration', label: 'المدة', render: (row) => `${row.estimated_duration} يوم` },
    { key: 'service_fee', label: 'سعر الخدمة' },
    { key: 'government_fee', label: 'الرسوم الحكومية' },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (row) => (
        <span className={`text-xs font-semibold ${row.is_active ? 'text-success' : 'text-slate-400'}`}>
          {row.is_active ? 'نشطة' : 'معطلة'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => setSelectedServiceId(row.id)}
            type="button"
          >
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => handleDelete(row)}
            type="button"
          >
            حذف
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="إنشاء الخدمات وتعديلها وحذفها وضبط أسعارها ومدتها وتصنيفاتها."
        eyebrow="الخدمات"
        icon={Settings}
        title="إدارة الخدمات"
        actions={
          <button
            className="btn-primary"
            onClick={() => { setSelectedServiceId(null); form.reset(defaultServiceValues) }}
            type="button"
          >
            + خدمة جديدة
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTable
          columns={columns}
          emptyDescription="اضغط على «خدمة جديدة» لإضافة أول خدمة."
          emptyTitle="لا توجد خدمات"
          rows={services}
        />

        <section className="glass-panel p-6">
          <h2 className="mb-6 text-xl font-bold text-ink">
            {selectedService ? `تعديل: ${selectedService.name_ar}` : 'خدمة جديدة'}
          </h2>

          <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
            <select className="field" {...form.register('category')}>
              <option value="">اختر التصنيف</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name_ar}
                </option>
              ))}
            </select>

            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" placeholder="اسم الخدمة (عربي)" {...form.register('name_ar', { required: true })} />
              <input className="field" placeholder="Service name (English)" {...form.register('name_en')} />
            </div>

            <input className="field" placeholder="الرابط المختصر (slug)" {...form.register('slug')} />

            <div className="grid gap-4 md:grid-cols-2">
              <input className="field" placeholder="وصف مختصر (عربي)" {...form.register('short_description_ar')} />
              <input className="field" placeholder="Short description (English)" {...form.register('short_description_en')} />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">سعر الخدمة</label>
                <input className="field" type="number" step="0.01" {...form.register('service_fee')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">الرسوم الحكومية</label>
                <input className="field" type="number" step="0.01" {...form.register('government_fee')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">المدة (أيام)</label>
                <input className="field" type="number" min="1" {...form.register('estimated_duration')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <select className="field" {...form.register('price_type')}>
                <option value="fixed">سعر ثابت</option>
                <option value="variable">سعر متغير</option>
                <option value="free">مجاني</option>
              </select>
              <input className="field" type="number" placeholder="ترتيب العرض" {...form.register('display_order')} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <CheckboxField label="نشطة" registration={form.register('is_active')} />
              <CheckboxField label="إلكترونية" registration={form.register('is_online')} />
              <CheckboxField label="تتطلب مزوداً" registration={form.register('provider_required')} />
              <CheckboxField label="تتطلب مراجعة" registration={form.register('requires_manual_review')} />
              <CheckboxField label="مميزة" registration={form.register('is_featured')} />
            </div>

            <div className="flex gap-3">
              <button className="btn-primary flex-1" type="submit">
                {selectedService ? 'حفظ التعديل' : 'إضافة الخدمة'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => { setSelectedServiceId(null); form.reset(defaultServiceValues) }}
                type="button"
              >
                جديد
              </button>
            </div>

            {feedback ? (
              <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>
                {feedback.text}
              </p>
            ) : null}
          </form>
        </section>
      </div>
    </div>
  )
}

export default ServicesManagementPage
