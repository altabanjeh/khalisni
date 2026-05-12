import { Bell, CircleAlert, FileSearch, FileText, ShieldCheck, UserRoundCheck, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import DocumentList from '../../components/DocumentList'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions, hasPermission } from '../../utils/authz'
import { formatDate, formatDateTime } from '../../utils/format'
import { getRequiredDocumentLabel, getRequiredDocumentType } from '../../utils/serviceForms'

function EmployeeOrderReviewPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('success')
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

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  }

  if (loading || !order) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل تفاصيل الطلب...</div>
  }

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
      ? 'يمكنك مراجعة المزودين الآن، لكن التعيين سيتفعل فقط بعد اكتمال شروط المراجعة واعتماد المستندات المطلوبة.'
      : ''

  const providerReadyMessage = allowedActions.can_assign_provider
    ? 'جميع المتطلبات مكتملة. اختر المزود المناسب ثم اضغط إرسال الطلب إلى المزود.'
    : ''

  function showResult(nextMessage, tone = 'success') {
    setMessage(nextMessage)
    setMessageTone(tone)
  }

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
      showResult('تم تعيين المزود بنجاح.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
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
      showResult('تم إرسال طلب المستندات الناقصة للعميل.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleNote(values) {
    try {
      await api.addEmployeeNote(id, { note: values.note, visibility: 'INTERNAL' })
      noteForm.reset()
      reload()
      showResult('تم حفظ الملاحظة الداخلية.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleReject() {
    try {
      await api.rejectOrder(id, { reason: 'تعذر استيفاء متطلبات المراجعة الحالية.' })
      reload()
      showResult('تم رفض الطلب وتوثيق السبب.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleStartReview() {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: 'بدأ الموظف مراجعة الطلب.' })
      reload()
      showResult('تم نقل الطلب إلى قيد المراجعة.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleReturnToProvider(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'IN_PROGRESS', note: values.note })
      returnProviderForm.reset()
      reload()
      showResult('تمت إعادة الطلب إلى المزود مع السبب.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleReturnToInternal(values) {
    try {
      await api.updateEmployeeStatus(id, { status: 'UNDER_REVIEW', note: values.note })
      returnInternalForm.reset()
      reload()
      showResult('تمت إعادة الطلب إلى المراجعة الداخلية.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleComplete() {
    try {
      await api.completeEmployeeOrder(id, { admin_confirmation: false })
      reload()
      showResult('تم إكمال الطلب عبر المسار الآمن.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  async function handleManualNotification(values) {
    try {
      await api.sendManualOrderNotification(id, { template_id: Number(values.template_id) })
      manualNotificationForm.reset()
      showResult('تم إرسال الإشعار اليدوي من القالب المعتمد.')
    } catch (submitError) {
      showResult(getDisplayError(submitError), 'danger')
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="راجع بيانات العميل والخدمة والوثائق، ثم استخدم فقط الإجراءات التي يسمح بها النظام في هذه المرحلة."
        eyebrow="تفاصيل المراجعة"
        icon={FileSearch}
        title={order.order_number}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">العميل</p>
                <p className="mt-2 font-bold text-ink">{order.customer?.full_name}</p>
                <p className="mt-2 text-xs text-slate-500">{order.customer?.phone || 'لا يوجد هاتف'}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">البريد</p>
                <p className="mt-2 font-bold text-ink">{order.customer?.email || 'غير متوفر'}</p>
                <p className="mt-2 text-xs text-slate-500">{order.customer?.national_id || 'لا يوجد رقم وطني'}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">الخدمة</p>
                <p className="mt-2 font-bold text-ink">{order.service?.name_ar}</p>
                <p className="mt-2 text-xs text-slate-500">{order.service?.category_name || ''}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">الموعد المتوقع</p>
                <p className="mt-2 font-bold text-ink">{formatDate(order.expected_delivery_date)}</p>
                <p className="mt-2 text-xs text-slate-500">{order.city}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">متطلبات الخدمة والوثائق</h2>
            <div className="mt-5 grid gap-3">
              {requiredDocumentRows.length ? requiredDocumentRows.map((item) => (
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
              )) : (
                <p className="rounded-3xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                  لا توجد متطلبات وثائق معرفة لهذه الخدمة.
                </p>
              )}
            </div>
          </section>

          <section className="glass-panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">الوثائق المرفوعة</h2>
              {allowedActions.can_verify_documents ? (
                <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                  <ShieldCheck className="h-4 w-4" />
                  فتح شاشة التحقق
                </Link>
              ) : null}
            </div>
            <div className="mt-5">
              <DocumentList documents={order.documents || []} />
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">سجل الملاحظات</h2>
            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="font-semibold text-ink">ملاحظات داخلية</p>
                <div className="mt-3 space-y-3">
                  {internalNotes.length ? internalNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl bg-brand-50/50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-ink">{note.user_name}</p>
                      <p className="mt-1">{note.note}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">لا توجد ملاحظات داخلية.</p>}
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="font-semibold text-ink">رسائل العميل</p>
                <div className="mt-3 space-y-3">
                  {customerNotes.length ? customerNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl bg-brand-50/50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-ink">{note.user_name}</p>
                      <p className="mt-1">{note.note}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">لا توجد رسائل عميل مسجلة.</p>}
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="font-semibold text-ink">ملاحظات المزود</p>
                <div className="mt-3 space-y-3">
                  {providerNotes.length ? providerNotes.map((note) => (
                    <div key={note.id} className="rounded-2xl bg-brand-50/50 p-3 text-sm text-slate-700">
                      <p className="font-semibold text-ink">{note.user_name}</p>
                      <p className="mt-1">{note.note}</p>
                    </div>
                  )) : <p className="text-sm text-slate-500">لا توجد ملاحظات مزود مرئية لهذه المرحلة.</p>}
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">التسلسل الزمني</h2>
            <div className="mt-5">
              <OrderTimeline items={order.status_logs || []} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {canStartReview ? (
            <div className="glass-panel p-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <span>الطلب ما زال بحالة جديد. يمكنك بدء المراجعة الآن أو سيبدأ النظام المراجعة مع أول إجراء صالح.</span>
                <button className="btn-primary shrink-0" onClick={handleStartReview} type="button">
                  بدء المراجعة
                </button>
              </div>
            </div>
          ) : null}

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">المستندات الناقصة الحالية</h2>
            <div className="mt-4 space-y-3">
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
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">خطوات العمل على الطلب</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">الخطوة 1</p>
                <p className="mt-1 font-semibold text-ink">التحقق من المستندات المطلوبة</p>
                <p className="mt-2 text-sm text-slate-600">
                  افتح شاشة التحقق، ثم راجع واعتمد كل مستند مطلوب قبل محاولة إرسال الطلب إلى المزود.
                </p>
                {allowedActions.can_verify_documents ? (
                  <Link className="btn-secondary mt-4 px-4 py-2 text-xs" to={`/employee/documents/verify?order=${order.id}`}>
                    <ShieldCheck className="h-4 w-4" />
                    فتح شاشة التحقق
                  </Link>
                ) : null}
              </div>

              <div className="rounded-3xl border border-border bg-white p-4">
                <p className="text-xs font-semibold text-slate-500">الخطوة 2</p>
                <p className="mt-1 font-semibold text-ink">إرسال الطلب إلى المزود</p>
                <p className="mt-2 text-sm text-slate-600">
                  بعد اعتماد المستندات المطلوبة، ارجع إلى قسم المزودين في الأسفل، اختر المزود المناسب، ثم أرسل الطلب إليه.
                </p>
                {allowedActions.can_assign_provider ? (
                  <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    جاهز الآن: يمكنك اختيار مزود وإرسال الطلب.
                  </p>
                ) : (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    لا يمكن إرسال الطلب إلى المزود بعد. أكمل التحقق من المستندات المطلوبة أولاً.
                  </p>
                )}
              </div>
            </div>
          </section>

          {allowedActions.can_request_documents ? (
            <section className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <CircleAlert className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink">طلب مستندات ناقصة</h2>
                  <p className="mt-1 text-sm text-slate-600">حدد واحداً أو أكثر من المستندات المطلوبة واكتب ملاحظة واضحة للعميل.</p>
                </div>
              </div>
              <form className="mt-5 space-y-4" onSubmit={docsRequestForm.handleSubmit(handleMissingDocs)}>
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
              </form>
            </section>
          ) : null}

          {shouldShowProviderSection ? (
            <section className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <UserRoundCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink">تعيين مزود</h2>
                  <p className="mt-1 text-sm text-slate-600">اعرض المزودين المؤهلين، ثم اختر مزوداً مناسباً للخدمة.</p>
                  {providersError ? <p className="mt-2 text-sm text-danger">{getDisplayError(providersError)}</p> : null}
                  {providerAssignmentBlockedMessage ? (
                    <p className="mt-2 text-sm text-amber-700">{providerAssignmentBlockedMessage}</p>
                  ) : null}
                  {providerReadyMessage ? (
                    <p className="mt-2 text-sm text-emerald-700">{providerReadyMessage}</p>
                  ) : null}
                </div>
              </div>
              {!allowedActions.can_assign_provider && canViewProviderCandidates ? (
                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">قبل إرسال الطلب إلى المزود</p>
                  <p className="mt-2">1. افتح شاشة التحقق من المستندات.</p>
                  <p className="mt-1">2. اعتمد كل المستندات المطلوبة لهذه الخدمة.</p>
                  <p className="mt-1">3. ارجع هنا ثم اختر المزود وأرسل الطلب.</p>
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
                            {provider.provider_type || 'مزود خدمة'} {provider.city ? `- ${provider.city}` : ''}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {provider.capability_summary || provider.service_categories?.join('، ') || 'لا توجد تخصصات مرتبطة'}
                          </p>
                        </div>
                        <div className="text-left text-xs text-slate-500">
                          <p>{provider.is_available ? 'متاح الآن' : 'غير متاح حالياً'}</p>
                          <p className="mt-1">{provider.approval_status_label || (provider.is_approved ? 'Approved' : 'Pending review')}</p>
                          {provider.rating != null ? <p className="mt-1">التقييم: {provider.rating}</p> : null}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-3xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                    لا يوجد مزودون مطابقون لهذه الخدمة حالياً.
                  </p>
                )}
              </div>
              <form className="mt-5 space-y-4" onSubmit={assignForm.handleSubmit(handleAssign)}>
                <select
                  className="field disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!allowedActions.can_assign_provider || !providers.length}
                  {...assignForm.register('provider_id', { required: 'اختر مزود الخدمة' })}
                >
                  <option value="">اختر مزود الخدمة</option>
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
                  تعيين المزود
                </button>
              </form>
            </section>
          ) : null}

          {finalDocuments.length ? (
            <section className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink">مراجعة نتيجة المزود</h2>
                  <p className="mt-1 text-sm text-slate-600">اعتمد النتيجة بعد التحقق من المستند النهائي، أو أعدها إلى المزود/المراجعة الداخلية مع سبب واضح.</p>
                </div>
              </div>
              <div className="mt-5">
                <DocumentList documents={finalDocuments} />
              </div>
              {allowedActions.can_complete ? (
                <button className="btn-primary mt-4 w-full" onClick={handleComplete} type="button">
                  اعتماد النتيجة وإكمال الطلب
                </button>
              ) : null}
              {canReturnToProvider ? (
                <form className="mt-4 space-y-3" onSubmit={returnProviderForm.handleSubmit(handleReturnToProvider)}>
                  <textarea
                    className="field min-h-24"
                    placeholder="سبب الإعادة إلى المزود"
                    {...returnProviderForm.register('note', { required: 'سبب الإعادة مطلوب' })}
                  />
                  {returnProviderForm.formState.errors.note ? <p className="text-sm text-danger">{returnProviderForm.formState.errors.note.message}</p> : null}
                  <button className="btn-secondary w-full" type="submit">
                    إعادة إلى المزود
                  </button>
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
                </form>
              ) : null}
            </section>
          ) : null}

          {allowedActions.can_add_internal_note ? (
            <section className="glass-panel p-6">
              <h2 className="text-xl font-bold text-ink">ملاحظة داخلية</h2>
              <form className="mt-5 space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea
                  className="field min-h-24"
                  placeholder="ملاحظة للعمل الداخلي فقط"
                  {...noteForm.register('note', { required: 'الملاحظة مطلوبة' })}
                />
                {noteForm.formState.errors.note ? <p className="text-sm text-danger">{noteForm.formState.errors.note.message}</p> : null}
                <button className="btn-secondary w-full" type="submit">
                  حفظ الملاحظة
                </button>
              </form>
            </section>
          ) : null}

          {allowedActions.can_send_manual_notification ? (
            <section className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink">إشعار يدوي معتمد</h2>
                  <p className="mt-1 text-sm text-slate-600">يمكنك إرسال قالب إشعار معتمد فقط. لا يسمح بإرسال رسالة حرة من هذه الشاشة.</p>
                </div>
              </div>
              <form className="mt-5 space-y-4" onSubmit={manualNotificationForm.handleSubmit(handleManualNotification)}>
                <select className="field" {...manualNotificationForm.register('template_id', { required: 'اختر القالب' })}>
                  <option value="">اختر قالب الإشعار</option>
                  {templates.map((template) => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.title_ar}
                    </option>
                  ))}
                </select>
                {manualNotificationForm.formState.errors.template_id ? <p className="text-sm text-danger">{manualNotificationForm.formState.errors.template_id.message}</p> : null}
                <button className="btn-secondary w-full" type="submit">
                  إرسال الإشعار
                </button>
              </form>
            </section>
          ) : null}

          {allowedActions.can_reject ? (
            <button className="btn-secondary w-full border-red-200 text-danger hover:bg-red-50" onClick={handleReject} type="button">
              <XCircle className="h-4 w-4" />
              رفض الطلب
            </button>
          ) : null}

          {message ? <p className={`text-sm ${messageTone === 'danger' ? 'text-danger' : 'text-success'}`}>{message}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default EmployeeOrderReviewPage

