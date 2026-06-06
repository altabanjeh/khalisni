import { CircleHelp } from 'lucide-react'

function openHelpPanel() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('khalisni:open-help'))
}

function ContextHelpButton({ className = '', label = 'Open page help' }) {
  return (
    <button
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 ${className}`.trim()}
      onClick={openHelpPanel}
      type="button"
    >
      <CircleHelp className="h-4 w-4" />
    </button>
  )
}

export default ContextHelpButton
