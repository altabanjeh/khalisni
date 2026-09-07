import { FileText, MessageSquare, ShieldCheck, UserRoundPlus } from 'lucide-react'
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
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import { formatDate, getStatusLabel } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'

function Panel({ icon: Icon, title, description, children, tone }) {
  return (
    <section className={`rounded-[var(--radius-xl)] border bg-card p-5 shadow-soft sm:p-6 ${tone === 'danger' ? 'border-red-200' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        {Icon ? <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span> : null}
        <div>
          <h2 className="text-base font-black text-ink sm:text-lg">{title}</h2>
          {description ? <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function AdminOrderDetailsPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [confirmAssign, setConfirmAssign] = useState(false)
  const [pendingAssign, setPendingAssign] = useState(null)
  const [submitting, setSubmitting] = useState('')

  const { data: order, loading, error, reload } = useAsyncData(() => api.getAdminOrder(id), [id], null)
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const statusForm = useForm()
  const noteForm = useForm({ defaultValues: { visibility: 'INTERNAL' } })
  const assignForm = useForm()

  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{getDisplayError(error)}</div>
  if (loading || !order) return <LoadingSpinner />

  const notSet = isArabic ? 'غير محددة' : 'Not set'
  const allowedActions = getOrderAllowedActions(order)
  const transitions = allowedActions.available_status_transitions || []
  const noteVisibilityOptions = [
    ...(allowedActions.can_add_internal_note ? [{ value: 'INTERNAL', label: isArabic ? 'داخلية' : 'Internal' }] : []),
    ...(allowedActions.can_add_customer_note ? [{ value: 'CUSTOMER', label: isArabic ? 'مرئية للعميل' : 'Visible to customer' }] : []),
  ]

  async function run(key, fn, successMessage) {
    setSubmitting(key)
    try {
      await fn()
      reload()
      toast(successMessage, 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    } finally {
      setSubmitting('')
    }
  }

  async function handleStatus(values) {
    await run('status', () => api.changeOrderStatus(id, values), isArabic ? 'تم تحديث حالة الطلب.' : 'Request status updated.')
    statusForm.reset()
  }
  async function handleAssignSubmit(values) { setPendingAssign(values); setConfirmAssign(true) }
  async function handleAssignConfirm() {
    setConfirmAssign(false)
    await run('assign', () => api.assignOrder(id, pendingAssign), isArabic ? 'تم تعيين مزوّد الخدمة.' : 'Provider assigned.')
    assignForm.reset()
  }
  async function handleNote(values) {
    const visibility = noteVisibilityOptions.find((o) => o.value === values.visibility)?.value || 'INTERNAL'
    await run('note', () => api.addAdminNote(id, { ...values, visibility }), isArabic ? 'تم حفظ الملاحظة.' : 'Note saved.')
    noteForm.reset({ visibility })
  }
  async function handleComplete() {
    setConfirmComplete(false)
    await run('complete', () => api.completeOrder(id, { admin_confirmation: true }), isArabic ? 'تم إكمال الطلب.' : 'Request completed.')
  }
  async function handleReject() {
    setConfirmReject(false)
    await run('reject', () => api.rejectOrder(id, { reason: isArabic ? 'لم يتم استيفاء متطلبات المراجعة.' : 'Review requirements were not met.' }), isArabic ? 'تم رفض الطلب.' : 'Request rejected.')
  }

  const meta = [
    { label: isArabic ? 'العميل' : 'Customer', value: order.customer?.full_name || (isArabic ? 'غير متاح' : 'Unavailable'), hint: order.customer?.phone },
    { label: isArabic ? 'الخدمة' : 'Service', value: order.service ? getServiceName(order.service, language) : notSet },
    { label: isArabic ? 'المدينة' : 'City', value: order.city || notSet },
    { label: isArabic ? 'المزوّد الحالي' : 'Current provider', value: order.assigned_provider?.full_name || (isArabic ? 'غير معيّن' : 'Unassigned') },
    { label: isArabic ? 'التسليم المتوقع' : 'Expected delivery', value: formatDate(order.expected_delivery_date, language) },
  ]

  const primaryHint = allowedActions.can_complete
    ? (isArabic ? 'جاهز للإكمال — راجع الوثائق ثم أكمل.' : 'Ready to complete — review documents then complete.')
    : allowedActions.can_assign_provider
      ? (isArabic ? 'بحاجة إلى تعيين مزوّد.' : 'Needs a provider assigned.')
      : transitions.length
        ? (isArabic ? 'تحديث الحالة متاح لهذه المرحلة.' : 'A status update is available for this stage.')
        : (isArabic ? 'لا يوجد إجراء مطلوب الآن.' : 'No action required right now.')

  return (
    <div className="space-y-6">
      {/* identity band */}
      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{isArabic ? 'إدارة الطلب' : 'Request management'}</p>
            <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
              <ShieldCheck className="me-2 inline h-6 w-6 text-brand-600" />#{order.order_number}
            </h1>
            <p className="mt-1.5 text-sm font-semibold text-slate-600">{primaryHint}</p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">{isArabic ? 'الحالة الحالية' : 'Current status'}</p>
            <div className="mt-1.5"><StatusBadge status={order.status} /></div>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {meta.map((row) => (
            <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-3" key={row.label}>
              <dt className="text-xs font-bold text-slate-500">{row.label}</dt>
              <dd className="mt-1 truncate text-sm font-black text-ink">{row.value}</dd>
              {row.hint ? <dd className="truncate text-xs font-semibold text-slate-500">{row.hint}</dd> : null}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel icon={FileText} title={isArabic ? 'الوثائق المرفوعة' : 'Uploaded documents'} description={isArabic ? 'راجع كل الوثائق قبل تحديث الحالة أو اتخاذ قرار نهائي.' : 'Review every document before changing status or making a final decision.'}>
            <DocumentList documents={order.documents || []} />
          </Panel>
          <Panel icon={MessageSquare} title={isArabic ? 'الخط الزمني' : 'Timeline'} description={isArabic ? 'تسلسل كامل لكل التحديثات والحركات على الطلب.' : 'A complete sequence of every update and action on the request.'}>
            <OrderTimeline items={order.status_logs || []} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel icon={ShieldCheck} title={isArabic ? 'تحديث حالة الطلب' : 'Update request status'} description={isArabic ? 'تظهر فقط التحوّلات المسموح بها لهذه المرحلة.' : 'Only transitions allowed for this stage are shown.'}>
            <form className="space-y-3" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <label className="block text-sm font-bold text-ink" htmlFor="admin-status">{isArabic ? 'الحالة الجديدة' : 'New status'}</label>
              <select className="field" id="admin-status" {...statusForm.register('status')}>
                {!transitions.length ? <option value="">{isArabic ? 'لا توجد تحوّلات متاحة' : 'No transitions available'}</option> : null}
                {transitions.map((status) => <option key={status} value={status}>{getStatusLabel(status, language)}</option>)}
              </select>
              <textarea aria-label={isArabic ? 'ملاحظة التحديث' : 'Update note'} className="field min-h-20" placeholder={isArabic ? 'ملاحظة على التحديث إن لزم' : 'An update note if needed'} {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!transitions.length || submitting === 'status'} type="submit">
                {submitting === 'status' ? (isArabic ? 'جارٍ التحديث...' : 'Updating...') : isArabic ? 'تحديث الحالة' : 'Update status'}
              </button>
            </form>
          </Panel>

          {allowedActions.can_assign_provider ? (
            <Panel icon={UserRoundPlus} title={isArabic ? 'تعيين مزوّد خدمة' : 'Assign a provider'} description={isArabic ? 'اختر مزوّداً مناسباً ثم أكّد.' : 'Choose a suitable provider, then confirm.'}>
              <form className="space-y-3" onSubmit={assignForm.handleSubmit(handleAssignSubmit)}>
                {providersError ? <p className="text-sm font-bold text-danger">{getDisplayError(providersError)}</p> : null}
                <label className="block text-sm font-bold text-ink" htmlFor="admin-assign">{isArabic ? 'المزوّد' : 'Provider'}</label>
                <select className="field" id="admin-assign" {...assignForm.register('provider_id', { required: true })}>
                  <option value="">{isArabic ? 'اختر مزوّد الخدمة' : 'Select a provider'}</option>
                  {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.full_name}</option>)}
                </select>
                <button className="btn-secondary w-full" disabled={submitting === 'assign'} type="submit">
                  {submitting === 'assign' ? (isArabic ? 'جارٍ التعيين...' : 'Assigning...') : isArabic ? 'تعيين المزوّد' : 'Assign provider'}
                </button>
              </form>
            </Panel>
          ) : null}

          {noteVisibilityOptions.length ? (
            <Panel icon={MessageSquare} title={isArabic ? 'إضافة ملاحظة' : 'Add a note'} description={isArabic ? 'ملاحظة داخلية للتنسيق، أو ملاحظة مرئية لإيضاح ما يحتاجه العميل.' : 'An internal note for coordination, or a visible note to tell the customer what is needed.'}>
              <form className="space-y-3" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea className="field min-h-20" aria-label={isArabic ? 'نص الملاحظة' : 'Note text'} placeholder={isArabic ? 'اكتب الملاحظة هنا' : 'Write the note here'} {...noteForm.register('note', { required: true })} />
                <label className="block text-sm font-bold text-ink" htmlFor="admin-note-visibility">{isArabic ? 'مستوى الظهور' : 'Visibility'}</label>
                <select className="field" id="admin-note-visibility" {...noteForm.register('visibility')}>
                  {noteVisibilityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <button className="btn-secondary w-full" disabled={submitting === 'note'} type="submit">
                  {submitting === 'note' ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : isArabic ? 'حفظ الملاحظة' : 'Save note'}
                </button>
              </form>
            </Panel>
          ) : null}

          {allowedActions.can_complete || allowedActions.can_reject ? (
            <Panel tone="danger" title={isArabic ? 'القرار النهائي' : 'Final decision'} description={isArabic ? 'أكمل الطلب بعد اكتمال التنفيذ، أو ارفضه إذا تعذر استيفاء المتطلبات.' : 'Complete once processing is done, or reject if the requirements cannot be met.'}>
              <div className="grid gap-3 sm:grid-cols-2">
                {allowedActions.can_complete ? <button className="btn-primary" onClick={() => setConfirmComplete(true)} type="button">{isArabic ? 'إكمال الطلب' : 'Complete request'}</button> : null}
                {allowedActions.can_reject ? <button className="btn-danger" onClick={() => setConfirmReject(true)} type="button">{isArabic ? 'رفض الطلب' : 'Reject request'}</button> : null}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel={isArabic ? 'نعم، أكمل الطلب' : 'Yes, complete it'}
        description={isArabic ? 'ستتحول حالة الطلب إلى مكتمل وسيُشعر العميل. لا يمكن التراجع.' : 'The request will be marked completed and the customer notified. This cannot be undone.'}
        loading={submitting === 'complete'}
        onClose={() => setConfirmComplete(false)}
        onConfirm={handleComplete}
        open={confirmComplete}
        title={isArabic ? 'تأكيد إكمال الطلب' : 'Confirm completion'}
      />
      <ConfirmModal
        confirmLabel={isArabic ? 'نعم، ارفض الطلب' : 'Yes, reject it'}
        description={isArabic ? 'سيُرفض الطلب ويُشعر العميل بالسبب. هذا الإجراء نهائي.' : 'The request will be rejected and the customer notified of the reason. This is final.'}
        loading={submitting === 'reject'}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        open={confirmReject}
        title={isArabic ? 'تأكيد رفض الطلب' : 'Confirm rejection'}
        variant="danger"
      />
      <ConfirmModal
        confirmLabel={isArabic ? 'نعم، عيّن المزوّد' : 'Yes, assign'}
        description={isArabic ? 'هل تريد تعيين هذا المزوّد على الطلب الحالي؟' : 'Assign this provider to the current request?'}
        loading={submitting === 'assign'}
        onClose={() => setConfirmAssign(false)}
        onConfirm={handleAssignConfirm}
        open={confirmAssign}
        title={isArabic ? 'تأكيد تعيين المزوّد' : 'Confirm assignment'}
      />
    </div>
  )
}

export default AdminOrderDetailsPage
