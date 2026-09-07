import { useLanguage } from '../context/LanguageContext'

function LoadingSpinner({ label }) {
  const { isArabic } = useLanguage()
  const resolvedLabel = label ?? (isArabic ? 'جارٍ التحميل...' : 'Loading…')
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-border bg-card p-8 shadow-soft">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--kh-border-strong)] border-t-[var(--kh-primary)]" />
      <p className="text-sm font-semibold text-slate-600">{resolvedLabel}</p>
    </div>
  )
}

export default LoadingSpinner
