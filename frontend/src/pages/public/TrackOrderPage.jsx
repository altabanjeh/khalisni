import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DocumentList from '../../components/DocumentList'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'

function TrackOrderPage() {
  const [result, setResult] = useState(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm()

  async function onSubmit(values) {
    const data = await api.trackOrder(values)
    setResult(data)
  }

  const phone = watch('phone')
  const orderNumber = watch('order_number')

  return (
    <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
      <section className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">تتبع الطلب</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">أدخل رقم الطلب ورقم الهاتف</h1>
        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">رقم الطلب</label>
            <input className="field" {...register('order_number', { required: 'رقم الطلب مطلوب' })} />
            {errors.order_number ? <p className="mt-2 text-sm text-danger">{errors.order_number.message}</p> : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink">رقم الهاتف</label>
            <input className="field" {...register('phone', { required: 'رقم الهاتف مطلوب' })} />
            {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
          </div>
          <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'جاري البحث...' : 'عرض الحالة'}
          </button>
        </form>
      </section>
      <section className="glass-panel p-6">
        {result ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">رقم الطلب</p>
                <h2 className="text-2xl font-extrabold text-ink">{result.order_number}</h2>
              </div>
              <StatusBadge status={result.status} />
            </div>
            <OrderTimeline items={result.timeline || []} />
            {result.missing_documents?.length ? (
              <div>
                <h3 className="mb-3 text-lg font-bold text-ink">الوثائق المطلوبة</h3>
                <div className="space-y-3">
                  {result.missing_documents.map((item) => (
                    <div key={item} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.final_documents?.length ? (
              <div>
                <h3 className="mb-3 text-lg font-bold text-ink">النتيجة النهائية</h3>
                <DocumentList documents={result.final_documents} orderNumber={orderNumber} phone={phone} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">أدخل بيانات الطلب لعرض الجدول الزمني والحالة الحالية والوثائق النهائية عند توفرها.</p>
        )}
      </section>
    </div>
  )
}

export default TrackOrderPage
