import { CalendarClock, FileSearch, HelpCircle, Phone, Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DocumentList from '../../components/DocumentList'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicHero,
  PublicInput,
  PublicPageShell,
  PublicPanel,
} from '../../components/public/PublicPage'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { formatDateTime } from '../../utils/format'

function labelClass() {
  return 'mb-2 block text-sm font-bold text-ink'
}

function errorClass() {
  return 'mt-2 text-sm font-semibold text-danger'
}

function TrackOrderPage() {
  const { isArabic, language } = useLanguage()
  const [result, setResult] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm()

  async function onSubmit(values) {
    setSubmitError('')
    try {
      const data = await api.trackOrder(values)
      setResult(data)
    } catch (error) {
      setResult(null)
      setSubmitError(getDisplayError(error))
    }
  }

  const phone = watch('phone')
  const orderNumber = watch('order_number')

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تتبع الطلب' : 'Track request'}
        icon={FileSearch}
        title={isArabic ? 'تابع طلبك خطوة بخطوة حتى استلام النتيجة' : 'Follow your request step by step until completion'}
        description={isArabic ? 'أدخل رقم الطلب ورقم الهاتف للتحقق وعرض حالة الطلب من دون كشف أي بيانات داخلية أو خاصة.' : 'Enter order number and phone to verify and view safe public tracking details.'}
      />

      <PublicPanel>
        <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="track-order-number" className={labelClass()}>{isArabic ? 'رقم الطلب' : 'Order number'}</label>
            <PublicInput id="track-order-number" {...register('order_number', { required: isArabic ? 'رقم الطلب مطلوب' : 'Order number is required' })} />
            {errors.order_number ? <p className={errorClass()}>{errors.order_number.message}</p> : null}
          </div>
          <div>
            <label htmlFor="track-phone" className={labelClass()}>{isArabic ? 'رقم الهاتف' : 'Phone number'}</label>
            <PublicInput id="track-phone" {...register('phone', { required: isArabic ? 'رقم الهاتف مطلوب' : 'Phone number is required' })} />
            {errors.phone ? <p className={errorClass()}>{errors.phone.message}</p> : null}
          </div>
          <PublicButton className="w-full md:w-auto" disabled={isSubmitting} type="submit">
            <Search className="h-4 w-4" />
            {isSubmitting ? (isArabic ? 'جار البحث...' : 'Searching...') : isArabic ? 'عرض الحالة' : 'Show status'}
          </PublicButton>
          {submitError ? <p className="text-sm font-semibold text-danger md:col-span-3">{submitError}</p> : null}
        </form>
      </PublicPanel>

      {result ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-6">
            <PublicPanel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'ملخص الطلب' : 'Request summary'}</p>
                  <h2 className="mt-2 text-3xl font-extrabold text-ink">{result.order_number}</h2>
                </div>
                <StatusBadge status={result.status} />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <PublicCard>
                  <CalendarClock className="h-5 w-5 text-[var(--khalsni-public-primary)]" />
                  <p className="mt-3 text-xs font-bold text-slate-500">{isArabic ? 'آخر تحديث' : 'Last update'}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{formatDateTime(result.updated_at || result.timeline?.at?.(-1)?.created_at, language)}</p>
                </PublicCard>
                <PublicCard>
                  <Phone className="h-5 w-5 text-[var(--khalsni-public-primary)]" />
                  <p className="mt-3 text-xs font-bold text-slate-500">{isArabic ? 'التحقق' : 'Verification'}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{isArabic ? 'رقم الطلب + الهاتف' : 'Order number + phone'}</p>
                </PublicCard>
                <PublicCard>
                  <HelpCircle className="h-5 w-5 text-[var(--khalsni-public-primary)]" />
                  <p className="mt-3 text-xs font-bold text-slate-500">{isArabic ? 'الدعم' : 'Support'}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{isArabic ? 'متاح عند الحاجة' : 'Available if needed'}</p>
                </PublicCard>
              </div>
            </PublicPanel>

            <PublicPanel>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'خط سير الطلب' : 'Request timeline'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'تحديثات فعلية من النظام' : 'Actual system updates'}</h2>
              <div className="mt-5">
                <OrderTimeline items={result.timeline || []} variant="public" />
              </div>
            </PublicPanel>

            {result.final_documents?.length ? (
              <PublicPanel>
                <h3 className="mb-3 text-lg font-bold text-ink">{isArabic ? 'النتيجة النهائية' : 'Final documents'}</h3>
                <DocumentList documents={result.final_documents} orderNumber={orderNumber} phone={phone} variant="public" />
              </PublicPanel>
            ) : null}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <PublicPanel>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'الحالة الحالية' : 'Current status'}</p>
              <div className="mt-4"><StatusBadge status={result.status} /></div>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">
                {isArabic ? 'لا نعرض أي ملاحظات داخلية أو مستندات خاصة من صفحة التتبع العامة.' : 'Internal notes and private documents are not exposed on public tracking.'}
              </p>
            </PublicPanel>
            {result.missing_documents?.length ? (
              <PublicPanel className="border-amber-200 bg-amber-50">
                <p className="font-bold text-amber-900">{isArabic ? 'مطلوب منك' : 'Required from you'}</p>
                <div className="mt-4 space-y-3">
                  {result.missing_documents.map((item) => (
                    <div key={item} className="rounded-md border border-amber-200 bg-white px-4 py-3 text-sm font-semibold text-amber-800">{item}</div>
                  ))}
                </div>
              </PublicPanel>
            ) : null}
          </aside>
        </div>
      ) : (
        <PublicEmptyState
          icon={FileSearch}
          title={isArabic ? 'ابدأ بإدخال بيانات التتبع' : 'Start by entering tracking details'}
          description={isArabic ? 'ستظهر هنا الحالة الحالية، الجدول الزمني، وأي إجراءات مطلوبة منك عند توفرها.' : 'The current status, timeline, and required customer actions will appear here when available.'}
        />
      )}
    </PublicPageShell>
  )
}

export default TrackOrderPage
