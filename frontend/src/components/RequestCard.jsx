import clsx from 'clsx'
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { formatDate, formatDateTime } from '../utils/format'
import { getServiceName } from '../utils/servicePresentation'
import { ImageFallback } from './public/PublicPage'
import StatusBadge from './StatusBadge'

const ACTION_REQUIRED = new Set(['WAITING_CUSTOMER'])
const DONE = new Set(['COMPLETED', 'DELIVERED', 'CLOSED', 'VERIFIED'])
const CLOSED_NEGATIVE = new Set(['CANCELLED', 'REJECTED'])

/**
 * Customer-facing request card. Answers, at a glance:
 *   what is this  ·  where is it  ·  what happens next  ·  do I need to act
 * Deliberately shows decision information only — no raw DB metadata.
 */
function RequestCard({ order, className = '', to }) {
  const { language, isArabic } = useLanguage()
  const status = String(order?.status || '').toUpperCase()
  const serviceName = order?.service ? getServiceName(order.service, language) : isArabic ? 'خدمة غير محددة' : 'Unspecified service'
  const serviceImage = order?.service?.image_url || order?.service?.image || order?.service?.category?.image_url
  const href = to || `/customer/orders/${order?.id}`
  const lastLog = Array.isArray(order?.status_logs) && order.status_logs.length ? order.status_logs[order.status_logs.length - 1] : null
  const latestUpdate = lastLog?.note || order?.latest_update || ''
  const updatedAt = order?.updated_at || lastLog?.created_at || order?.created_at

  const actionRequired = ACTION_REQUIRED.has(status) || (order?.missing_document_types?.length ?? 0) > 0
  const done = DONE.has(status)
  const negative = CLOSED_NEGATIVE.has(status)

  const nextStep = actionRequired
    ? isArabic
      ? 'مطلوب إجراء منك: راجع التفاصيل وأكمل النواقص.'
      : 'Action needed from you: open the request and complete what is missing.'
    : done
      ? isArabic
        ? 'اكتمل هذا الطلب.'
        : 'This request is complete.'
      : negative
        ? isArabic
          ? 'تم إغلاق هذا الطلب.'
          : 'This request has been closed.'
        : isArabic
          ? 'فريق خلصني يعمل على طلبك — لا حاجة لإجراء منك الآن.'
          : 'Khalsni is working on your request — nothing needed from you right now.'

  const NextIcon = actionRequired ? AlertTriangle : done ? CheckCircle2 : Clock3
  const nextTone = actionRequired
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : done
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-brand-100 bg-brand-50 text-brand-700'

  return (
    <article
      className={clsx(
        'kh-interactive-card flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card shadow-soft',
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4 sm:p-5">
        <ImageFallback
          alt={serviceName}
          className="h-14 w-14 shrink-0 rounded-[var(--radius-md)]"
          icon={FileText}
          src={serviceImage}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order?.status} />
            <span className="text-xs font-bold text-slate-500">#{order?.order_number}</span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-extrabold leading-6 text-ink">{serviceName}</h3>
        </div>
      </div>

      <div className={clsx('mx-4 flex items-start gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-xs font-semibold leading-6 sm:mx-5', nextTone)}>
        <NextIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{nextStep}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-xs sm:p-5">
        <dt className="font-bold text-slate-500">{isArabic ? 'آخر تحديث' : 'Last update'}</dt>
        <dt className="font-bold text-slate-500">{isArabic ? 'التسليم المتوقع' : 'Expected delivery'}</dt>
        <dd className="truncate font-semibold text-ink">{updatedAt ? formatDateTime(updatedAt, language) : '—'}</dd>
        <dd className="truncate font-semibold text-ink">{formatDate(order?.expected_delivery_date, language)}</dd>
      </dl>

      {latestUpdate ? (
        <p className="line-clamp-2 px-4 pb-4 text-xs leading-6 text-slate-600 sm:px-5">{latestUpdate}</p>
      ) : null}

      <div className="mt-auto border-t border-border p-4 sm:p-5">
        <Link
          className={clsx('inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-extrabold transition', actionRequired ? 'btn-primary' : 'btn-secondary')}
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
