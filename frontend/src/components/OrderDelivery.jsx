import { PackageCheck, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'

const FINISHED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REJECTED', 'ARCHIVED'])
const MAX_INSTRUCTIONS_LENGTH = 2000
const METHOD_OPTIONS = [
  { value: 'electronic', ar: 'تسليم إلكتروني (تنزيل النتيجة)', en: 'Electronic (download the result)' },
  { value: 'paper_pickup', ar: 'تسليم ورقي - استلام', en: 'Paper - pickup' },
  { value: 'paper_courier', ar: 'تسليم ورقي - توصيل', en: 'Paper - courier' },
]

function firstFieldError(error, field) {
  const raw = error?.apiError?.fieldErrors?.[field] ?? error?.response?.data?.[field]
  const message = Array.isArray(raw) ? raw[0] : raw
  return typeof message === 'string' ? message : ''
}

function methodLabel(delivery, isArabic) {
  if (!delivery) return ''
  const fromServer = isArabic ? delivery.delivery_method_label_ar : delivery.delivery_method_label_en || delivery.delivery_method_label_ar
  if (fromServer) return fromServer
  const option = METHOD_OPTIONS.find((item) => item.value === delivery.delivery_method)
  return option ? (isArabic ? option.ar : option.en) : ''
}

/**
 * Customer view of how the result reaches them. Hidden when delivery is
 * electronic and there is nothing extra to say (the download is enough).
 */
export function CustomerDeliveryCard({ orderId }) {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: delivery } = useAsyncData(() => api.getCustomerOrderDelivery(orderId), [orderId], null)
  if (!delivery || !delivery.delivery_method) return null
  const instructions = String(delivery.delivery_instructions || '').trim()
  if (delivery.delivery_method === 'electronic' && !instructions) return null

  return (
    <section className="glass-panel p-6" data-testid="customer-delivery">
      <div className="flex items-start gap-3">
        <span className="icon-chip"><Truck aria-hidden="true" className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-ink">{tr('طريقة تسليم النتيجة', 'How you receive the result')}</h2>
          <p className="mt-2 text-sm font-bold text-brand-700">{methodLabel(delivery, isArabic)}</p>
          {instructions ? <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600"><bdi>{instructions}</bdi></p> : null}
        </div>
      </div>
    </section>
  )
}

/** Staff panel to set the delivery method and customer-visible instructions. */
function StaffDeliveryPanel({ orderId, orderStatus, onChanged }) {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: delivery, loading, error: loadError, setData } = useAsyncData(() => api.getStaffOrderDelivery(orderId), [orderId], null)
  const [method, setMethod] = useState('electronic')
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const finished = FINISHED_STATUSES.has(String(orderStatus || '').toUpperCase())

  useEffect(() => {
    if (!delivery) return
    setMethod(delivery.delivery_method || 'electronic')
    setInstructions(delivery.delivery_instructions || '')
  }, [delivery])

  const isPaper = method !== 'electronic'
  const methodId = `delivery-method-${orderId}`
  const instructionsId = `delivery-instructions-${orderId}`

  async function handleSubmit(event) {
    event.preventDefault()
    if (finished || saving) return
    setSaved(false)
    if (isPaper && !instructions.trim()) {
      setErrors({ delivery_instructions: tr('اكتب تعليمات التسليم الورقي للعميل.', 'Write the paper-delivery instructions for the customer.') })
      return
    }
    setErrors({})
    setSaving(true)
    try {
      const result = await api.updateStaffOrderDelivery(orderId, { delivery_method: method, delivery_instructions: instructions.trim() })
      if (result) setData(result)
      setSaved(true)
      onChanged?.()
    } catch (submitError) {
      const instructionsError = firstFieldError(submitError, 'delivery_instructions')
      const methodError = firstFieldError(submitError, 'delivery_method')
      setErrors({
        delivery_instructions: instructionsError,
        delivery_method: methodError,
        general: instructionsError || methodError ? '' : getDisplayError(submitError),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6" data-testid="staff-delivery">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
          <PackageCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-ink sm:text-lg">{tr('التسليم', 'Delivery')}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {tr('كيف تصل النتيجة إلى العميل. التعليمات تظهر للعميل ويُشعر عند تغييرها.', 'How the result reaches the customer. The instructions are shown to the customer, who is notified when they change.')}
          </p>
        </div>
      </div>
      {loadError ? <p className="mt-4 text-sm font-bold text-danger" role="alert">{getDisplayError(loadError)}</p> : null}
      <form className="mt-5 space-y-3" noValidate onSubmit={handleSubmit}>
        <label className="block text-sm font-bold text-ink" htmlFor={methodId}>{tr('طريقة التسليم', 'Delivery method')}</label>
        <select
          className="field disabled:cursor-not-allowed disabled:opacity-60"
          disabled={finished || loading}
          id={methodId}
          onChange={(event) => { setMethod(event.target.value); setSaved(false) }}
          value={method}
        >
          {METHOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{isArabic ? option.ar : option.en}</option>)}
        </select>
        {errors.delivery_method ? <p className="text-sm font-bold text-danger">{errors.delivery_method}</p> : null}
        <label className="block text-sm font-bold text-ink" htmlFor={instructionsId}>
          {isPaper ? tr('تعليمات التسليم للعميل (مطلوبة)', 'Delivery instructions for the customer (required)') : tr('تعليمات التسليم للعميل (اختيارية)', 'Delivery instructions for the customer (optional)')}
        </label>
        <textarea
          aria-invalid={errors.delivery_instructions ? 'true' : undefined}
          aria-required={isPaper ? 'true' : undefined}
          className="field min-h-20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={finished || loading}
          id={instructionsId}
          maxLength={MAX_INSTRUCTIONS_LENGTH}
          onChange={(event) => { setInstructions(event.target.value); setSaved(false) }}
          placeholder={isPaper
            ? tr('مثلاً: مكان استلام الأصل، ما يجب إحضاره، أو ملاحظة التوصيل.', 'For example: where to collect the original, what to bring, or a courier note.')
            : tr('أي ملاحظة إضافية للعميل', 'Any extra note for the customer')}
          value={instructions}
        />
        {errors.delivery_instructions ? <p className="text-sm font-bold text-danger" role="alert">{errors.delivery_instructions}</p> : null}
        {errors.general ? <p className="text-sm font-bold text-danger" role="alert">{errors.general}</p> : null}
        {saved ? <p className="text-sm font-bold text-green-700" role="status">{tr('تم حفظ تفاصيل التسليم.', 'Delivery details saved.')}</p> : null}
        {finished ? (
          <p className="text-sm font-semibold text-slate-500">{tr('لا يمكن تعديل التسليم بعد انتهاء الطلب.', 'Delivery cannot be changed once the request is finished.')}</p>
        ) : (
          <button className="btn-secondary w-full" disabled={saving || loading} type="submit">
            {saving ? tr('جارٍ الحفظ...', 'Saving...') : tr('حفظ التسليم', 'Save delivery')}
          </button>
        )}
      </form>
    </section>
  )
}

export default StaffDeliveryPanel
