import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, Layers } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { formatDate, formatDateTime } from '../utils/format'
import { getCover } from '../utils/cover'
import { getServiceName } from '../utils/servicePresentation'
import StatusBadge from './StatusBadge'

const ACTION_REQUIRED = new Set(['WAITING_CUSTOMER'])
const DONE = new Set(['COMPLETED', 'DELIVERED', 'CLOSED', 'VERIFIED'])
const CLOSED_NEGATIVE = new Set(['CANCELLED', 'REJECTED'])

// Ordered lifecycle for the mini progress indicator.
const STAGES = ['NEW', 'SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT', 'READY_FOR_DELIVERY', 'COMPLETED']
function stageIndex(status) {
  const i = STAGES.indexOf(status)
  if (i >= 0) return i
  if (DONE.has(status)) return STAGES.length - 1
  if (status === 'WAITING_CUSTOMER') return 2
  return 0
}

/**
 * Customer-facing request card. Answers at a glance:
 *   what is this · where is it · what happens next · do I need to act
 * Image-first (branded cover), prominent status, next-step emphasis, a small
 * progress track and a single strong action.
 */
function RequestCard({ order, className = '', to }) {
  const { language, isArabic } = useLanguage()
  const status = String(order?.status || '').toUpperCase()
  const serviceName = order?.service ? getServiceName(order.service, language) : isArabic ? 'خدمة غير محددة' : 'Unspecified service'
  const href = to || `/customer/orders/${order?.id}`
  const lastLog = Array.isArray(order?.status_logs) && order.status_logs.length ? order.status_logs[order.status_logs.length - 1] : null
  const latestUpdate = lastLog?.note || order?.latest_update || ''
  const updatedAt = order?.updated_at || lastLog?.created_at || order?.created_at
  const cover = getCover(order?.service || { slug: serviceName }, order?.service?.category?.slug || '', { as: 'service' })
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = cover.hasImage && !imageFailed

  const actionRequired = ACTION_REQUIRED.has(status) || (order?.missing_document_types?.length ?? 0) > 0
  const done = DONE.has(status)
  const negative = CLOSED_NEGATIVE.has(status)
  const activeStage = stageIndex(status)

  const nextStep = actionRequired
    ? isArabic
      ? 'مطلوب إجراء منك: راجع التفاصيل وأكمل النواقص.'
      : 'Action needed: open the request and complete what is missing.'
    : done
      ? isArabic ? 'اكتمل هذا الطلب.' : 'This request is complete.'
      : negative
        ? isArabic ? 'تم إغلاق هذا الطلب.' : 'This request has been closed.'
        : isArabic
          ? 'فريق خلصني يعمل على طلبك — لا حاجة لإجراء منك الآن.'
          : 'Khalsni is working on it — nothing needed from you now.'

  const NextIcon = actionRequired ? AlertTriangle : done ? CheckCircle2 : Clock3
  const nextTone = actionRequired
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : done
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-brand-100 bg-brand-50 text-brand-700'

  return (
    <article
      className={clsx(
        'kh-interactive-card flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border bg-card shadow-soft',
        actionRequired ? 'border-amber-200' : 'border-border',
        className,
      )}
    >
      <div className="kh-cover relative h-28 w-full" style={showImage ? undefined : cover.style}>
        {showImage ? (
          <img alt={serviceName} className="kh-card-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-500" decoding="async" loading="lazy" onError={() => setImageFailed(true)} src={cover.imageUrl} />
        ) : (
          <>
            <span aria-hidden="true" className="kh-cover-pattern" />
            <Layers aria-hidden="true" className="kh-cover-glyph" />
          </>
        )}
        <div className="kh-cover-content flex h-full flex-col justify-between p-3.5 text-start">
          <div className="flex items-center justify-between gap-2">
            <StatusBadge status={order?.status} />
            <span className="rounded-full bg-black/35 px-2 py-0.5 text-[0.7rem] font-extrabold text-white backdrop-blur">#{order?.order_number}</span>
          </div>
          <h3 className="line-clamp-1 text-sm font-black text-white drop-shadow">{serviceName}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <div className={clsx('flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-xs font-bold leading-5', nextTone)}>
          <NextIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{nextStep}</span>
        </div>

        {/* progress track */}
        {!negative ? (
          <div className="mt-3 flex items-center gap-1" aria-hidden="true">
            {STAGES.map((_, i) => (
              <span
                key={i}
                className={clsx('h-1.5 flex-1 rounded-full', i <= activeStage ? (actionRequired ? 'bg-amber-400' : done ? 'bg-green-500' : 'bg-brand-500') : 'bg-brand-50')}
              />
            ))}
          </div>
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="font-bold text-slate-500">{isArabic ? 'آخر تحديث' : 'Last update'}</dt>
          <dt className="font-bold text-slate-500">{isArabic ? 'التسليم المتوقع' : 'Expected delivery'}</dt>
          <dd className="truncate font-bold text-ink">{updatedAt ? formatDateTime(updatedAt, language) : '—'}</dd>
          <dd className="truncate font-bold text-ink">{formatDate(order?.expected_delivery_date, language)}</dd>
        </dl>

        {latestUpdate ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{latestUpdate}</p> : null}

        <Link
          className={clsx('mt-4 inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-extrabold transition', actionRequired ? 'btn-primary' : 'btn-secondary')}
          to={href}
        >
          <span>{actionRequired ? (isArabic ? 'إكمال المطلوب' : 'Complete now') : isArabic ? 'فتح الطلب' : 'Open request'}</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    </article>
  )
}

export default RequestCard
