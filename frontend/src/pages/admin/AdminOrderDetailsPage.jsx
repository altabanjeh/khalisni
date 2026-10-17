import { Ban, FilePlus2, FileText, MessageSquare, ShieldCheck, UserRoundPlus, Workflow } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import LoadingSpinner from '../../components/LoadingSpinner'
import MissingRequestRecovery from '../../components/MissingRequestRecovery'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError, isStaleActionError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import { formatDate, getStatusLabel } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'
import { getRequiredDocumentLabel, getRequiredDocumentType } from '../../utils/serviceForms'
import { describeTransitionBlock } from '../../utils/workflowPresentation'

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

// Allowed actions that intentionally have no button on this screen, with the
// place where they actually happen.
const INDIRECT_ACTION_NOTES = {
  mark_ready_for_delivery: {
    ar: 'تجهيز النتيجة للتسليم: يتم عند رفع مزوّد الخدمة للنتيجة النهائية من بوابته.',
    en: 'Ready for delivery: happens when the provider uploads the final result from the provider portal.',
  },
  resume_review: {
    ar: 'استئناف المراجعة: يتم تلقائياً عند رفع العميل لكل المستندات المطلوبة.',
    en: 'Resume review: happens automatically once the customer uploads every requested document.',
  },
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
  const [rejectReason, setRejectReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const runningRef = useRef('')

  const { data: order, loading, error, reload } = useAsyncData(() => api.getAdminOrder(id), [id], null)
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const statusForm = useForm()
  const noteForm = useForm({ defaultValues: { visibility: 'INTERNAL' } })
  const assignForm = useForm()
  const docsForm = useForm({ defaultValues: { note: '', document_types: [] } })

  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{getDisplayError(error)}</div>
  if (loading || !order) return <LoadingSpinner />

  const notSet = isArabic ? 'غير محددة' : 'Not set'
  const allowedActions = getOrderAllowedActions(order)
  const transitions = allowedActions.available_status_transitions || []
  // Every workflow option comes from the server: generic status moves go to the
  // status form, dedicated commands get their own controls, and unavailable
  // options are explained in the screen language.
  const workflow = allowedActions.workflow_transitions || []
  const cancelOption = workflow.find((option) => option.action === 'cancel_order')
  const canCancel = cancelOption?.available === true
  const cancelReasonRequired = cancelOption?.reason_required !== false
  const requirementDocuments = allowedActions.readiness?.documents?.length ? allowedActions.readiness.documents : (order.required_documents || [])
  const isOtherRoleBlock = (option) => (option.blocked || []).some((item) => item.code === 'role_not_allowed')
  const blockedOptions = workflow.filter((option) => !option.available)
  const blockedWorkflow = blockedOptions.find((option) => !isOtherRoleBlock(option)) || blockedOptions[0]
  const describeBlock = (option) => describeTransitionBlock(option, { language, documents: requirementDocuments })
  const indirectOptions = workflow.filter((option) => option.available && INDIRECT_ACTION_NOTES[option.action])
  const noteVisibilityOptions = [
    ...(allowedActions.can_add_internal_note ? [{ value: 'INTERNAL', label: isArabic ? 'داخلية' : 'Internal' }] : []),
    ...(allowedActions.can_add_customer_note ? [{ value: 'CUSTOMER', label: isArabic ? 'مرئية للعميل' : 'Visible to customer' }] : []),
  ]

  // Returns true on success. One action at a time: the ref closes the gap
  // before React re-renders, so a rapid double click cannot submit twice.
  async function run(key, fn, successMessage) {
    if (runningRef.current) return false
    runningRef.current = key
    setSubmitting(key)
    try {
      await fn()
      reload()
      toast(successMessage, 'success')
      return true
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
      if (isStaleActionError(submitError)) reload()
      return false
    } finally {
      runningRef.current = ''
      setSubmitting('')
    }
  }

  // Forms are cleared only after success, so a refused action keeps what was typed.
  async function handleStatus(values) {
    if (await run('status', () => api.changeOrderStatus(id, values), isArabic ? 'تم تحديث حالة الطلب.' : 'Request status updated.')) statusForm.reset()
  }
  async function handleAssignSubmit(values) { setPendingAssign(values); setConfirmAssign(true) }
  async function handleAssignConfirm() {
    setConfirmAssign(false)
    if (await run('assign', () => api.assignOrder(id, pendingAssign), isArabic ? 'تم تعيين مزوّد الخدمة.' : 'Provider assigned.')) assignForm.reset()
  }
  async function handleNote(values) {
    const visibility = noteVisibilityOptions.find((o) => o.value === values.visibility)?.value || 'INTERNAL'
    if (await run('note', () => api.addAdminNote(id, { ...values, visibility }), isArabic ? 'تم حفظ الملاحظة.' : 'Note saved.')) noteForm.reset({ visibility })
  }
  async function handleComplete() {
    setConfirmComplete(false)
    await run('complete', () => api.completeOrder(id, { admin_confirmation: true }), isArabic ? 'تم إكمال الطلب.' : 'Request completed.')
  }
  async function handleCancel() {
    const reason = cancelReason.trim()
    if (cancelReasonRequired && !reason) return
    const ok = await run('cancel', () => api.cancelAdminOrder(id, { reason: reason || (isArabic ? 'ألغاه المدير' : 'Cancelled by admin') }), isArabic ? 'تم إلغاء الطلب.' : 'Request cancelled.')
    if (ok) setCancelReason('')
    setConfirmCancel(false)
  }
  async function handleRequestDocuments(values) {
    const documentTypes = [].concat(values.document_types || []).filter(Boolean)
    if (!documentTypes.length) {
      docsForm.setError('document_types', { message: isArabic ? 'اختر مستنداً واحداً على الأقل.' : 'Select at least one document.' })
      return
    }
    const ok = await run('docs', () => api.requestDocuments(id, { note: values.note, document_types: documentTypes }), isArabic ? 'تم إرسال طلب المستندات إلى العميل.' : 'Document request sent to the customer.')
    if (ok) docsForm.reset({ note: '', document_types: [] })
  }
  async function handleReject() {
    // The customer receives this text, so it is written by the administrator.
    const reason = rejectReason.trim()
    if (!reason) return
    const ok = await run('reject', () => api.rejectOrder(id, { reason }), isArabic ? 'تم رفض الطلب.' : 'Request rejected.')
    if (ok) setRejectReason('')
    setConfirmReject(false)
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
        : blockedWorkflow
          ? `${isArabic ? 'الإجراء التالي غير متاح بعد' : 'Next workflow action is blocked'} — ${describeBlock(blockedWorkflow)}`
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
            <DocumentList documents={order.documents || []} requiredDocuments={order.required_documents || []} />
          </Panel>
          <Panel icon={MessageSquare} title={isArabic ? 'الخط الزمني' : 'Timeline'} description={isArabic ? 'تسلسل كامل لكل التحديثات والحركات على الطلب.' : 'A complete sequence of every update and action on the request.'}>
            <OrderTimeline items={order.status_logs || []} />
          </Panel>
        </div>

        <div className="space-y-6">
          <MissingRequestRecovery allowedActions={allowedActions} onRecovered={reload} orderId={id} />

          <Panel icon={Workflow} title={isArabic ? 'إجراءات سير العمل' : 'Workflow actions'} description={isArabic ? 'الإجراءات المتاحة لك في هذه المرحلة، وسبب عدم توفر غيرها.' : 'The actions available to you at this stage, and why others are not.'}>
            {canCancel ? (
              <button className="btn-danger w-full" data-testid="admin-cancel-order" disabled={Boolean(submitting)} onClick={() => setConfirmCancel(true)} type="button">
                <Ban className="me-2 inline h-4 w-4" />{isArabic ? 'إلغاء الطلب' : 'Cancel request'}
              </button>
            ) : null}
            {blockedOptions.length ? (
              <ul className={`space-y-2 text-sm font-semibold text-slate-600 ${canCancel ? 'mt-4' : ''}`} data-testid="admin-blocked-actions">
                {blockedOptions.map((option) => <li className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-3 py-2" key={option.action}>{describeBlock(option)}</li>)}
              </ul>
            ) : null}
            {indirectOptions.length ? (
              <ul className="mt-4 space-y-2 text-sm font-semibold text-slate-600" data-testid="admin-indirect-actions">
                {indirectOptions.map((option) => <li className="rounded-[var(--radius-md)] border border-border bg-card px-3 py-2" key={option.action}>{INDIRECT_ACTION_NOTES[option.action][isArabic ? 'ar' : 'en']}</li>)}
              </ul>
            ) : null}
            {!canCancel && !blockedOptions.length && !indirectOptions.length ? <p className="text-sm font-semibold text-slate-500">{isArabic ? 'لا توجد إجراءات إضافية في هذه المرحلة.' : 'No further actions at this stage.'}</p> : null}
          </Panel>

          {allowedActions.can_request_documents ? (
            <Panel icon={FilePlus2} title={isArabic ? 'طلب مستندات ناقصة' : 'Request missing documents'} description={isArabic ? 'اختر من مستندات الخدمة المعرّفة واكتب ملاحظة واضحة للعميل.' : 'Choose from the configured service documents and write a clear note to the customer.'}>
              <form className="space-y-3" data-testid="admin-request-documents" onSubmit={docsForm.handleSubmit(handleRequestDocuments)}>
                <textarea aria-label={isArabic ? 'ملاحظة للعميل' : 'Note to the customer'} className="field min-h-20" placeholder={isArabic ? 'اشرح المطلوب بوضوح.' : 'Explain clearly what is needed.'} {...docsForm.register('note', { required: isArabic ? 'ملاحظة الطلب مطلوبة' : 'A request note is required' })} />
                {docsForm.formState.errors.note ? <p className="text-sm font-bold text-danger">{docsForm.formState.errors.note.message}</p> : null}
                <div className="space-y-2 rounded-[var(--radius-md)] border border-border bg-card p-3">
                  {(order.required_documents || []).map((document, index) => (
                    <label className="flex items-center gap-3 text-sm text-ink" key={getRequiredDocumentType(document, index)}>
                      <input type="checkbox" value={getRequiredDocumentType(document, index)} {...docsForm.register('document_types')} />
                      <span>{getRequiredDocumentLabel(document, language)}</span>
                    </label>
                  ))}
                </div>
                {docsForm.formState.errors.document_types ? <p className="text-sm font-bold text-danger">{docsForm.formState.errors.document_types.message}</p> : null}
                <button className="btn-secondary w-full" disabled={submitting === 'docs'} type="submit">{submitting === 'docs' ? (isArabic ? 'جارٍ الإرسال...' : 'Sending...') : (isArabic ? 'إرسال الطلب للعميل' : 'Send to the customer')}</button>
              </form>
            </Panel>
          ) : null}

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
                {allowedActions.can_complete ? <button className="btn-primary" disabled={Boolean(submitting)} onClick={() => setConfirmComplete(true)} type="button">{isArabic ? 'إكمال الطلب' : 'Complete request'}</button> : null}
                {allowedActions.can_reject ? <button className="btn-danger" disabled={Boolean(submitting)} onClick={() => setConfirmReject(true)} type="button">{isArabic ? 'رفض الطلب' : 'Reject request'}</button> : null}
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
        confirmDisabled={!rejectReason.trim()}
        loading={submitting === 'reject'}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        open={confirmReject}
        title={isArabic ? 'تأكيد رفض الطلب' : 'Confirm rejection'}
        variant="danger"
      >
        <label className="block text-sm font-bold text-ink" htmlFor="admin-reject-reason">{isArabic ? 'سبب الرفض (يظهر للعميل)' : 'Rejection reason (shown to the customer)'}</label>
        <textarea
          className="field mt-2 min-h-24"
          id="admin-reject-reason"
          maxLength={1000}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder={isArabic ? 'اشرح للعميل سبب رفض الطلب.' : 'Explain to the customer why the request is rejected.'}
          value={rejectReason}
        />
      </ConfirmModal>
      <ConfirmModal
        confirmDisabled={cancelReasonRequired && !cancelReason.trim()}
        confirmLabel={isArabic ? 'نعم، ألغِ الطلب' : 'Yes, cancel it'}
        description={isArabic ? 'سيُلغى الطلب ويُشعر العميل. هذا الإجراء نهائي.' : 'The request will be cancelled and the customer notified. This is final.'}
        loading={submitting === 'cancel'}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        open={confirmCancel}
        title={isArabic ? 'تأكيد إلغاء الطلب' : 'Confirm cancellation'}
        variant="danger"
      >
        <label className="block text-sm font-bold text-ink" htmlFor="admin-cancel-reason">{cancelReasonRequired ? (isArabic ? 'سبب الإلغاء (مطلوب)' : 'Cancellation reason (required)') : (isArabic ? 'سبب الإلغاء (اختياري)' : 'Cancellation reason (optional)')}</label>
        <textarea
          className="field mt-2 min-h-24"
          id="admin-cancel-reason"
          maxLength={1000}
          onChange={(event) => setCancelReason(event.target.value)}
          value={cancelReason}
        />
      </ConfirmModal>
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
