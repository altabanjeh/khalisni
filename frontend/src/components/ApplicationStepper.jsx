import clsx from 'clsx'
import { Check } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

/**
 * Functional application progress + navigation.
 *
 *  - completed steps are buttons (jump back)
 *  - the current step is highlighted with aria-current="step"
 *  - future steps are inert
 *  - a step can be marked `blocked` (validation failed) — shown in danger tone
 */
function ApplicationStepper({ steps = [], currentIndex = 0, onStepClick, blockedIndex = -1 }) {
  const { isArabic } = useLanguage()

  return (
    <nav aria-label={isArabic ? 'مراحل الطلب' : 'Application steps'} className="rounded-[var(--radius-xl)] border border-border bg-card p-3 shadow-soft sm:p-4">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isDone = index < currentIndex
          const isBlocked = index === blockedIndex
          const clickable = typeof onStepClick === 'function' && (isDone || index < currentIndex)
          const Tag = clickable ? 'button' : 'div'

          return (
            <li className="flex-1" key={step}>
              <Tag
                {...(clickable ? { type: 'button', onClick: () => onStepClick(index) } : {})}
                aria-current={isActive ? 'step' : undefined}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-[var(--radius)] p-3 text-start transition',
                  isBlocked
                    ? 'border border-red-200 bg-red-50 text-red-700'
                    : isActive
                      ? 'bg-brand-600 text-white shadow-sm'
                      : isDone
                        ? 'border border-green-200 bg-green-50 text-green-700 hover:brightness-95'
                        : 'border border-border bg-slate-50 text-slate-500',
                  clickable && 'kh-focusable cursor-pointer',
                )}
              >
                <span
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black',
                    isBlocked
                      ? 'bg-red-100 text-red-700'
                      : isActive
                        ? 'bg-white text-brand-700'
                        : isDone
                          ? 'bg-green-100 text-green-700'
                          : 'bg-white text-slate-400',
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.6rem] font-bold uppercase tracking-wide opacity-70">
                    {isDone ? (isArabic ? 'مكتملة' : 'Done') : isActive ? (isArabic ? 'الحالية' : 'Current') : `${index + 1}`}
                  </span>
                  <span className="block truncate text-sm font-extrabold">{step}</span>
                </span>
              </Tag>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ApplicationStepper
