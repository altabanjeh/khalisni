import { X } from 'lucide-react'
import { useEffect } from 'react'

const sizeClasses = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
}

function FormModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'lg',
}) {
  useEffect(() => {
    if (!open) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-soft ${sizeClasses[size] || sizeClasses.lg}`}>
        <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-ink">{title}</h2>
              {description ? <p className="max-w-2xl text-sm leading-7 text-slate-600">{description}</p> : null}
            </div>

            <button
              aria-label="إغلاق"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-ink"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 sm:px-7">{children}</div>

        {footer ? <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4 sm:px-7">{footer}</div> : null}
      </div>
    </div>
  )
}

export default FormModal
