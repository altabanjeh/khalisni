import { useEffect, useState } from 'react'
import { useLanguage } from '../context/LanguageContext'
import ConfirmModal from './ConfirmModal'

const defaultForm = {
  delete_reason: '',
  delete_password: '',
}

function AdminSoftDeleteModal({
  open,
  title,
  description,
  impact,
  reasonLabel,
  reasonPlaceholder,
  passwordLabel,
  passwordPlaceholder,
  requireReason = false,
  loading = false,
  onClose,
  onConfirm,
  confirmLabel,
}) {
  const { isArabic } = useLanguage()
  const [form, setForm] = useState(defaultForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(defaultForm)
      setError('')
    }
  }, [open])

  async function handleConfirm() {
    if (requireReason && !form.delete_reason.trim()) {
      setError(isArabic ? 'سبب الحذف مطلوب.' : 'Delete reason is required.')
      return
    }

    setError('')
    await onConfirm({
      delete_reason: form.delete_reason.trim(),
      delete_password: form.delete_password,
    })
  }

  return (
    <ConfirmModal
      confirmDisabled={loading}
      confirmLabel={confirmLabel || (isArabic ? 'تأكيد الحذف' : 'Confirm delete')}
      description={description}
      loading={loading}
      onClose={onClose}
      onConfirm={handleConfirm}
      open={open}
      title={title}
      variant="danger"
    >
      <div className="space-y-3">
        {impact ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {impact}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">
            {reasonLabel || (isArabic ? 'سبب الحذف' : 'Delete reason')}
            {requireReason ? ' *' : ''}
          </span>
          <textarea
            className="field min-h-24"
            onChange={(event) => setForm((current) => ({ ...current, delete_reason: event.target.value }))}
            placeholder={
              reasonPlaceholder
              || (isArabic ? 'اكتب سبب الحذف لأغراض التدقيق والاسترجاع.' : 'Add a reason for audit and recovery history.')
            }
            value={form.delete_reason}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-ink">
            {passwordLabel || (isArabic ? 'كلمة مرور الحذف' : 'Delete password')}
          </span>
          <input
            className="field"
            onChange={(event) => setForm((current) => ({ ...current, delete_password: event.target.value }))}
            placeholder={
              passwordPlaceholder
              || (isArabic ? 'أدخل كلمة مرور الحذف إذا كانت مفعلة.' : 'Enter the delete password if protection is enabled.')
            }
            type="password"
            value={form.delete_password}
          />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </ConfirmModal>
  )
}

export default AdminSoftDeleteModal
