import { FileText, MessageSquare, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useRegisterPageHelp } from '../../context/HelpGuideContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import { formatDate, getStatusLabel } from '../../utils/format'

function MetricCard({ label, value, hint }) {
  return (
    <div className="panel-muted p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="glass-panel p-6">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="icon-chip">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function AdminOrderDetailsPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmReject, setConfirmReject] = useState(false)
  const [confirmAssign, setConfirmAssign] = useState(false)
  const [pendingAssign, setPendingAssign] = useState(null)
  const [submitting, setSubmitting] = useState('')

  const { data: order, loading, error, reload } = useAsyncData(() => api.getAdminOrder(id), [id], null)
  useRegisterPageHelp({ workflowStatus: order?.status || '' })
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const statusForm = useForm()
  const noteForm = useForm({ defaultValues: { visibility: 'INTERNAL' } })
  const assignForm = useForm()

  if (error) return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  if (loading || !order) return <LoadingSpinner />

  const allowedActions = getOrderAllowedActions(order)
  const availableStatusTransitions = allowedActions.available_status_transitions || []
  const noteVisibilityOptions = [
    ...(allowedActions.can_add_internal_note ? [{ value: 'INTERNAL', label: 'داخلية' }] : []),
    ...(allowedActions.can_add_customer_note ? [{ value: 'CUSTOMER', label: 'مرئية للعميل' }] : []),
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
    await run('status', () => api.changeOrderStatus(id, values), 'تم تحديث حالة الطلب.')
    statusForm.reset()
  }

  async function handleAssignSubmit(values) {
    setPendingAssign(values)
    setConfirmAssign(true)
  }

  async function handleAssignConfirm() {
    setConfirmAssign(false)
    await run('assign', () => api.assignOrder(id, pendingAssign), 'تم تعيين مزوّد الخدمة.')
    assignForm.reset()
  }

  async function handleNote(values) {
    const visibility = noteVisibilityOptions.find((option) => option.value === values.visibility)?.value || 'INTERNAL'
    await run('note', () => api.addAdminNote(id, { ...values, visibility }), 'تم حفظ الملاحظة.')
    noteForm.reset({ visibility })
  }

  async function handleComplete() {
    setConfirmComplete(false)
    await run('complete', () => api.completeOrder(id, { admin_confirmation: true }), 'تم إكمال الطلب بنجاح.')
  }

  async function handleReject() {
    setConfirmReject(false)
    await run('reject', () => api.rejectOrder(id, { reason: 'لم يتم استيفاء متطلبات المراجعة.' }), 'تم رفض الطلب.')
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="عرض إداري موحد لتتبع الطلب، مراجعة الوثائق والخط الزمني، ثم تنفيذ الإجراء المناسب بحسب المرحلة الحالية."
        eyebrow="إدارة الطلبات"
        icon={ShieldCheck}
        title={order.order_number}
      />

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="العميل" value={order.customer?.full_name || 'غير متاح'} hint={order.customer?.phone || 'لا يوجد هاتف'} />
          <MetricCard label="الخدمة" value={order.service?.name_ar || 'غير محددة'} />
          <MetricCard label="المدينة" value={order.city || 'غير محددة'} />
          <MetricCard label="المزوّد الحالي" value={order.assigned_provider?.full_name || 'غير معين'} />
          <MetricCard label="التسليم المتوقع" value={formatDate(order.expected_delivery_date)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard
            icon={FileText}
            title="الوثائق المرفوعة"
            description="راجع جميع الوثائق المرتبطة بالطلب قبل تحديث الحالة أو اتخاذ قرار نهائي."
          >
            <DocumentList documents={order.documents || []} />
          </SectionCard>

          <SectionCard
            icon={MessageSquare}
            title="الخط الزمني"
            description="تسلسل كامل لجميع التحديثات والحركات المسجلة على الطلب."
          >
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={ShieldCheck}
            title="تحديث حالة الطلب"
            description="لا تظهر هنا إلا التحولات المسموح بها لهذه المرحلة من دورة الطلب."
          >
            <form className="space-y-4" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <select className="field" {...statusForm.register('status')}>
                {!availableStatusTransitions.length ? <option value="">لا توجد تحولات حالة متاحة</option> : null}
                {availableStatusTransitions.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
              <textarea className="field min-h-24" placeholder="ملاحظة على التحديث إن لزم" {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!availableStatusTransitions.length || submitting === 'status'} type="submit">
                {submitting === 'status' ? 'جارٍ التحديث...' : 'تحديث الحالة'}
              </button>
            </form>
          </SectionCard>

          {allowedActions.can_assign_provider ? (
            <SectionCard
              icon={UserRoundPlus}
              title="تعيين مزوّد خدمة"
              description="اختر مزوّداً مناسباً للطلب الحالي ثم أكد الإرسال."
            >
              <form className="space-y-4" onSubmit={assignForm.handleSubmit(handleAssignSubmit)}>
                {providersError ? <p className="text-sm text-danger">{getDisplayError(providersError)}</p> : null}
                <select className="field" {...assignForm.register('provider_id', { required: true })}>
                  <option value="">اختر مزوّد الخدمة</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.full_name}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary w-full" disabled={submitting === 'assign'} type="submit">
                  {submitting === 'assign' ? 'جارٍ التعيين...' : 'تعيين المزوّد'}
                </button>
              </form>
            </SectionCard>
          ) : null}

          {noteVisibilityOptions.length ? (
            <SectionCard
              icon={MessageSquare}
              title="إضافة ملاحظة"
              description="استخدم الملاحظات الداخلية للتنسيق التشغيلي، أو الملاحظات المرئية لإيضاح ما يحتاجه العميل."
            >
              <form className="space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea
                  className="field min-h-24"
                  placeholder="اكتب الملاحظة هنا"
                  {...noteForm.register('note', { required: true })}
                />
                <select className="field" {...noteForm.register('visibility')}>
                  {noteVisibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className="btn-secondary w-full" disabled={submitting === 'note'} type="submit">
                  {submitting === 'note' ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
                </button>
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_complete || allowedActions.can_reject ? (
            <section className="glass-panel p-6">
              <h2 className="text-xl font-bold text-ink">القرار النهائي</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">أكمل الطلب فقط بعد اكتمال التنفيذ، أو ارفضه إذا تعذر استيفاء المتطلبات التشغيلية.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {allowedActions.can_complete ? (
                  <button className="btn-primary" onClick={() => setConfirmComplete(true)} type="button">
                    إكمال الطلب
                  </button>
                ) : null}
                {allowedActions.can_reject ? (
                  <button className="btn-danger" onClick={() => setConfirmReject(true)} type="button">
                    رفض الطلب
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel="نعم، أكمل الطلب"
        description="سيتم تحويل حالة الطلب إلى مكتمل وإشعار العميل بذلك. لا يمكن التراجع عن هذا الإجراء."
        loading={submitting === 'complete'}
        onClose={() => setConfirmComplete(false)}
        onConfirm={handleComplete}
        open={confirmComplete}
        title="تأكيد إكمال الطلب"
      />
      <ConfirmModal
        confirmLabel="نعم، ارفض الطلب"
        description="سيتم رفض الطلب وإشعار العميل بسبب الرفض. هذا الإجراء نهائي."
        loading={submitting === 'reject'}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        open={confirmReject}
        title="تأكيد رفض الطلب"
        variant="danger"
      />
      <ConfirmModal
        confirmLabel="نعم، عيّن المزوّد"
        description="هل تريد تعيين هذا المزوّد على الطلب الحالي؟"
        loading={submitting === 'assign'}
        onClose={() => setConfirmAssign(false)}
        onConfirm={handleAssignConfirm}
        open={confirmAssign}
        title="تأكيد تعيين المزوّد"
      />
    </div>
  )
}

export default AdminOrderDetailsPage
