import { LifeBuoy } from 'lucide-react'
import { useState } from 'react'
import ConfirmModal from './ConfirmModal'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'

// Staff recovery for a waiting order whose missing-document request names no
// uploadable document (legacy records). Rendered only when the server reports
// `can_recover_missing_document_request`; the server re-checks everything.
function MissingRequestRecovery({ orderId, allowedActions, onRecovered }) {
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!allowedActions?.can_recover_missing_document_request) return null

  async function handleConfirm() {
    const clean = reason.trim()
    if (!clean || busy) return
    setBusy(true)
    try {
      await api.recoverMissingDocumentRequest(orderId, { reason: clean })
      toast(isArabic ? 'أُعيد الطلب إلى المراجعة. أرسل طلب مستندات جديداً إذا لزم.' : 'The request is back under review. Send a new document request if needed.', 'success')
      setOpen(false)
      setReason('')
      onRecovered?.()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-amber-300 bg-amber-50 p-5 shadow-soft sm:p-6" data-testid="missing-request-recovery">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-amber-100 text-amber-800"><LifeBuoy className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-black text-amber-950 sm:text-lg">{isArabic ? 'طلب مستندات غير صالح' : 'Unusable document request'}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
            {isArabic
              ? 'هذا الطلب بانتظار العميل، لكن لا يوجد مستند محدد يمكنه رفعه. أعد الطلب إلى المراجعة، ثم أرسل طلباً جديداً يحدد المستندات المطلوبة إن لزم.'
              : 'This request is waiting for the customer, but no document is named for upload. Return it to review, then send a new request naming the documents if needed.'}
          </p>
        </div>
      </div>
      <button className="btn-secondary mt-4 w-full" disabled={busy} onClick={() => setOpen(true)} type="button">
        {isArabic ? 'إعادة الطلب إلى المراجعة' : 'Return the request to review'}
      </button>
      <ConfirmModal
        confirmDisabled={!reason.trim()}
        confirmLabel={isArabic ? 'نعم، أعده إلى المراجعة' : 'Yes, return it to review'}
        description={isArabic ? 'سيُسجَّل هذا الإجراء مع اسمك والسبب في سجل التدقيق.' : 'This action is recorded with your name and reason in the audit log.'}
        loading={busy}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        open={open}
        title={isArabic ? 'تأكيد استرجاع الطلب' : 'Confirm recovery'}
      >
        <label className="block text-sm font-bold text-ink" htmlFor="missing-request-recovery-reason">{isArabic ? 'السبب (مطلوب)' : 'Reason (required)'}</label>
        <textarea
          className="field mt-2 min-h-24"
          id="missing-request-recovery-reason"
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
      </ConfirmModal>
    </section>
  )
}

export default MissingRequestRecovery
