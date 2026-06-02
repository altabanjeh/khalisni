import { Bell, CircleAlert, FileSearch, FileText, ShieldCheck, UserRoundCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import InlineHelp from '../../components/InlineHelp'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useRegisterPageHelp } from '../../context/HelpGuideContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions, hasPermission } from '../../utils/authz'
import { formatDate, formatDateTime } from '../../utils/format'
import { getRequiredDocumentLabel, getRequiredDocumentType } from '../../utils/serviceForms'

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

function NotesColumn({ title, notes, emptyLabel }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-4">
      <p className="font-semibold text-ink">{title}</p>
      <div className="mt-3 space-y-3">
        {notes.length ? (
          notes.map((note) => (
            <div key={note.id} className="rounded-2xl bg-brand-50/50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-ink">{note.user_name}</p>
              <p className="mt-1">{note.note}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  )
}

function EmployeeOrderReviewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [confirmReject, setConfirmReject] = useState(false)
  const { data: order, loading, error, reload } = useAsyncData(() => api.getEmployeeOrder(id), [id], null)
  const { data: providers = [], error: providersError } = useAsyncData(() => api.getProviders({ order: id }), [id], [])
  const { data: templates = [] } = useAsyncData(() => api.getEmployeeNotificationTemplates(), [], [])
  const { data: serviceDetails } = useAsyncData(
    () => (order?.service?.slug ? api.getService(order.service.slug) : Promise.resolve(null)),
    [order?.service?.slug],
    null,
  )
  useRegisterPageHelp({ workflowStatus: order?.status || '', serviceId: order?.service?.id || '' })
  const assignForm = useForm()
  const docsRequestForm = useForm()
  const noteForm = useForm()
  const returnProviderForm = useForm()
  const returnInternalForm = useForm()
  const manualNotificationForm = useForm()

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  }

  if (loading || !order) return <LoadingSpinner />

  const requiredDocuments = serviceDetails?.required_documents || []
  const allowedActions = getOrderAllowedActions(order)
  const availableStatusTransitions = allowedActions.available_status_transitions || []
  const canStartReview = availableStatusTransitions.includes('UNDER_REVIEW') && order.status === 'NEW'
  const canReturnToProvider = availableStatusTransitions.includes('IN_PROGRESS')
  const canReturnToInternalReview = availableStatusTransitions.includes('UNDER_REVIEW') && order.status === 'READY_FOR_DELIVERY'
  const requiredDocumentRows = requiredDocuments.map((document, index) => {
    const documentType = getRequiredDocumentType(document, index)
    const uploads = (order.documents || []).filter((item) => String(item.document_type || '').toLowerCase() === documentType)
    const latestUpload = uploads[0] || null
    return {
      documentType,
      label: getRequiredDocumentLabel(document),
      isMissing: (order.missing_document_types || []).includes(documentType),
      latestUpload,
    }
  })
  const internalNotes = (order.notes || []).filter((note) => note.visibility === 'INTERNAL')
  const customerNotes = (order.notes || []).filter((note) => note.visibility === 'CUSTOMER')
  const providerNotes = (order.notes || []).filter((note) => note.visibility === 'PROVIDER')
  const finalDocuments = (order.documents || []).filter((document) => document.is_final_document)
  const canViewProviderCandidates = hasPermission(user, 'orders.assign_order')
  const shouldShowProviderSection =
    canViewProviderCandidates || allowedActions.can_assign_provider || providers.length > 0 || Boolean(providersError)
  const documentsPendingValidation = requiredDocumentRows.filter((item) => {
    const latestStatus = String(item.latestUpload?.status || '').toLowerCase()
    return !item.latestUpload || latestStatus !== 'approved'
  })
  const providerAssignmentBlockedMessage =
    !allowedActions.can_assign_provider && canViewProviderCandidates
      ? 'يمكنك مراجعة قائمة المزوّدين الآن، لكن الإسناد لن يتفعّل قبل اعتماد جميع المستندات المطلوبة.'
      : ''
  const providerReadyMessage = allowedActions.can_assign_provider
    ? 'المتطلبات مكتملة. اختر المزوّد المناسب ثم أرسل الطلب إليه.'
    : ''

  async function ensureReviewStarted() {
    if (!canStartReview) return
    await api.updateEmployeeStatus(id, {
      status: 'UNDER_REVIEW',
      note: 'بدأ الموظف مراجعة الطلب.',
    })
  }

  async function handleAssign(values) {
    try {
      await ensureReviewStarted()
      await api.assignEmployeeOrder(id, values)
      assignForm.reset()
      reload()
      toast('تم تعيين المزوّد بنجاح.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleMissingDocs(values) {
    const documentTypes = Array.isArray(values.document_types)
      ? values.document_types.map((item) => String(item).trim()).filter(Boolean)
      : values.document_types
        ? [String(values.document_types).trim()].filter(Boolean)
        : []

    try {
      await ensureReviewStarted()
      await api.requestEmployeeDocuments(id, { note: values.note, document_types: documentTypes })
      docsRequestForm.reset()
      reload()
      toast('تم إرسال طلب المستندات الناقصة للعميل.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleNote(values) {
    try {
      await api.addEmployeeNote(id, { note: values.note, visibility: 'INTERNAL' })
      noteForm.reset()
      reload()
      toast('تم حفظ الملاحظة الداخلية.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleReject() {
    setConfirmReject(false)
    try {
      await api.rejectOrder(id, { reason: 'تعذر استيفاء متطلبات المراجعة الحالية.' })
      reload()
      toast('تم رفض الطلب وتوثيق السبب.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleStartReview() {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: 'بدأ الموظف مراجعة الطلب.' })
      reload()
      toast('تم نقل الطلب إلى قيد المراجعة.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleReturnToProvider(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'IN_PROGRESS', note: values.note })
      returnProviderForm.reset()
      reload()
      toast('تمت إعادة الطلب إلى المزوّد مع السبب.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleReturnToInternal(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: values.note })
      returnInternalForm.reset()
      reload()
      toast('تمت إعادة الطلب إلى المراجعة الداخلية.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleComplete() {
    try {
      await api.completeEmployeeOrder(id, { admin_confirmation: false })
      reload()
      toast('تم إكمال الطلب عبر المسار الآمن.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleManualNotification(values) {
    try {
      await api.sendManualOrderNotification(id, { template_id: Number(values.template_id) })
      manualNotificationForm.reset()
      toast('تم إرسال الإشعار اليدوي من القالب المعتمد.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="راجع بيانات العميل والخدمة والوثائق، ثم استخدم فقط الإجراءات المسموح بها في هذه المرحلة من رحلة الطلب."
        eyebrow="تفاصيل المراجعة"
        icon={FileSearch}
        title={order.order_number}
      />

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="العميل" value={order.customer?.full_name || 'غير متاح'} hint={order.customer?.phone || 'لا يوجد هاتف'} />
          <MetricCard label="البريد والهوية" value={order.customer?.email || 'غير متوفر'} hint={order.customer?.national_id || 'لا يوجد رقم وطني'} />
          <MetricCard label="الخدمة" value={order.service?.name_ar || 'غير محددة'} hint={order.service?.category_name || ''} />
          <MetricCard label="التسليم المتوقع" value={formatDate(order.expected_delivery_date)} hint={order.city || 'غير محددة'} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard
            icon={ShieldCheck}
            title="متطلبات الخدمة والوثائق"
            description="تحقق من كل مستند مطلوب، واعتمد الوثائق قبل إسناد الطلب إلى المزوّد."
          >
            <div className="grid gap-3">
              {requiredDocumentRows.length ? (
                requiredDocumentRows.map((item) => (
                  <div key={item.documentType} className="rounded-3xl border border-border bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{item.label || item.documentType}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.latestUpload
                            ? `آخر رفع: ${item.latestUpload.original_filename} - ${formatDateTime(item.latestUpload.created_at)}`
                            : 'لم يتم رفع هذا المستند بعد.'}
                        </p>
                      </div>
                      <StatusBadge status={item.latestUpload?.status || (item.isMissing ? 'REJECTED' : 'pending_review')} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-3xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                  لا توجد متطلبات وثائق معرفة لهذه الخدمة.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="الوثائق المرفوعة"
            description="استعرض كل الملفات الحالية، وافتح شاشة التحقق إذا كانت صلاحيتك تسمح بذلك."
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500">جميع المرفقات الخاصة بالطلب في مرحلته الحالية.</div>
              {allowedActions.can_verify_documents ? (
                <div className="flex items-center gap-2">
                  <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                  <ShieldCheck className="h-4 w-4" />
                  فتح شاشة التحقق
                  </Link>
                  <InlineHelp actionKey="verify_documents" />
                </div>
              ) : null}
            </div>
            <div className="mt-5">
              <DocumentList documents={order.documents || []} />
            </div>
          </SectionCard>

          <SectionCard
            icon={FileText}
            title="سجل الملاحظات"
            description="تفصيل الملاحظات الداخلية ورسائل العميل وملاحظات المزوّد في مكان واحد."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <NotesColumn title="ملاحظات داخلية" notes={internalNotes} emptyLabel="لا توجد ملاحظات داخلية." />
              <NotesColumn title="رسائل العميل" notes={customerNotes} emptyLabel="لا توجد رسائل عميل مسجلة." />
              <NotesColumn title="ملاحظات المزوّد" notes={providerNotes} emptyLabel="لا توجد ملاحظات مزوّد مرئية لهذه المرحلة." />
            </div>
          </SectionCard>

          <SectionCard
            icon={FileSearch}
            title="التسلسل الزمني"
            description="المسار الكامل لجميع تحولات الطلب منذ إنشائه."
          >
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          {canStartReview ? (
            <div className="glass-panel border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>الطلب ما زال بحالة جديد. يمكنك بدء المراجعة الآن أو سيبدأ النظام المراجعة مع أول إجراء صالح.</span>
                <div className="flex items-center gap-2">
                  <button className="btn-primary shrink-0" onClick={handleStartReview} type="button">
                  بدء المراجعة
                  </button>
                  <InlineHelp actionKey="start_review" />
                </div>
              </div>
            </div>
          ) : null}

          <SectionCard
            icon={CircleAlert}
            title="المستندات الناقصة الحالية"
            description="عرض سريع للنواقص المفتوحة حالياً على الطلب."
          >
            <div className="space-y-3">
              {(order.missing_document_types || []).length ? (
                order.missing_document_types.map((documentType) => (
                  <div key={documentType} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {documentType}
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                  لا توجد نواقص معلقة على الطلب حالياً.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            icon={ShieldCheck}
            title="خطوات العمل على الطلب"
            description="ملخص تنفيذي سريع لما ينبغي فعله قبل الإسناد أو اعتماد النتيجة النهائية."
          >
            <div className="space-y-3">
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">الخطوة 1</p>
                <p className="mt-1 font-semibold text-ink">التحقق من المستندات المطلوبة</p>
                <p className="mt-2 text-sm text-slate-600">
                  افتح شاشة التحقق ثم راجع واعتمد كل مستند مطلوب قبل محاولة إرسال الطلب إلى المزوّد.
                </p>
                {allowedActions.can_verify_documents ? (
                  <Link className="btn-secondary mt-4 px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                    <ShieldCheck className="h-4 w-4" />
                    التحقق من المستندات أولاً
                  </Link>
                ) : null}
              </div>

              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">الخطوة 2</p>
                <p className="mt-1 font-semibold text-ink">إرسال الطلب إلى المزوّد</p>
                <p className="mt-2 text-sm text-slate-600">
                  بعد اكتمال التحقق، ارجع إلى قسم المزوّدين، اختر المزوّد المناسب، ثم أرسل الطلب إليه.
                </p>
                {allowedActions.can_assign_provider ? (
                  <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    جاهز الآن: يمكنك اختيار مزوّد وإرسال الطلب.
                  </p>
                ) : (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    لا يمكن إرسال الطلب إلى المزوّد بعد. أكمل التحقق من المستندات المطلوبة أولاً.
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">الخطوة 3</p>
                <p className="mt-1 font-semibold text-ink">مراجعة النتيجة النهائية</p>
                <p className="mt-2 text-sm text-slate-600">
                  بعد رفع المزوّد للنتيجة النهائية، راجعها ثم أكمل الطلب أو أعده للمزوّد أو للمراجعة الداخلية بسبب واضح.
                </p>
              </div>
            </div>
          </SectionCard>

          {allowedActions.can_request_documents ? (
            <SectionCard
              icon={CircleAlert}
              title="طلب مستندات ناقصة"
              description="حدد المستندات المطلوبة وأرسل ملاحظة واضحة للعميل."
            >
              <form className="space-y-4" onSubmit={docsRequestForm.handleSubmit(handleMissingDocs)}>
                <textarea
                  className="field min-h-28"
                  placeholder="اشرح المطلوب بوضوح."
                  {...docsRequestForm.register('note', { required: 'ملاحظة الطلب مطلوبة' })}
                />
                {docsRequestForm.formState.errors.note ? <p className="text-sm text-danger">{docsRequestForm.formState.errors.note.message}</p> : null}
                {requiredDocuments.length ? (
                  <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
                    {requiredDocuments.map((document, index) => (
                      <label key={getRequiredDocumentType(document, index)} className="flex items-center gap-3 text-sm text-ink">
                        <input type="checkbox" value={getRequiredDocumentType(document, index)} {...docsRequestForm.register('document_types')} />
                        <span>{getRequiredDocumentLabel(document)}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                <button className="btn-secondary w-full" type="submit">
                  إرسال الطلب
                </button>
                <InlineHelp actionKey="add_internal_note" className="mt-2" />
                <InlineHelp actionKey="request_missing_documents" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {shouldShowProviderSection ? (
            <SectionCard
              icon={UserRoundCheck}
              title="تعيين مزوّد"
              description="راجع قائمة المزوّدين المؤهلين، ثم أرسل الطلب عندما تكتمل شروط الإسناد."
            >
              {providersError ? <p className="text-sm text-danger">{getDisplayError(providersError)}</p> : null}
              {providerAssignmentBlockedMessage ? <p className="text-sm text-amber-700">{providerAssignmentBlockedMessage}</p> : null}
              {providerReadyMessage ? <p className="text-sm text-emerald-700">{providerReadyMessage}</p> : null}

              {!allowedActions.can_assign_provider && canViewProviderCandidates ? (
                <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">قبل إرسال الطلب إلى المزوّد</p>
                  <p className="mt-2">1. افتح شاشة التحقق من المستندات.</p>
                  <p className="mt-1">2. اعتمد كل المستندات المطلوبة لهذه الخدمة.</p>
                  <p className="mt-1">3. ارجع هنا ثم اختر المزوّد وأرسل الطلب.</p>
                  {documentsPendingValidation.length ? (
                    <div className="mt-3">
                      <p className="font-semibold">المستندات التي ما زالت تحتاج تحقق:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {documentsPendingValidation.map((item) => (
                          <span key={item.documentType} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs">
                            {item.label || item.documentType}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {allowedActions.can_verify_documents ? (
                    <Link className="btn-secondary mt-4 px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                      <ShieldCheck className="h-4 w-4" />
                      التحقق من المستندات أولاً
                    </Link>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                {providers.length ? (
                  providers.map((provider) => (
                    <div key={provider.id} className="rounded-3xl border border-border bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">{provider.full_name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {provider.provider_type || 'مزوّد خدمة'} {provider.city ? `- ${provider.city}` : ''}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {provider.capability_summary || provider.service_categories?.join('، ') || 'لا توجد تخصصات مرتبطة'}
                          </p>
                        </div>
                        <div className="text-left text-xs text-slate-500">
                          <p>{provider.is_available ? 'متاح الآن' : 'غير متاح حالياً'}</p>
                          <p className="mt-1">{provider.approval_status_label || (provider.is_approved ? 'معتمد' : 'قيد المراجعة')}</p>
                          {provider.rating != null ? <p className="mt-1">التقييم: {provider.rating}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-3xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                    لا يوجد مزوّدون مطابقون لهذه الخدمة حالياً.
                  </p>
                )}
              </div>

              <form className="mt-5 space-y-4" onSubmit={assignForm.handleSubmit(handleAssign)}>
                <select
                  className="field disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!allowedActions.can_assign_provider || !providers.length}
                  {...assignForm.register('provider_id', { required: 'اختر مزوّد الخدمة' })}
                >
                  <option value="">اختر مزوّد الخدمة</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.full_name} - {provider.city} {provider.is_available ? '' : '(غير متاح)'}
                    </option>
                  ))}
                </select>
                {assignForm.formState.errors.provider_id ? <p className="text-sm text-danger">{assignForm.formState.errors.provider_id.message}</p> : null}
                <textarea
                  className="field min-h-24 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!allowedActions.can_assign_provider}
                  placeholder="ملاحظة التعيين"
                  {...assignForm.register('note')}
                />
                <button
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!allowedActions.can_assign_provider || !providers.length}
                  type="submit"
                >
                  تعيين المزوّد
                </button>
                <InlineHelp actionKey="assign_provider" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {finalDocuments.length ? (
            <SectionCard
              icon={FileText}
              title="مراجعة نتيجة المزوّد"
              description="اعتمد النتيجة بعد التحقق من المستند النهائي، أو أعدها للمزوّد أو للمراجعة الداخلية مع سبب واضح."
            >
              <DocumentList documents={finalDocuments} />
              {allowedActions.can_complete ? (
                <div className="mt-4 space-y-2">
                  <button className="btn-primary w-full" onClick={handleComplete} type="button">
                  اعتماد النتيجة وإكمال الطلب
                  </button>
                  <InlineHelp actionKey="complete_order" />
                </div>
              ) : null}
              {canReturnToProvider ? (
                <form className="mt-4 space-y-3" onSubmit={returnProviderForm.handleSubmit(handleReturnToProvider)}>
                  <textarea
                    className="field min-h-24"
                    placeholder="سبب الإعادة إلى المزوّد"
                    {...returnProviderForm.register('note', { required: 'سبب الإعادة مطلوب' })}
                  />
                  {returnProviderForm.formState.errors.note ? <p className="text-sm text-danger">{returnProviderForm.formState.errors.note.message}</p> : null}
                  <button className="btn-secondary w-full" type="submit">
                    إعادة إلى المزوّد
                  </button>
                  <InlineHelp actionKey="return_to_provider" className="mt-2" />
                </form>
              ) : null}
              {canReturnToInternalReview ? (
                <form className="mt-4 space-y-3" onSubmit={returnInternalForm.handleSubmit(handleReturnToInternal)}>
                  <textarea
                    className="field min-h-24"
                    placeholder="سبب الإعادة إلى المراجعة الداخلية"
                    {...returnInternalForm.register('note', { required: 'سبب الإعادة مطلوب' })}
                  />
                  {returnInternalForm.formState.errors.note ? <p className="text-sm text-danger">{returnInternalForm.formState.errors.note.message}</p> : null}
                  <button className="btn-secondary w-full" type="submit">
                    إعادة إلى المراجعة الداخلية
                  </button>
                  <InlineHelp actionKey="return_to_internal_review" className="mt-2" />
                </form>
              ) : null}
            </SectionCard>
          ) : null}

          {allowedActions.can_add_internal_note ? (
            <SectionCard
              icon={FileText}
              title="ملاحظة داخلية"
              description="هذه الملاحظات مخصصة لفريق العمل الداخلي فقط."
            >
              <form className="space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea
                  className="field min-h-24"
                  placeholder="ملاحظة للعمل الداخلي فقط"
                  {...noteForm.register('note', { required: 'الملاحظة مطلوبة' })}
                />
                {noteForm.formState.errors.note ? <p className="text-sm text-danger">{noteForm.formState.errors.note.message}</p> : null}
                <button className="btn-secondary w-full" type="submit">
                  حفظ الملاحظة
                </button>
                <InlineHelp actionKey="add_internal_note" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_send_manual_notification ? (
            <SectionCard
              icon={Bell}
              title="إشعار يدوي معتمد"
              description="يمكنك إرسال قالب إشعار معتمد فقط، دون كتابة رسالة حرة من هذه الشاشة."
            >
              <form className="space-y-4" onSubmit={manualNotificationForm.handleSubmit(handleManualNotification)}>
                <select className="field" {...manualNotificationForm.register('template_id', { required: 'اختر القالب' })}>
                  <option value="">اختر قالب الإشعار</option>
                  {templates.map((template) => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.title_ar}
                    </option>
                  ))}
                </select>
                {manualNotificationForm.formState.errors.template_id ? (
                  <p className="text-sm text-danger">{manualNotificationForm.formState.errors.template_id.message}</p>
                ) : null}
                <button className="btn-secondary w-full" type="submit">
                  إرسال الإشعار
                </button>
                <InlineHelp actionKey="send_manual_notification" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_reject ? (
            <div className="space-y-2">
              <button className="btn-danger w-full" onClick={() => setConfirmReject(true)} type="button">
              <XCircle className="h-4 w-4" />
              رفض الطلب
              </button>
              <InlineHelp actionKey="reject_order" />
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel="نعم، ارفض الطلب"
        description="سيتم رفض الطلب وتوثيق السبب. هذا الإجراء لا يمكن التراجع عنه."
        onClose={() => setConfirmReject(false)}
        onConfirm={handleReject}
        open={confirmReject}
        title="تأكيد رفض الطلب"
        variant="danger"
      />
    </div>
  )
}

export default EmployeeOrderReviewPage
