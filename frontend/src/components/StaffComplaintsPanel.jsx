import { MessageSquareWarning } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDateTime } from '../utils/format'
import { ComplaintStatus } from './OrderComplaints'

const MAX_RESOLUTION_LENGTH = 2000

function firstFieldError(error, field) {
  const raw = error?.apiError?.fieldErrors?.[field] ?? error?.response?.data?.[field]
  const message = Array.isArray(raw) ? raw[0] : raw
  return typeof message === 'string' ? message : ''
}

function ResolveForm({ orderId, complaint, onResolved }) {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fieldId = `complaint-${complaint.id}-resolution`

  async function handleSubmit(event) {
    event.preventDefault()
    const value = note.trim()
    if (!value) {
      setError(tr('اكتب ملاحظة المعالجة؛ تُرسل للعميل كرسالة.', 'Write the resolution note; it is sent to the customer as a message.'))
      return
    }
    if (saving) return
    setSaving(true)
    setError('')
    try {
      await api.resolveStaffOrderComplaint(orderId, complaint.id, value)
      setNote('')
      onResolved?.()
    } catch (submitError) {
      setError(firstFieldError(submitError, 'resolution_note') || getDisplayError(submitError))
      // Already resolved elsewhere: show the current state.
      if (submitError?.response?.status === 400 && submitError?.response?.data?.detail) onResolved?.({ silent: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
      <label className="block text-xs font-bold text-ink" htmlFor={fieldId}>
        {tr('ملاحظة المعالجة (تُرسل للعميل كرسالة)', 'Resolution note (sent to the customer as a message)')}
      </label>
      <textarea
        aria-required="true"
        className="field min-h-20"
        id={fieldId}
        maxLength={MAX_RESOLUTION_LENGTH}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      {error ? <p className="text-sm font-bold text-danger" role="alert">{error}</p> : null}
      <button className="btn-secondary w-full" disabled={saving} type="submit">
        {saving ? tr('جارٍ الحفظ...', 'Saving...') : tr('معالجة الشكوى', 'Resolve complaint')}
      </button>
    </form>
  )
}

/** Staff follow-up of the customer complaints on one order. */
function StaffComplaintsPanel({ orderId, onChanged }) {
  const { language, isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: complaints = [], loading, error, reload } = useAsyncData(() => api.getStaffOrderComplaints(orderId), [orderId], [])
  const rows = Array.isArray(complaints) ? complaints : []
  const openCount = rows.filter((item) => !item.is_resolved).length

  function handleResolved() {
    reload()
    onChanged?.()
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6" data-testid="staff-complaints">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
          <MessageSquareWarning aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-ink sm:text-lg">{tr('شكاوى العميل', 'Customer complaints')}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {openCount
              ? tr(`${openCount} قيد المتابعة. ملاحظة المعالجة تُرسل للعميل كرسالة.`, `${openCount} in follow-up. The resolution note is sent to the customer as a message.`)
              : tr('تابع شكاوى العميل على هذا الطلب.', 'Follow up the customer’s complaints on this request.')}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {error ? <p className="text-sm font-bold text-danger" role="alert">{getDisplayError(error)}</p> : null}
        {rows.length ? rows.map((item) => (
          <article className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-3 text-sm leading-7" data-testid="staff-complaint" key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ComplaintStatus resolved={Boolean(item.is_resolved)} />
              <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.created_at, language)}</span>
            </div>
            <p className="mt-2 whitespace-pre-line text-slate-700"><bdi>{item.description}</bdi></p>
            {item.is_resolved ? (
              item.resolved_at ? <p className="mt-1 text-xs font-semibold text-slate-500">{tr('عولجت في', 'Resolved on')} {formatDateTime(item.resolved_at, language)}</p> : null
            ) : (
              <ResolveForm complaint={item} onResolved={handleResolved} orderId={orderId} />
            )}
          </article>
        )) : loading ? null : (
          <p className="text-sm font-semibold text-slate-500">{tr('لا توجد شكاوى على هذا الطلب.', 'No complaints on this request.')}</p>
        )}
      </div>
    </section>
  )
}

export default StaffComplaintsPanel
