import { useLanguage } from '../context/LanguageContext'

/**
 * The request details the customer submitted: their own notes followed by the
 * server-built answers block (service form answers, including repeater rows
 * such as partners or plots, one per line). Newlines are kept so each answer
 * and each row stays on its own line.
 */
function OrderRequestDetails({ text, testId = 'order-request-details' }) {
  const { isArabic } = useLanguage()
  const value = String(text || '').trim()
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4 text-sm leading-7 text-slate-600" data-testid={testId}>
      {value ? (
        <p className="whitespace-pre-line text-start"><bdi>{value}</bdi></p>
      ) : (
        <p>{isArabic ? 'لا توجد تفاصيل مسجلة على هذا الطلب.' : 'No details are recorded on this request.'}</p>
      )}
    </div>
  )
}

export default OrderRequestDetails
