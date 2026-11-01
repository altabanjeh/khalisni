import { Repeat2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import ConfirmModal from './ConfirmModal'

function firstFieldError(error, fields) {
  for (const field of fields) {
    const raw = error?.apiError?.fieldErrors?.[field] ?? error?.response?.data?.[field]
    const message = Array.isArray(raw) ? raw[0] : raw
    if (typeof message === 'string' && message) return message
  }
  return ''
}

/**
 * Staff control to move an assigned / in-progress order to another eligible
 * provider. Shown only when the server allows it (can_reassign_provider).
 * `providers` is the same eligible-provider list the assign form uses.
 */
function ReassignProviderPanel({ order, providers = [], onReassigned }) {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [providerId, setProviderId] = useState('')
  const [reason, setReason] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [validation, setValidation] = useState({})

  if (!order?.allowed_actions?.can_reassign_provider) return null

  const currentId = order.assigned_provider?.id != null ? String(order.assigned_provider.id) : ''
  const options = (providers || []).filter((provider) => String(provider.id) !== currentId)
  const selected = options.find((provider) => String(provider.id) === String(providerId))

  function handleSubmit(event) {
    event.preventDefault()
    const next = {}
    if (!providerId) next.provider = tr('اختر المزوّد الجديد.', 'Select the new provider.')
    if (!reason.trim()) next.reason = tr('سبب التغيير مطلوب.', 'A reason is required.')
    setValidation(next)
    setError('')
    if (Object.keys(next).length) return
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (saving) return
    setSaving(true)
    try {
      await api.reassignOrderProvider(order.id, { provider_id: Number(providerId), reason: reason.trim() })
      setConfirmOpen(false)
      setProviderId('')
      setReason('')
      onReassigned?.()
    } catch (submitError) {
      setConfirmOpen(false)
      setError(firstFieldError(submitError, ['provider_id', 'reason']) || getDisplayError(submitError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6" data-testid="reassign-provider">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600">
          <Repeat2 aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-ink sm:text-lg">{tr('تغيير مزود الخدمة', 'Change provider')}</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {tr(
              `المزوّد الحالي: ${order.assigned_provider?.full_name || 'غير معيّن'}. يعود الطلب إلى حالة «تم الإسناد» مع المزوّد الجديد ويفقد المزوّد السابق الوصول إليه.`,
              `Current provider: ${order.assigned_provider?.full_name || 'unassigned'}. The request returns to "Assigned" with the new provider, and the previous provider loses access.`,
            )}
          </p>
        </div>
      </div>
      <form className="mt-5 space-y-3" noValidate onSubmit={handleSubmit}>
        <label className="block text-sm font-bold text-ink" htmlFor={`reassign-provider-${order.id}`}>{tr('المزوّد الجديد', 'New provider')}</label>
        <select
          aria-invalid={validation.provider ? 'true' : undefined}
          className="field"
          id={`reassign-provider-${order.id}`}
          onChange={(event) => setProviderId(event.target.value)}
          value={providerId}
        >
          <option value="">{tr('اختر مزوّد الخدمة', 'Select a provider')}</option>
          {options.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.full_name}{provider.city ? ` — ${provider.city}` : ''}
            </option>
          ))}
        </select>
        {!options.length ? <p className="text-sm font-semibold text-slate-500">{tr('لا يوجد مزوّد مؤهل آخر لهذه الخدمة حالياً.', 'No other eligible provider for this service right now.')}</p> : null}
        {validation.provider ? <p className="text-sm font-bold text-danger">{validation.provider}</p> : null}
        <label className="block text-sm font-bold text-ink" htmlFor={`reassign-reason-${order.id}`}>{tr('سبب التغيير (مطلوب)', 'Reason for the change (required)')}</label>
        <textarea
          aria-invalid={validation.reason ? 'true' : undefined}
          className="field min-h-20"
          id={`reassign-reason-${order.id}`}
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
          value={reason}
        />
        {validation.reason ? <p className="text-sm font-bold text-danger">{validation.reason}</p> : null}
        {error ? <p className="text-sm font-bold text-danger" role="alert">{error}</p> : null}
        <button className="btn-secondary w-full" disabled={saving || !options.length} type="submit">
          {tr('تغيير المزوّد', 'Change provider')}
        </button>
      </form>
      <ConfirmModal
        confirmLabel={tr('نعم، غيّر المزوّد', 'Yes, change provider')}
        description={tr(
          `سيُنقل الطلب إلى ${selected?.full_name || 'المزوّد المختار'} ويُبلَّغ بذلك.`,
          `The request will move to ${selected?.full_name || 'the selected provider'}, who will be notified.`,
        )}
        loading={saving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        open={confirmOpen}
        title={tr('تأكيد تغيير المزوّد', 'Confirm provider change')}
      />
    </section>
  )
}

export default ReassignProviderPanel
