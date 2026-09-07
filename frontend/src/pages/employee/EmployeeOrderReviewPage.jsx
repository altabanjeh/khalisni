import { Bell, CircleAlert, FileSearch, FileText, ShieldCheck, UserRoundCheck, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions, hasPermission } from '../../utils/authz'
import { formatDate, formatDateTime } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'
import { getRequiredDocumentLabel, getRequiredDocumentType } from '../../utils/serviceForms'

const REVIEW_STARTED_NOTE_AR = 'بدأ الموظف مراجعة الطلب.'

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-ink">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{hint}</p> : null}
    </div>
  )
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
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

function NotesColumn({ title, notes, emptyLabel }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
      <p className="text-sm font-black text-ink">{title}</p>
      <div className="mt-3 space-y-3">
        {notes.length ? notes.map((note) => (
          <div key={note.id} className="rounded-[var(--radius-md)] bg-brand-50/50 p-3 text-sm text-slate-700">
            <p className="font-bold text-ink">{note.user_name}</p>
            <p className="mt-1">{note.note}</p>
          </div>
        )) : <p className="text-sm font-semibold text-slate-500">{emptyLabel}</p>}
      </div>
    </div>
  )
}

function EmployeeOrderReviewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const [confirmReject, setConfirmReject] = useState(false)
  const { data: order, loading, error, reload } = useAsyncData(() => api.getEmployeeOrder(id), [id], null)
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const { data: templates = [] } = useAsyncData(() => api.getEmployeeNotificationTemplates(), [], [])
  const { data: serviceDetails } = useAsyncData(
    () => (order?.service?.slug ? api.getService(order.service.slug) : Promise.resolve(null)),
    [order?.service?.slug],
    null,
  )
  const assignForm = useForm()
  const docsRequestForm = useForm()
  const noteForm = useForm()
  const returnProviderForm = useForm()
  const returnInternalForm = useForm()
  const manualNotificationForm = useForm()

  const T = useMemo(() => (isArabic ? {
    verifyFirst: 'التحقق من المستندات أولاً',
    startReview: 'بدء المراجعة',
    workflowSteps: 'خطوات العمل على الطلب',
    notSet: 'غير محددة', unavailable: 'غير متاح', none: 'لا يوجد',
  } : {
    verifyFirst: 'Verify documents first',
    startReview: 'Start review',
    workflowSteps: 'Request workflow steps',
    notSet: 'Not set', unavailable: 'Unavailable', none: 'None',
  }), [isArabic])
  const tr = (ar, en) => (isArabic ? ar : en)

  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{getDisplayError(error)}</div>
  if (loading || !order) return <LoadingSpinner />

  const requiredDocuments = serviceDetails?.required_documents || []
  const allowedActions = getOrderAllowedActions(order)
  const transitions = allowedActions.available_status_transitions || []
  const canStartReview = transitions.includes('UNDER_REVIEW') && order.status === 'NEW'
  const canReturnToProvider = transitions.includes('IN_PROGRESS')
  const canReturnToInternalReview = transitions.includes('UNDER_REVIEW') && order.status === 'READY_FOR_DELIVERY'
  const requiredDocumentRows = requiredDocuments.map((document, index) => {
    const documentType = getRequiredDocumentType(document, index)
    const uploads = (order.documents || []).filter((item) => String(item.document_type || '').toLowerCase() === documentType)
    return { documentType, label: getRequiredDocumentLabel(document), isMissing: (order.missing_document_types || []).includes(documentType), latestUpload: uploads[0] || null }
  })
  const internalNotes = (order.notes || []).filter((n) => n.visibility === 'INTERNAL')
  const customerNotes = (order.notes || []).filter((n) => n.visibility === 'CUSTOMER')
  const providerNotes = (order.notes || []).filter((n) => n.visibility === 'PROVIDER')
  const finalDocuments = (order.documents || []).filter((d) => d.is_final_document)
  const canViewProviderCandidates = hasPermission(user, 'orders.assign_order')
  const shouldShowProviderSection = canViewProviderCandidates || allowedActions.can_assign_provider || providers.length > 0 || Boolean(providersError)
  const documentsPendingValidation = requiredDocumentRows.filter((item) => {
    const s = String(item.latestUpload?.status || '').toLowerCase()
    return !item.latestUpload || s !== 'approved'
  })

  async function ensureReviewStarted() {
    if (!canStartReview) return
    await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: REVIEW_STARTED_NOTE_AR })
  }
  async function handleAssign(values) {
    try {
      await ensureReviewStarted()
      await api.assignEmployeeOrder(id, values)
      assignForm.reset(); reload()
      toast(tr('تم تعيين المزوّد بنجاح.', 'Provider assigned.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleMissingDocs(values) {
    const documentTypes = Array.isArray(values.document_types)
      ? values.document_types.map((i) => String(i).trim()).filter(Boolean)
      : values.document_types ? [String(values.document_types).trim()].filter(Boolean) : []
    try {
      await ensureReviewStarted()
      await api.requestEmployeeDocuments(id, { note: values.note, document_types: documentTypes })
      docsRequestForm.reset(); reload()
      toast(tr('تم إرسال طلب المستندات الناقصة للعميل.', 'Missing-document request sent to the customer.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleNote(values) {
    try {
      await api.addEmployeeNote(id, { note: values.note, visibility: 'INTERNAL' })
      noteForm.reset(); reload()
      toast(tr('تم حفظ الملاحظة الداخلية.', 'Internal note saved.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleReject() {
    setConfirmReject(false)
    try {
      await api.rejectOrder(id, { reason: tr('تعذر استيفاء متطلبات المراجعة الحالية.', 'The current review requirements could not be met.') })
      reload()
      toast(tr('تم رفض الطلب وتوثيق السبب.', 'Request rejected and the reason recorded.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleStartReview() {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: REVIEW_STARTED_NOTE_AR })
      reload()
      toast(tr('تم نقل الطلب إلى قيد المراجعة.', 'Request moved to under review.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleReturnToProvider(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'IN_PROGRESS', note: values.note })
      returnProviderForm.reset(); reload()
      toast(tr('تمت إعادة الطلب إلى المزوّد مع السبب.', 'Request returned to the provider with the reason.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleReturnToInternal(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: values.note })
      returnInternalForm.reset(); reload()
      toast(tr('تمت إعادة الطلب إلى المراجعة الداخلية.', 'Request returned to internal review.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleComplete() {
    try {
      await api.completeEmployeeOrder(id, { admin_confirmation: false })
      reload()
      toast(tr('تم إكمال الطلب عبر المسار الآمن.', 'Request completed via the safe path.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleManualNotification(values) {
    try {
      await api.sendManualOrderNotification(id, { template_id: Number(values.template_id) })
      manualNotificationForm.reset()
      toast(tr('تم إرسال الإشعار اليدوي من القالب المعتمد.', 'Manual notification sent from the approved template.'), 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description={tr('راجع بيانات العميل والخدمة والوثائق، ثم استخدم فقط الإجراءات المسموح بها في هذه المرحلة.', 'Review the customer, service and documents, then use only the actions permitted at this stage.')}
        eyebrow={tr('تفاصيل المراجعة', 'Review detail')}
        icon={FileSearch}
        title={order.order_number}
      />

      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={tr('العميل', 'Customer')} value={order.customer?.full_name || T.unavailable} hint={order.customer?.phone || tr('لا يوجد هاتف', 'No phone')} />
          <MetricCard label={tr('البريد والهوية', 'Email & ID')} value={order.customer?.email || tr('غير متوفر', 'Not available')} hint={order.customer?.national_id || tr('لا يوجد رقم وطني', 'No national ID')} />
          <MetricCard label={tr('الخدمة', 'Service')} value={order.service ? getServiceName(order.service, language) : T.notSet} hint={order.service?.category_name || ''} />
          <MetricCard label={tr('التسليم المتوقع', 'Expected delivery')} value={formatDate(order.expected_delivery_date, language)} hint={order.city || T.notSet} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard icon={ShieldCheck} title={tr('متطلبات الخدمة والوثائق', 'Service & document requirements')} description={tr('تحقق من كل مستند مطلوب واعتمده قبل إسناد الطلب إلى المزوّد.', 'Verify and approve every required document before assigning the request to a provider.')}>
            <div className="grid gap-3">
              {requiredDocumentRows.length ? requiredDocumentRows.map((item) => (
                <div key={item.documentType} className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{item.label || item.documentType}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {item.latestUpload
                          ? tr(`آخر رفع: ${item.latestUpload.original_filename} — ${formatDateTime(item.latestUpload.created_at, language)}`, `Last upload: ${item.latestUpload.original_filename} — ${formatDateTime(item.latestUpload.created_at, language)}`)
                          : tr('لم يتم رفع هذا المستند بعد.', 'This document has not been uploaded yet.')}
                      </p>
                    </div>
                    <StatusBadge status={item.latestUpload?.status || (item.isMissing ? 'REJECTED' : 'pending_review')} />
                  </div>
                </div>
              )) : <p className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-sm font-semibold text-slate-600">{tr('لا توجد متطلبات وثائق معرّفة لهذه الخدمة.', 'No document requirements are defined for this service.')}</p>}
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title={tr('الوثائق المرفوعة', 'Uploaded documents')} description={tr('استعرض كل الملفات الحالية، وافتح شاشة التحقق إذا كانت صلاحيتك تسمح.', 'Review every current file, and open the verification screen if your permissions allow.')}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-500">{tr('جميع مرفقات الطلب في مرحلته الحالية.', 'All request attachments at its current stage.')}</div>
              {allowedActions.can_verify_documents ? (
                <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                  <ShieldCheck className="h-4 w-4" />
                  {tr('فتح شاشة التحقق', 'Open verification')}
                </Link>
              ) : null}
            </div>
            <div className="mt-5"><DocumentList documents={order.documents || []} /></div>
          </SectionCard>

          <SectionCard icon={FileText} title={tr('سجل الملاحظات', 'Notes log')} description={tr('الملاحظات الداخلية ورسائل العميل وملاحظات المزوّد في مكان واحد.', 'Internal notes, customer messages and provider notes in one place.')}>
            <div className="grid gap-4 xl:grid-cols-3">
              <NotesColumn title={tr('ملاحظات داخلية', 'Internal notes')} notes={internalNotes} emptyLabel={tr('لا توجد ملاحظات داخلية.', 'No internal notes.')} />
              <NotesColumn title={tr('رسائل العميل', 'Customer messages')} notes={customerNotes} emptyLabel={tr('لا توجد رسائل عميل مسجّلة.', 'No customer messages recorded.')} />
              <NotesColumn title={tr('ملاحظات المزوّد', 'Provider notes')} notes={providerNotes} emptyLabel={tr('لا توجد ملاحظات مزوّد لهذه المرحلة.', 'No provider notes for this stage.')} />
            </div>
          </SectionCard>

          <SectionCard icon={FileSearch} title={tr('التسلسل الزمني', 'Timeline')} description={tr('المسار الكامل لتحولات الطلب منذ إنشائه.', 'The full sequence of the request’s transitions since it was created.')}>
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          {canStartReview ? (
            <div className="rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{tr('الطلب ما زال بحالة جديد. ابدأ المراجعة الآن أو سيبدأها النظام مع أول إجراء صالح.', 'The request is still new. Start the review now, or the system will start it with the first valid action.')}</span>
                <button className="btn-primary shrink-0" onClick={handleStartReview} type="button">{T.startReview}</button>
              </div>
            </div>
          ) : null}

          <SectionCard icon={CircleAlert} title={tr('المستندات الناقصة الحالية', 'Current missing documents')} description={tr('عرض سريع للنواقص المفتوحة على الطلب.', 'A quick view of the open missing items on the request.')}>
            <div className="space-y-3">
              {(order.missing_document_types || []).length ? order.missing_document_types.map((t) => (
                <div key={t} className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{t}</div>
              )) : <p className="rounded-[var(--radius-md)] border border-border bg-card px-4 py-3 text-sm font-semibold text-slate-600">{tr('لا توجد نواقص معلّقة حالياً.', 'No pending missing items right now.')}</p>}
            </div>
          </SectionCard>

          <SectionCard icon={ShieldCheck} title={T.workflowSteps} description={tr('ملخص سريع لما ينبغي فعله قبل الإسناد أو اعتماد النتيجة النهائية.', 'A quick summary of what to do before assignment or approving the final result.')}>
            <div className="space-y-3">
              <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                <p className="text-xs font-bold text-slate-500">{tr('الخطوة 1', 'Step 1')}</p>
                <p className="mt-1 font-black text-ink">{tr('التحقق من المستندات المطلوبة', 'Verify the required documents')}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{tr('افتح شاشة التحقق ثم راجع واعتمد كل مستند مطلوب قبل الإسناد إلى المزوّد.', 'Open the verification screen and review and approve every required document before assigning to a provider.')}</p>
                {allowedActions.can_verify_documents ? (
                  <Link className="btn-secondary mt-4 px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                    <ShieldCheck className="h-4 w-4" />{T.verifyFirst}
                  </Link>
                ) : null}
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                <p className="text-xs font-bold text-slate-500">{tr('الخطوة 2', 'Step 2')}</p>
                <p className="mt-1 font-black text-ink">{tr('إرسال الطلب إلى المزوّد', 'Send the request to a provider')}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{tr('بعد التحقق، ارجع إلى قسم المزوّدين، اختر المزوّد المناسب ثم أرسل الطلب.', 'After verification, go to the providers section, pick the right provider, then send the request.')}</p>
                {allowedActions.can_assign_provider ? (
                  <p className="mt-3 rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{tr('جاهز الآن: اختر مزوّداً وأرسل الطلب.', 'Ready now: pick a provider and send the request.')}</p>
                ) : (
                  <p className="mt-3 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{tr('لا يمكن الإرسال بعد. أكمل التحقق من المستندات أولاً.', 'Cannot send yet. Complete document verification first.')}</p>
                )}
              </div>
              <div className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                <p className="text-xs font-bold text-slate-500">{tr('الخطوة 3', 'Step 3')}</p>
                <p className="mt-1 font-black text-ink">{tr('مراجعة النتيجة النهائية', 'Review the final result')}</p>
                <p className="mt-2 text-sm font-semibold text-slate-600">{tr('بعد رفع المزوّد للنتيجة، راجعها ثم أكمل الطلب أو أعده للمزوّد أو للمراجعة الداخلية بسبب واضح.', 'Once the provider uploads the result, review it then complete the request, or return it to the provider or internal review with a clear reason.')}</p>
              </div>
            </div>
          </SectionCard>

          {allowedActions.can_request_documents ? (
            <SectionCard icon={CircleAlert} title={tr('طلب مستندات ناقصة', 'Request missing documents')} description={tr('حدّد المستندات المطلوبة وأرسل ملاحظة واضحة للعميل.', 'Select the required documents and send a clear note to the customer.')}>
              <form className="space-y-4" onSubmit={docsRequestForm.handleSubmit(handleMissingDocs)}>
                <textarea aria-label={tr('ملاحظة الطلب', 'Request note')} className="field min-h-24" placeholder={tr('اشرح المطلوب بوضوح.', 'Explain clearly what is needed.')} {...docsRequestForm.register('note', { required: tr('ملاحظة الطلب مطلوبة', 'A request note is required') })} />
                {docsRequestForm.formState.errors.note ? <p className="text-sm font-bold text-danger">{docsRequestForm.formState.errors.note.message}</p> : null}
                {requiredDocuments.length ? (
                  <div className="space-y-3 rounded-[var(--radius-md)] border border-border bg-card p-4">
                    {requiredDocuments.map((document, index) => (
                      <label key={getRequiredDocumentType(document, index)} className="flex items-center gap-3 text-sm text-ink">
                        <input type="checkbox" value={getRequiredDocumentType(document, index)} {...docsRequestForm.register('document_types')} />
                        <span>{getRequiredDocumentLabel(document)}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                <button className="btn-secondary w-full" type="submit">{tr('إرسال الطلب', 'Send request')}</button>
              </form>
            </SectionCard>
          ) : null}

          {shouldShowProviderSection ? (
            <SectionCard icon={UserRoundCheck} title={tr('تعيين مزوّد', 'Assign a provider')} description={tr('راجع قائمة المزوّدين المؤهلين، ثم أرسل الطلب عندما تكتمل شروط الإسناد.', 'Review the eligible providers, then send the request once the assignment conditions are met.')}>
              {providersError ? <p className="text-sm font-bold text-danger">{getDisplayError(providersError)}</p> : null}
              {!allowedActions.can_assign_provider && canViewProviderCandidates ? (
                <p className="text-sm font-semibold text-amber-700">{tr('يمكنك مراجعة المزوّدين الآن، لكن الإسناد لن يتفعّل قبل اعتماد كل المستندات المطلوبة.', 'You can review providers now, but assignment will not enable until every required document is approved.')}</p>
              ) : null}
              {allowedActions.can_assign_provider ? (
                <p className="text-sm font-semibold text-emerald-700">{tr('المتطلبات مكتملة. اختر المزوّد المناسب ثم أرسل الطلب.', 'Requirements complete. Pick the right provider and send the request.')}</p>
              ) : null}

              {!allowedActions.can_assign_provider && canViewProviderCandidates ? (
                <div className="mt-4 rounded-[var(--radius-lg)] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  <p className="font-black">{tr('قبل إرسال الطلب إلى المزوّد', 'Before sending the request to a provider')}</p>
                  <p className="mt-2">{tr('1. افتح شاشة التحقق من المستندات.', '1. Open the document verification screen.')}</p>
                  <p className="mt-1">{tr('2. اعتمد كل المستندات المطلوبة لهذه الخدمة.', '2. Approve every required document for this service.')}</p>
                  <p className="mt-1">{tr('3. ارجع هنا ثم اختر المزوّد وأرسل الطلب.', '3. Come back here, pick the provider and send the request.')}</p>
                  {documentsPendingValidation.length ? (
                    <div className="mt-3">
                      <p className="font-black">{tr('مستندات ما زالت تحتاج تحقق:', 'Documents still needing verification:')}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {documentsPendingValidation.map((item) => (
                          <span key={item.documentType} className="rounded-full border border-amber-300 bg-card px-3 py-1 text-xs">{item.label || item.documentType}</span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {allowedActions.can_verify_documents ? (
                    <Link className="btn-secondary mt-4 px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                      <ShieldCheck className="h-4 w-4" />{T.verifyFirst}
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {providers.length ? providers.map((provider) => (
                  <div key={provider.id} className="rounded-[var(--radius-lg)] border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-ink">{provider.full_name}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{provider.provider_type || tr('مزوّد خدمة', 'Service provider')} {provider.city ? `— ${provider.city}` : ''}</p>
                        <p className="mt-2 text-xs font-semibold text-slate-500">{provider.capability_summary || provider.service_categories?.join(isArabic ? '، ' : ', ') || tr('لا توجد تخصصات مرتبطة', 'No linked specialities')}</p>
                      </div>
                      <div className="text-start text-xs font-semibold text-slate-500">
                        <p>{provider.is_available ? tr('متاح الآن', 'Available now') : tr('غير متاح حالياً', 'Not available')}</p>
                        <p className="mt-1">{provider.approval_status_label || (provider.is_approved ? tr('معتمد', 'Approved') : tr('قيد المراجعة', 'Under review'))}</p>
                        {provider.rating != null ? <p className="mt-1">{tr('التقييم', 'Rating')}: {provider.rating}</p> : null}
                      </div>
                    </div>
                  </div>
                )) : <p className="rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3 text-sm font-semibold text-slate-600">{tr('لا يوجد مزوّدون مطابقون لهذه الخدمة حالياً.', 'No matching providers for this service right now.')}</p>}
              </div>

              <form className="mt-5 space-y-4" onSubmit={assignForm.handleSubmit(handleAssign)}>
                <select
                  aria-label={tr('اختر المزوّد', 'Select provider')}
                  className="field disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!allowedActions.can_assign_provider || !providers.length}
                  {...assignForm.register('provider_id', { required: tr('اختر مزوّد الخدمة', 'Select a provider') })}
                >
                  <option value="">{tr('اختر مزوّد الخدمة', 'Select a provider')}</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>{provider.full_name} — {provider.city} {provider.is_available ? '' : tr('(غير متاح)', '(unavailable)')}</option>
                  ))}
                </select>
                {assignForm.formState.errors.provider_id ? <p className="text-sm font-bold text-danger">{assignForm.formState.errors.provider_id.message}</p> : null}
                <textarea aria-label={tr('ملاحظة التعيين', 'Assignment note')} className="field min-h-24 disabled:cursor-not-allowed disabled:opacity-60" disabled={!allowedActions.can_assign_provider} placeholder={tr('ملاحظة التعيين', 'Assignment note')} {...assignForm.register('note')} />
                <button className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60" disabled={!allowedActions.can_assign_provider || !providers.length} type="submit">{tr('تعيين المزوّد', 'Assign provider')}</button>
              </form>
            </SectionCard>
          ) : null}

          {finalDocuments.length ? (
            <SectionCard icon={FileText} title={tr('مراجعة نتيجة المزوّد', 'Review the provider result')} description={tr('اعتمد النتيجة بعد التحقق، أو أعدها للمزوّد أو للمراجعة الداخلية بسبب واضح.', 'Approve the result after verifying it, or return it to the provider or internal review with a clear reason.')}>
              <DocumentList documents={finalDocuments} />
              {allowedActions.can_complete ? (
                <button className="btn-primary mt-4 w-full" onClick={handleComplete} type="button">{tr('اعتماد النتيجة وإكمال الطلب', 'Approve result & complete request')}</button>
              ) : null}
              {canReturnToProvider ? (
                <form className="mt-4 space-y-3" onSubmit={returnProviderForm.handleSubmit(handleReturnToProvider)}>
                  <textarea aria-label={tr('سبب الإعادة إلى المزوّد', 'Reason to return to provider')} className="field min-h-20" placeholder={tr('سبب الإعادة إلى المزوّد', 'Reason to return to the provider')} {...returnProviderForm.register('note', { required: tr('سبب الإعادة مطلوب', 'A reason is required') })} />
                  {returnProviderForm.formState.errors.note ? <p className="text-sm font-bold text-danger">{returnProviderForm.formState.errors.note.message}</p> : null}
                  <button className="btn-secondary w-full" type="submit">{tr('إعادة إلى المزوّد', 'Return to provider')}</button>
                </form>
              ) : null}
              {canReturnToInternalReview ? (
                <form className="mt-4 space-y-3" onSubmit={returnInternalForm.handleSubmit(handleReturnToInternal)}>
                  <textarea aria-label={tr('سبب الإعادة إلى المراجعة الداخلية', 'Reason to return to internal review')} className="field min-h-20" placeholder={tr('سبب الإعادة إلى المراجعة الداخلية', 'Reason to return to internal review')} {...returnInternalForm.register('note', { required: tr('سبب الإعادة مطلوب', 'A reason is required') })} />
                  {returnInternalForm.formState.errors.note ? <p className="text-sm font-bold text-danger">{returnInternalForm.formState.errors.note.message}</p> : null}
                  <button className="btn-secondary w-full" type="submit">{tr('إعادة إلى المراجعة الداخلية', 'Return to internal review')}</button>
                </form>
              ) : null}
            </SectionCard>
          ) : null}

          {allowedActions.can_add_internal_note ? (
            <SectionCard icon={FileText} title={tr('ملاحظة داخلية', 'Internal note')} description={tr('هذه الملاحظات مخصصة للفريق الداخلي فقط.', 'These notes are for the internal team only.')}>
              <form className="space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea aria-label={tr('نص الملاحظة', 'Note text')} className="field min-h-20" placeholder={tr('ملاحظة للعمل الداخلي فقط', 'A note for internal work only')} {...noteForm.register('note', { required: tr('الملاحظة مطلوبة', 'A note is required') })} />
                {noteForm.formState.errors.note ? <p className="text-sm font-bold text-danger">{noteForm.formState.errors.note.message}</p> : null}
                <button className="btn-secondary w-full" type="submit">{tr('حفظ الملاحظة', 'Save note')}</button>
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_send_manual_notification ? (
            <SectionCard icon={Bell} title={tr('إشعار يدوي معتمد', 'Approved manual notification')} description={tr('يمكنك إرسال قالب إشعار معتمد فقط، دون كتابة رسالة حرة.', 'You may send an approved notification template only — no free-text message.')}>
              <form className="space-y-4" onSubmit={manualNotificationForm.handleSubmit(handleManualNotification)}>
                <select aria-label={tr('قالب الإشعار', 'Notification template')} className="field" {...manualNotificationForm.register('template_id', { required: tr('اختر القالب', 'Select a template') })}>
                  <option value="">{tr('اختر قالب الإشعار', 'Select a notification template')}</option>
                  {templates.map((template) => (
                    <option key={template.template_id} value={template.template_id}>{isArabic ? template.title_ar : (template.title_en || template.title_ar)}</option>
                  ))}
                </select>
                {manualNotificationForm.formState.errors.template_id ? <p className="text-sm font-bold text-danger">{manualNotificationForm.formState.errors.template_id.message}</p> : null}
                <button className="btn-secondary w-full" type="submit">{tr('إرسال الإشعار', 'Send notification')}</button>
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_reject ? (
            <button className="btn-danger w-full" onClick={() => setConfirmReject(true)} type="button">
              <XCircle className="h-4 w-4" />{tr('رفض الطلب', 'Reject request')}
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel={tr('نعم، ارفض الطلب', 'Yes, reject it')}
        description={tr('سيتم رفض الطلب وتوثيق السبب. لا يمكن التراجع.', 'The request will be rejected and the reason recorded. This cannot be undone.')}
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        open={confirmReject}
        title={tr('تأكيد رفض الطلب', 'Confirm rejection')}
        variant="danger"
      />
    </div>
  )
}

export default EmployeeOrderReviewPage
