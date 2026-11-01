import { CheckCircle2, Clock3 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDateTime } from '../utils/format'

const MAX_COMPLAINT_LENGTH = 4000

function firstFieldError(error, field) {
  const raw = error?.apiError?.fieldErrors?.[field] ?? error?.response?.data?.[field]
  const message = Array.isArray(raw) ? raw[0] : raw
  return typeof message === 'string' ? message : ''
}

export function ComplaintStatus({ resolved }) {
  const { isArabic } = useLanguage()
  return resolved ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-bold text-green-800" data-testid="complaint-status">
      <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
      {isArabic ? 'تمت المعالجة' : 'Resolved'}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800" data-testid="complaint-status">
      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
      {isArabic ? 'قيد المتابعة' : 'In follow-up'}
    </span>
  )
}

/**
 * Customer complaints on one order («متابعة شكاوى العملاء»). The staff
 * resolution text arrives in the order messages thread.
 */
function OrderComplaints({ orderId }) {
  const { language, isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: complaints = [], loading, error: loadError, reload } = useAsyncData(() => api.getCustomerOrderComplaints(orderId), [orderId], [])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const description = draft.trim()
    if (!description || sending) return
    setSending(true)
    setSendError('')
    setSent(false)
    try {
      await api.createCustomerOrderComplaint(orderId, description)
      setDraft('')
      setSent(true)
      reload()
    } catch (error) {
      setSendError(firstFieldError(error, 'description') || getDisplayError(error))
    } finally {
      setSending(false)
    }
  }

  const rows = Array.isArray(complaints) ? complaints : []

  return (
    <div className="space-y-4" data-testid="order-complaints">
      {loadError ? <p className="text-sm font-bold text-danger" role="alert">{getDisplayError(loadError)}</p> : null}
      {rows.length ? (
        <ul className="space-y-3" aria-label={tr('شكاواك على هذا الطلب', 'Your complaints on this request')}>
          {rows.map((item) => (
            <li className="rounded-[var(--radius-md)] border border-border bg-card p-3 text-sm leading-7" key={item.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ComplaintStatus resolved={Boolean(item.is_resolved)} />
                <span className="text-xs font-semibold text-slate-500">{formatDateTime(item.created_at, language)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-slate-700"><bdi>{item.description}</bdi></p>
              {item.is_resolved ? (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {tr('تجد رد الفريق في قسم الرسائل.', 'You will find the team’s reply in the messages section.')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : loading ? null : (
        <p className="text-sm font-semibold text-slate-500">{tr('لم تقدّم أي شكوى على هذا الطلب.', 'You have not filed a complaint on this request.')}</p>
      )}

      <form className="space-y-2" onSubmit={handleSubmit}>
        <label className="block text-sm font-bold text-ink" htmlFor={`order-complaint-${orderId}`}>{tr('صف المشكلة', 'Describe the problem')}</label>
        <textarea
          className="field min-h-24"
          id={`order-complaint-${orderId}`}
          maxLength={MAX_COMPLAINT_LENGTH}
          onChange={(event) => { setDraft(event.target.value); setSent(false) }}
          placeholder={tr('ما الذي حدث؟ سيتابع الفريق شكواك ويرد عليك.', 'What happened? The team will follow up and reply to you.')}
          value={draft}
        />
        {sendError ? <p className="text-sm font-bold text-danger" role="alert">{sendError}</p> : null}
        {sent ? <p className="text-sm font-bold text-green-700" role="status">{tr('تم إرسال شكواك، وسيتابعها الفريق.', 'Your complaint was sent; the team will follow up.')}</p> : null}
        <button className="btn-secondary w-full" disabled={sending || !draft.trim()} type="submit">
          {sending ? tr('جارٍ الإرسال...', 'Sending...') : tr('تقديم الشكوى', 'Submit complaint')}
        </button>
      </form>
    </div>
  )
}

export default OrderComplaints
