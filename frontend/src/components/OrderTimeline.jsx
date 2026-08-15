import { CheckCircle2, Circle } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { formatDateTime } from '../utils/format'
import StatusBadge from './StatusBadge'

function OrderTimeline({ items = [], variant = 'default' }) {
  const { language, isArabic } = useLanguage()
  const isPublic = variant === 'public'

  if (!items.length) {
    return (
      <div className={isPublic
        ? 'rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-white px-5 py-6 text-sm font-semibold leading-7 text-slate-500'
        : 'rounded-[var(--radius)] border border-dashed border-border bg-slate-50 px-5 py-6 text-sm leading-7 text-slate-500'}
      >
        {isArabic ? 'لا توجد تحديثات مسجلة على هذا الطلب حتى الآن.' : 'No updates have been logged for this order yet.'}
      </div>
    )
  }

  return (
    <ol className="relative space-y-0">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        const status = item.new_status || item.status

        return (
          <li key={item.id || index} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-4 pb-6 last:pb-0">
            <div className="relative flex justify-center">
              {!isLast ? <span className={isPublic ? 'absolute top-11 h-[calc(100%-1.5rem)] w-px bg-border' : 'absolute top-11 h-[calc(100%-1.5rem)] w-px bg-border'} /> : null}
              <span className={isLast
                ? 'relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--khalsni-public-primary)] text-white shadow-soft'
                : isPublic
                  ? 'relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700 ring-1 ring-green-100'
                  : 'relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-700 ring-1 ring-green-100'}
              >
                {isLast ? <Circle className="h-4 w-4 fill-current" /> : <CheckCircle2 className="h-5 w-5" />}
              </span>
            </div>
            <article className={isPublic
              ? 'rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4 shadow-sm'
              : isLast
                ? 'rounded-[var(--radius)] border border-brand-100 bg-brand-50 p-4'
                : 'rounded-[var(--radius)] border border-border bg-white p-4'}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge status={status} />
                <span className={isPublic ? 'text-xs font-semibold text-slate-500' : 'text-xs font-semibold text-slate-500'}>{formatDateTime(item.created_at, language)}</span>
              </div>
              <p className={isPublic ? 'mt-3 text-sm font-semibold leading-7 text-slate-600' : 'mt-3 text-sm leading-7 text-slate-600'}>
                {item.note || (isArabic ? 'لا توجد ملاحظات إضافية لهذا التحديث.' : 'No additional notes are available for this update.')}
              </p>
            </article>
          </li>
        )
      })}
    </ol>
  )
}

export default OrderTimeline
