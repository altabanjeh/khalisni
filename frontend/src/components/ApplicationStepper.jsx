import { CheckCircle2 } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

function ApplicationStepper({ steps = [], currentIndex = 0 }) {
  const { isArabic } = useLanguage()
  const kicker = (index, isActive, isDone) => {
    if (isDone) return isArabic ? 'تم' : 'Done'
    if (isActive) return isArabic ? 'الخطوة الحالية' : 'Current step'
    return isArabic ? `الخطوة ${index + 1}` : `Step ${index + 1}`
  }
  return (
    <nav aria-label="Application steps" className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-soft">
      <ol className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isDone = index < currentIndex

          return (
            <li
              key={step}
              aria-current={isActive ? 'step' : undefined}
              className={
                isActive
                  ? 'rounded-[var(--radius)] bg-brand-600 p-4 text-white'
                  : isDone
                    ? 'rounded-[var(--radius)] border border-green-200 bg-green-50 p-4 text-green-700'
                    : 'rounded-[var(--radius)] border border-border bg-slate-50 p-4 text-slate-600'
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={
                    isDone
                      ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700'
                      : isActive
                        ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-extrabold text-brand-700'
                        : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card font-extrabold text-slate-500'
                  }
                >
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </span>
                <span className="text-sm font-extrabold">
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wide opacity-70">
                    {kicker(index, isActive, isDone)}
                  </span>
                  {step}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ApplicationStepper
