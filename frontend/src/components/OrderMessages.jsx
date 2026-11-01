import { MessagesSquare, SendHorizontal } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatDateTime } from '../utils/format'

const MAX_MESSAGE_LENGTH = 2000

function firstFieldError(error, field) {
  const raw = error?.apiError?.fieldErrors?.[field] ?? error?.response?.data?.[field]
  const message = Array.isArray(raw) ? raw[0] : raw
  return typeof message === 'string' ? message : ''
}

/**
 * Customer <-> support messages on one order («مراسلة الدعم الفني»).
 * Staff replies are customer-visible notes written on the staff order page;
 * the customer sees "Khalsni team", never a staff member's name.
 */
function OrderMessages({ orderId, canSend = true }) {
  const { language, isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const { data: messages = [], loading, error: loadError, reload } = useAsyncData(() => api.getCustomerOrderMessages(orderId), [orderId], [])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || sending) return
    setSending(true)
    setSendError('')
    try {
      await api.sendCustomerOrderMessage(orderId, message)
      setDraft('')
      reload()
    } catch (error) {
      setSendError(firstFieldError(error, 'message') || getDisplayError(error))
    } finally {
      setSending(false)
    }
  }

  const rows = Array.isArray(messages) ? messages : []

  return (
    <div className="space-y-4" data-testid="order-messages">
      {loadError ? <p className="text-sm font-bold text-danger" role="alert">{getDisplayError(loadError)}</p> : null}
      {loading && !rows.length ? (
        <p className="text-sm font-semibold text-slate-500">{tr('جارٍ تحميل الرسائل...', 'Loading messages...')}</p>
      ) : rows.length ? (
        <ol className="max-h-96 space-y-3 overflow-y-auto" aria-label={tr('الرسائل', 'Messages')}>
          {rows.map((item) => {
            const mine = item.author_role === 'customer'
            return (
              <li
                className={`rounded-[var(--radius-md)] border p-3 text-sm leading-7 ${mine ? 'ms-6 border-brand-100 bg-brand-50' : 'me-6 border-border bg-card'}`}
                data-author={mine ? 'customer' : 'staff'}
                key={item.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                  <span className={mine ? 'text-brand-700' : 'text-ink'}>{mine ? tr('أنت', 'You') : tr('فريق خلصني', 'Khalsni team')}</span>
                  <span>{formatDateTime(item.created_at, language)}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-slate-700"><bdi>{item.message}</bdi></p>
              </li>
            )
          })}
        </ol>
      ) : (
        <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-dashed border-border bg-brand-50/40 p-4 text-sm font-semibold leading-7 text-slate-600">
          <MessagesSquare aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
          {tr('لا توجد رسائل بعد. اكتب سؤالك وسيرد عليك فريق خلصني هنا.', 'No messages yet. Write your question and the Khalsni team will reply here.')}
        </div>
      )}

      {canSend ? (
        <form className="space-y-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-ink" htmlFor={`order-message-${orderId}`}>{tr('رسالتك إلى فريق الدعم', 'Your message to support')}</label>
          <textarea
            className="field min-h-24"
            id={`order-message-${orderId}`}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={tr('اكتب رسالتك هنا', 'Write your message here')}
            value={draft}
          />
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500">
            <span>{draft.length}/{MAX_MESSAGE_LENGTH}</span>
          </div>
          {sendError ? <p className="text-sm font-bold text-danger" role="alert">{sendError}</p> : null}
          <button className="btn-primary w-full" disabled={sending || !draft.trim()} type="submit">
            <SendHorizontal aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
            {sending ? tr('جارٍ الإرسال...', 'Sending...') : tr('إرسال الرسالة', 'Send message')}
          </button>
        </form>
      ) : (
        <p className="text-sm font-semibold text-slate-500">{tr('لا يمكن إرسال رسائل على هذا الطلب.', 'Messages cannot be sent on this request.')}</p>
      )}
    </div>
  )
}

export default OrderMessages
