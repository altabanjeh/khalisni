import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import { getStatusLabel } from '../../utils/format'

function AdminOrderDetailsPage() {
  const { id } = useParams()
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('success')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { data: order, loading, error, reload } = useAsyncData(() => api.getAdminOrder(id), [id], null)
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const statusForm = useForm()
  const noteForm = useForm({
    defaultValues: {
      visibility: 'INTERNAL',
    },
  })
  const assignForm = useForm()

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  }

  if (loading || !order) return <LoadingSpinner />

  const allowedActions = getOrderAllowedActions(order)
  const availableStatusTransitions = allowedActions.available_status_transitions || []
  const noteVisibilityOptions = []

  if (allowedActions.can_add_internal_note) {
    noteVisibilityOptions.push({ value: 'INTERNAL', label: 'داخلية' })
  }
  if (allowedActions.can_add_customer_note) {
    noteVisibilityOptions.push({ value: 'CUSTOMER', label: 'مرئية للعميل' })
  }

  async function handleStatus(values) {
    try {
      await api.changeOrderStatus(id, values)
      reload()
      setMessageTone('success')
      setMessage('تم تحديث الحالة.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleAssign(values) {
    try {
      await api.assignOrder(id, values)
      reload()
      setMessageTone('success')
      setMessage('تم تعيين مزود الخدمة.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleNote(values) {
    const visibility =
      noteVisibilityOptions.find((option) => option.value === values.visibility)?.value || noteVisibilityOptions[0]?.value || 'INTERNAL'

    try {
      await api.addAdminNote(id, { ...values, visibility })
      reload()
      setMessageTone('success')
      setMessage('تم حفظ الملاحظة.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleComplete() {
    try {
      await api.completeOrder(id, { admin_confirmation: true })
      reload()
      setMessageTone('success')
      setMessage('تم إكمال الطلب.')
      setConfirmOpen(false)
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleReject() {
    try {
      await api.rejectOrder(id, { reason: 'لم يتم استيفاء المتطلبات.' })
      reload()
      setMessageTone('success')
      setMessage('تم رفض الطلب.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  return (
    <div className="space-y-6">
      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">رقم الطلب</p>
            <h2 className="text-2xl font-extrabold text-ink">{order.order_number}</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-slate-500">العميل</p>
            <p className="mt-2 font-bold">{order.customer?.full_name}</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-slate-500">الخدمة</p>
            <p className="mt-2 font-bold">{order.service?.name_ar}</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-slate-500">المدينة</p>
            <p className="mt-2 font-bold">{order.city}</p>
          </div>
          <div className="rounded-2xl bg-brand-50 p-4">
            <p className="text-xs text-slate-500">المزوّد</p>
            <p className="mt-2 font-bold">{order.assigned_provider?.full_name || 'غير معين'}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold text-ink">الوثائق</h3>
            <div className="mt-5">
              <DocumentList documents={order.documents || []} />
            </div>
          </div>
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold text-ink">الخط الزمني</h3>
            <div className="mt-5">
              <OrderTimeline items={order.status_logs || []} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold text-ink">لوحة الإجراءات</h3>
            <form className="mt-5 space-y-4" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <select className="field" {...statusForm.register('status')}>
                {availableStatusTransitions.length ? null : <option value="">لا توجد حالة انتقال متاحة حالياً</option>}
                {availableStatusTransitions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {getStatusLabel(statusValue)}
                  </option>
                ))}
              </select>
              <textarea className="field min-h-24" placeholder="ملاحظة على التحديث" {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!availableStatusTransitions.length} type="submit">
                تحديث الحالة
              </button>
            </form>

            {allowedActions.can_assign_provider ? (
              <form className="mt-6 space-y-4" onSubmit={assignForm.handleSubmit(handleAssign)}>
                {providersError ? <p className="text-sm text-danger">{getDisplayError(providersError)}</p> : null}
                <select className="field" {...assignForm.register('provider_id')}>
                  <option value="">اختر مزوّد الخدمة</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.full_name}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary w-full">تعيين مزوّد</button>
              </form>
            ) : null}

            {noteVisibilityOptions.length ? (
              <form className="mt-6 space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea className="field min-h-24" placeholder="أضف ملاحظة داخلية أو مرئية للعميل" {...noteForm.register('note')} />
                <select className="field" {...noteForm.register('visibility')}>
                  {noteVisibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary w-full">حفظ الملاحظة</button>
              </form>
            ) : null}

            {allowedActions.can_complete || allowedActions.can_reject ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {allowedActions.can_complete ? (
                  <button className="btn-primary" onClick={() => setConfirmOpen(true)} type="button">
                    إكمال الطلب
                  </button>
                ) : null}
                {allowedActions.can_reject ? (
                  <button className="btn-secondary" onClick={handleReject} type="button">
                    رفض الطلب
                  </button>
                ) : null}
              </div>
            ) : null}

            {message ? <p className={`mt-4 text-sm ${messageTone === 'danger' ? 'text-danger' : 'text-success'}`}>{message}</p> : null}
          </div>
        </div>
      </section>

      <ConfirmModal
        open={confirmOpen}
        title="تأكيد إكمال الطلب"
        description="سيتم تحويل الحالة إلى مكتمل وإشعار العميل."
        onConfirm={handleComplete}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}

export default AdminOrderDetailsPage
