import { Clock3 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { getServiceDuration } from '../utils/servicePresentation'

function ServiceDurationDisplay({ service, compact = false }) {
  const { language, isArabic } = useLanguage()
  const duration = getServiceDuration(service, language)

  return (
    <div className={compact ? 'space-y-1' : 'rounded-2xl border border-border bg-slate-50/80 p-3'}>
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Clock3 className="h-4 w-4 text-brand-600" />
        {isArabic ? 'المدة المتوقعة' : 'Expected time'}
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">
        {compact ? (isArabic ? 'تظهر التفاصيل في البطاقة الرئيسية' : 'Details shown in the main card') : duration.label}
      </p>
      {!compact && duration.note ? <p className="mt-1 text-xs leading-5 text-slate-500">{duration.note}</p> : null}
    </div>
  )
}

export default ServiceDurationDisplay
