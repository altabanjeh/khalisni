import { CircleHelp } from 'lucide-react'
import { useContext, useMemo, useState } from 'react'
import { HelpGuideContext } from '../context/HelpGuideContext'

function buildFieldMessage(guide) {
  if (!guide) return ''
  return (
    guide.tooltip_text ||
    guide.purpose ||
    guide.accepted_format ||
    guide.validation_rule ||
    guide.error_explanation ||
    ''
  )
}

function buildActionMessage(guide) {
  if (!guide) return ''
  return guide.when_to_use || guide.purpose || guide.action_result || guide.warning_message || ''
}

function InlineHelp({ actionKey = '', fieldKey = '', fallbackText = '', title = '', className = '' }) {
  const helpContext = useContext(HelpGuideContext)
  const [open, setOpen] = useState(false)

  const guide = fieldKey
    ? helpContext?.findFieldHelp?.(fieldKey)
    : helpContext?.findActionHelp?.(actionKey)
  const message = useMemo(() => {
    if (fieldKey) return buildFieldMessage(guide) || fallbackText
    return buildActionMessage(guide) || fallbackText
  }, [fallbackText, fieldKey, guide])

  if (!message) return null

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        aria-label={title || 'مساعدة إضافية'}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-brand-600 transition hover:bg-brand-50"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        type="button"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {open ? (
        <span className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-border bg-white p-3 text-right text-xs leading-6 text-slate-600 shadow-soft">
          {title ? <span className="mb-1 block font-semibold text-ink">{title}</span> : null}
          {message}
        </span>
      ) : null}
    </span>
  )
}

export function HelpLabel({ actionKey = '', children, fieldKey = '', fallbackText = '' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{children}</span>
      <InlineHelp actionKey={actionKey} fallbackText={fallbackText} fieldKey={fieldKey} title={String(children)} />
    </span>
  )
}

export default InlineHelp
