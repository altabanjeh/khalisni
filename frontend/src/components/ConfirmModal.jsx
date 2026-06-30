import { TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onClose,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'default',
  loading = false,
  confirmDisabled = false,
  children,
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-slide-up rounded-3xl bg-white p-6 shadow-soft">
        {isDanger && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
            <TriangleAlert className="h-6 w-6 text-danger" />
          </div>
        )}
        <h3 className="text-xl font-bold text-ink">{title}</h3>
        {description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex gap-3">
          <button
            className={isDanger ? 'btn-danger flex-1' : 'btn-primary flex-1'}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            type="button"
          >
            {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : null}
            {confirmLabel}
          </button>
          <button className="btn-secondary flex-1" onClick={onClose} disabled={loading} type="button">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
