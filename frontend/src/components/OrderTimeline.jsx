import { AlertTriangle, Check, CircleDot, X } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatDateTime } from '../utils/format'
import StatusBadge from './StatusBadge'

const NEGATIVE = new Set(['REJECTED', 'CANCELLED'])
const ACTION = new Set(['WAITING_CUSTOMER'])

function OrderTimeline({ items = [], variant = 'default' }) {
  const { language, isArabic } = useLanguage()
  const isPublic = variant === 'public'

  if (!items.length) {
    return (
      <div
        className={
          isPublic
            ? 'rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-5 py-6 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]'
            : 'rounded-[var(--radius)] border border-dashed border-border bg-slate-50 px-5 py-6 text-sm leading-7 text-slate-500'
        }
      >
        {isArabic ? 'لا توجد تحديثات مسجلة على هذا الطلب حتى الآن.' : 'No updates have been logged for this request yet.'}
      </div>
    )
  }

  return (
    <ol className="relative space-y-0">
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1
        const status = String(item.new_status || item.status || '').toUpperCase()
        const negative = isCurrent && NEGATIVE.has(status)
        const action = isCurrent && ACTION.has(status)

        const markerClass = negative
          ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
          : action
            ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
            : isCurrent
              ? 'bg-[var(--kh-primary)] text-white shadow-soft'
              : 'bg-green-50 text-green-700 ring-1 ring-green-200'

        const MarkerIcon = negative ? X : action ? AlertTriangle : isCurrent ? CircleDot : Check
        const stageLabel = negative
          ? isArabic ? 'أُغلق الطلب' : 'Request closed'
          : action
            ? isArabic ? 'بانتظار إجراء منك' : 'Waiting for you'
            : isCurrent
              ? isArabic ? 'المرحلة الحالية' : 'Current stage'
              : isArabic ? 'مرحلة مكتملة' : 'Completed'

        return (
          <li key={item.id || index} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
            <div className="relative flex justify-center">
              {!isCurrent ? <span className="absolute top-11 h-[calc(100%-1.5rem)] w-px bg-border" /> : null}
              <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${markerClass}`}>
                <MarkerIcon className="h-4 w-4" />
              </span>
            </div>
            <article
              className={
                isCurrent
                  ? 'rounded-[var(--radius)] border border-brand-100 bg-brand-50 p-4'
                  : 'rounded-[var(--radius)] border border-border bg-card p-4'
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.new_status || item.status} />
                  <span className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">{stageLabel}</span>
                </div>
                <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.created_at, language)}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {item.note || (isArabic ? 'لا توجد ملاحظات إضافية لهذا التحديث.' : 'No additional notes for this update.')}
              </p>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export default OrderTimeline
