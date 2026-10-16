import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

function Pagination({ page, pageSize, total, onChange }) {
  const { isArabic } = useLanguage()
  // "Previous" points toward the start of the reading direction.
  const PreviousIcon = isArabic ? ChevronRight : ChevronLeft
  const NextIcon = isArabic ? ChevronLeft : ChevronRight
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  function pages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

    const result = [1]
    if (page > 4) result.push('...')
    for (let index = Math.max(2, page - 1); index <= Math.min(totalPages - 1, page + 1); index += 1) {
      result.push(index)
    }
    if (page < totalPages - 3) result.push('...')
    result.push(totalPages)
    return result
  }

  return (
    <div className="panel-muted flex flex-col gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-600">
        {isArabic
          ? `عرض ${rangeStart} - ${rangeEnd} من ${total}`
          : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
      </p>

      <nav aria-label={isArabic ? 'التنقل بين الصفحات' : 'Pagination'} className="flex items-center gap-1">
        <button
          aria-label={isArabic ? 'الصفحة السابقة' : 'Previous page'}
          className="btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          type="button"
        >
          <PreviousIcon className="h-4 w-4" />
        </button>

        {pages().map((entry, index) =>
          entry === '...' ? (
            <span key={`ellipsis-${index}`} className="px-2 text-slate-600" aria-hidden="true">
              ...
            </span>
          ) : (
            <button
              key={entry}
              aria-current={entry === page ? 'page' : undefined}
              aria-label={isArabic ? `الصفحة ${entry} من ${totalPages}` : `Page ${entry} of ${totalPages}`}
              className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                entry === page ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50'
              }`}
              onClick={() => onChange(entry)}
              type="button"
            >
              {entry}
            </button>
          ),
        )}

        <button
          aria-label={isArabic ? 'الصفحة التالية' : 'Next page'}
          className="btn-ghost px-2 py-1.5 disabled:opacity-40"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
          type="button"
        >
          <NextIcon className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}

export default Pagination
