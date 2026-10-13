import { RefreshCw, TriangleAlert } from 'lucide-react'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'

/**
 * Shown when a screen's data could not be loaded. A failed load is not an
 * empty list, so screens render this instead of their empty state.
 */
function LoadError({ error, onRetry, title, action, compact = false }) {
  const { isArabic } = useLanguage()

  return (
    <div
      className={compact
        ? 'flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-start'
        : 'glass-panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center'}
      role="alert"
    >
      {compact ? null : (
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-danger">
          <TriangleAlert className="h-6 w-6" />
        </span>
      )}
      <div className={compact ? 'min-w-0 flex-1' : undefined}>
        <h3 className={compact ? 'text-sm font-bold text-danger' : 'text-xl font-bold text-ink'}>
          {title || (isArabic ? 'تعذر تحميل البيانات' : 'Could not load the data')}
        </h3>
        <p className={compact ? 'mt-1 text-sm text-slate-700' : 'mt-2 max-w-xl text-sm text-slate-600'}>
          {typeof error === 'string' ? error : getDisplayError(error)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <button className="btn-secondary" onClick={() => onRetry()} type="button">
            <RefreshCw className="h-4 w-4" />
            {isArabic ? 'إعادة المحاولة' : 'Retry'}
          </button>
        ) : null}
        {action}
      </div>
    </div>
  )
}

export default LoadError
