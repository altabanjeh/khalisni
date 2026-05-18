import { CheckCircle, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { useToast } from '../context/ToastContext'

const VARIANTS = {
  success: { icon: CheckCircle, bg: 'bg-green-50 border-green-200', text: 'text-green-800', iconClass: 'text-green-500' },
  error: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800', iconClass: 'text-red-500' },
  warning: { icon: TriangleAlert, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', iconClass: 'text-amber-500' },
  info: { icon: Info, bg: 'bg-brand-50 border-brand-200', text: 'text-brand-800', iconClass: 'text-brand-500' },
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (!toasts.length) return null

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-3 px-4 sm:bottom-6"
    >
      {toasts.map((toast) => {
        const variant = VARIANTS[toast.type] || VARIANTS.info
        const Icon = variant.icon

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-3xl border p-4 shadow-panel backdrop-blur ${variant.bg} ${variant.text} animate-slide-up`}
            role="status"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${variant.iconClass}`} />
            <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
            <button
              aria-label="إغلاق الإشعار"
              className="shrink-0 rounded-xl p-1 opacity-60 transition hover:opacity-100"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
