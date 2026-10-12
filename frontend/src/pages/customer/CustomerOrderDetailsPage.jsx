import { AlertTriangle, FileText, MessageSquare, Star, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import EmptyState from '../../components/EmptyState'
import FileUploader from '../../components/FileUploader'
import InlineHelp, { HelpLabel } from '../../components/InlineHelp'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError, isStaleActionError } from '../../api/client'
import { useRegisterPageHelp } from '../../context/HelpGuideContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { useExclusiveAction } from '../../hooks/useExclusiveAction'
import { getOrderAllowedActions } from '../../utils/authz'
import { formatCurrency, formatDate } from '../../utils/format'
import {
  applyServerFieldErrors,
  buildAcceptValue,
  buildUploadHint,
  findRequiredDocument,
  getRequiredDocumentLabel,
  validateSingleFileList,
} from '../../utils/serviceForms'
import { getServiceName } from '../../utils/servicePresentation'

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 font-bold text-ink">{value}</p>
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
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function CustomerOrderDetailsPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const { busy, exclusive } = useExclusiveAction()
  const { data: order, loading, error, reload } = useAsyncData(() => api.getCustomerOrder(id), [id], null)
  const uploadForm = useForm({
    defaultValues: {
      document_type: '',
    },
  })
  const ratingForm = useForm()
  const { data: serviceDetails } = useAsyncData(
    () => (order?.service?.slug ? api.getService(order.service.slug) : Promise.resolve(null)),
    [order?.service?.slug],
    null,
  )
  useRegisterPageHelp({ workflowStatus: order?.status || '', serviceId: order?.service?.id || '' })

  if (loading) return <LoadingSpinner />
  if (error || !order) {
    return (
      <EmptyState
        action={<Link className="btn-secondary" to="/customer/orders">{tr('العودة إلى طلباتي', 'Back to my requests')}</Link>}
        description={error ? getDisplayError(error) : tr('تعذر العثور على الطلب المطلوب.', 'The requested order could not be found.')}
        title={tr('الطلب غير متاح', 'Request not available')}
      />
    )
  }

  const allowedActions = getOrderAllowedActions(order)
  const missingDocumentTypes = order.missing_document_types || []
  // The order carries the requirements that applied when it was created.
  const requiredDocuments = order.required_documents?.length ? order.required_documents : serviceDetails?.required_documents || []
  const selectedDocumentType = uploadForm.watch('document_type')
  const selectedRequirement = findRequiredDocument(requiredDocuments, selectedDocumentType)
  const customerActionRequired = allowedActions.can_view_missing_documents_form
  const isComplete = ['COMPLETED', 'DELIVERED', 'CLOSED'].includes(String(order.status || '').toUpperCase())
  const notSet = tr('غير محددة', 'Not set')
  const serviceName = order.service ? getServiceName(order.service, language) : notSet
  const responsibilityTitle = customerActionRequired
    ? tr('إجراء مطلوب منك', 'Action needed from you')
    : isComplete
      ? tr('الطلب مكتمل', 'Request completed')
      : tr('خلصني تعمل على طلبك', 'Khalsni is working on your request')
  const responsibilityText = customerActionRequired
    ? tr('راجع بطاقة الإجراء المطلوبة وارفع الوثائق أو أكمل المعلومات المتاحة في النظام.', 'Review the action card and upload the documents or complete the requested information.')
    : isComplete
      ? tr('تم إكمال مسار الطلب حسب الحالة الحالية في النظام.', 'This request has completed its workflow.')
      : tr('الفريق يتابع الطلب الآن، ولا يوجد إجراء مطلوب منك حالياً.', 'The team is handling the request. Nothing is needed from you right now.')

  async function handleUpload(values) {
    uploadForm.clearErrors('root.server')

    const formData = new FormData()
    formData.append('document_type', values.document_type)
    formData.append('file', values.file[0])

    try {
      await api.uploadCustomerDocument(id, formData)
      uploadForm.reset({ document_type: values.document_type })
      reload()
      toast(tr('تم رفع الوثيقة بنجاح.', 'Document uploaded.'), 'success')
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError: uploadForm.setError,
        knownFields: ['document_type', 'file'],
        fallbackField: 'root.server',
      })
      toast(getDisplayError(submitError), 'error')
      if (isStaleActionError(submitError)) reload()
    }
  }

  async function handleRating(values) {
    try {
      await api.submitRating(id, values)
      reload()
      toast(tr('تم إرسال التقييم بنجاح.', 'Rating submitted.'), 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
      if (isStaleActionError(submitError)) reload()
    }
  }

  async function handleCancel() {
    try {
      await api.cancelCustomerOrder(id, { reason: tr('تم إلغاء الطلب من جهة العميل.', 'Cancelled by the customer.') })
      setConfirmCancel(false)
      reload()
      toast(tr('تم إلغاء الطلب.', 'Request cancelled.'), 'success')
    } catch (submitError) {
      setConfirmCancel(false)
      toast(getDisplayError(submitError), 'error')
      if (isStaleActionError(submitError)) reload()
    }
  }

  return (
    <div className="page-section">
      <section className="rounded-[var(--radius-xl)] border border-border bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">{tr('حالة طلبك الآن', 'Your request right now')}</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-ink">{responsibilityTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{responsibilityText}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">
              {serviceName} · {order.city || tr('مدينة غير محددة', 'City not set')}
            </p>
            <p className="mt-2 text-xs font-bold text-slate-500">
              {tr('رقم الطلب', 'Request number')}: <bdi dir="ltr">{order.order_number}</bdi>
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4 text-ink">
            <p className="mb-3 text-xs font-bold text-slate-500">{tr('الحالة الحالية', 'Current status')}</p>
            <StatusBadge status={order.status} />
          </div>
        </div>
      </section>

      <section className={`rounded-[var(--radius-xl)] border p-5 shadow-soft ${customerActionRequired ? 'border-amber-200 bg-amber-50' : 'border-brand-100 bg-brand-50'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] ${customerActionRequired ? 'bg-amber-100 text-amber-700' : 'bg-white text-brand-600'}`}>
              {customerActionRequired ? <AlertTriangle className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            </span>
            <div>
              <p className={`font-extrabold ${customerActionRequired ? 'text-amber-900' : 'text-ink'}`}>{responsibilityTitle}</p>
              <p className={`mt-1 text-sm font-semibold leading-7 ${customerActionRequired ? 'text-amber-800' : 'text-slate-600'}`}>{responsibilityText}</p>
            </div>
          </div>
          {allowedActions.can_view_missing_documents_form ? (
            <Link className="btn-primary" to={`/customer/orders/${order.id}/missing-docs`}>
              <UploadCloud className="h-4 w-4" />
              {tr('رفع الوثائق المطلوبة', 'Upload the requested documents')}
            </Link>
          ) : null}
        </div>
      </section>

      {allowedActions.can_view_missing_documents_form ? (
        <div className="glass-panel border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-amber-900">{tr('هذا الطلب يحتاج إلى مستندات إضافية منك', 'This request needs additional documents from you')}</p>
              <p className="mt-1 text-sm text-amber-800">{tr('ارفع النواقص المطلوبة حتى يعود الطلب إلى مسار التنفيذ دون تأخير.', 'Upload the missing items so the request can continue without delay.')}</p>
            </div>
            <Link className="btn-primary" to={`/customer/orders/${order.id}/missing-docs`}>
              <UploadCloud className="h-4 w-4" />
              {tr('فتح شاشة النواقص', 'Open missing documents')}
            </Link>
            <InlineHelp actionKey="open_missing_documents" className="self-center" />
          </div>
        </div>
      ) : null}

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={tr('الخدمة', 'Service')} value={serviceName} />
          <MetricCard label={tr('المدينة', 'City')} value={order.city || notSet} />
          <MetricCard label={tr('التسليم المتوقع', 'Expected delivery')} value={formatDate(order.expected_delivery_date, language)} />
          <MetricCard label={tr('السعر النهائي', 'Final price')} value={formatCurrency(order.final_price, language)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <SectionCard
            icon={FileText}
            title={tr('الوثائق المرفوعة', 'Uploaded documents')}
            description={tr('جميع الملفات التي أرفقتها لهذا الطلب مع حالة كل مستند.', 'Every file attached to this request, with the status of each.')}
          >
            <DocumentList documents={order.documents || []} requiredDocuments={requiredDocuments} />
          </SectionCard>

          <SectionCard
            icon={MessageSquare}
            title={tr('الخط الزمني', 'Timeline')}
            description={tr('تسلسل كامل لتحديثات الطلب من إنشاء الطلب حتى آخر إجراء مسجل.', 'Every update to the request, from creation to the latest recorded step.')}
          >
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={MessageSquare}
            title={tr('ملاحظاتك', 'Your notes')}
            description={tr('أي ملاحظة أدخلتها عند إنشاء الطلب أو أثناء المتابعة تظهر هنا.', 'Any note you entered when creating or following the request appears here.')}
          >
            <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-4 text-sm leading-7 text-slate-600">
              {order.customer_notes ? <bdi>{order.customer_notes}</bdi> : tr('لا توجد ملاحظات مسجلة على هذا الطلب.', 'No notes are recorded on this request.')}
            </div>
          </SectionCard>

          {allowedActions.can_view_missing_documents_form && allowedActions.can_upload_customer_document ? (
            <SectionCard
              icon={UploadCloud}
              title={tr('رفع وثيقة سريعة', 'Quick document upload')}
              description={tr('إذا كنت تعرف نوع المستند المطلوب، يمكنك رفعه مباشرة من هذه الشاشة.', 'If you know which document is requested, you can upload it here.')}
            >
              <form className="space-y-4" onSubmit={uploadForm.handleSubmit(exclusive('upload', handleUpload))}>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="customer-upload-type">
                  <HelpLabel fieldKey="document_type">{tr('نوع الوثيقة', 'Document type')}</HelpLabel>
                </label>
                <select className="field" id="customer-upload-type" {...uploadForm.register('document_type', { required: tr('اختر نوع الوثيقة', 'Select the document type') })}>
                  <option value="">{tr('اختر نوع الوثيقة', 'Select the document type')}</option>
                  {missingDocumentTypes.map((item) => (
                    <option key={item} value={item}>
                      {getRequiredDocumentLabel(findRequiredDocument(requiredDocuments, item) || item, language)}
                    </option>
                  ))}
                </select>
                {uploadForm.formState.errors.document_type ? (
                  <p className="text-sm text-danger" role="alert">{uploadForm.formState.errors.document_type.message}</p>
                ) : null}

                <FileUploader
                  accept={buildAcceptValue(selectedRequirement)}
                  error={uploadForm.formState.errors.file}
                  hint={buildUploadHint(selectedRequirement, language)}
                  label={<HelpLabel fieldKey="file">{tr('الملف', 'File')}</HelpLabel>}
                  registration={uploadForm.register('file', {
                    validate: (fileList) => validateSingleFileList(fileList, selectedRequirement, tr('الملف مطلوب', 'A file is required'), language),
                  })}
                />

                {uploadForm.formState.errors.root?.server ? (
                  <p className="text-sm text-danger" role="alert">{uploadForm.formState.errors.root.server.message}</p>
                ) : null}

                <button className="btn-secondary w-full" disabled={Boolean(busy)} type="submit">
                  {busy === 'upload' ? tr('جارٍ الرفع...', 'Uploading...') : tr('رفع الوثيقة', 'Upload document')}
                </button>
                <InlineHelp actionKey="upload_customer_document" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_submit_rating ? (
            <SectionCard
              icon={Star}
              title={tr('تقييم الخدمة', 'Rate the service')}
              description={tr('يساعدنا تقييمك في تحسين جودة التنفيذ ومتابعة أداء المزوّد.', 'Your rating helps us improve quality and follow provider performance.')}
            >
              <form className="space-y-4" onSubmit={ratingForm.handleSubmit(exclusive('rating', handleRating))}>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="customer-rating-score">
                  <HelpLabel fieldKey="score">{tr('التقييم', 'Rating')}</HelpLabel>
                </label>
                <input
                  className="field"
                  id="customer-rating-score"
                  max="5"
                  min="1"
                  placeholder={tr('التقييم من 1 إلى 5', 'Rating from 1 to 5')}
                  type="number"
                  {...ratingForm.register('score', { required: true })}
                />
                <textarea aria-label={tr('تعليقك', 'Your comment')} className="field min-h-24" placeholder={tr('تعليقك', 'Your comment')} {...ratingForm.register('comment')} />
                <button className="btn-primary w-full" disabled={Boolean(busy)} type="submit">
                  {busy === 'rating' ? tr('جارٍ الإرسال...', 'Sending...') : tr('إرسال التقييم', 'Submit rating')}
                </button>
                <InlineHelp actionKey="submit_rating" className="mt-2" />
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_cancel ? (
            <div className="space-y-2">
              <button className="btn-danger w-full" disabled={Boolean(busy)} onClick={() => setConfirmCancel(true)} type="button">
                {tr('إلغاء الطلب', 'Cancel request')}
              </button>
              <InlineHelp actionKey="cancel_order" />
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel={tr('نعم، ألغِ الطلب', 'Yes, cancel it')}
        description={tr('سيتم إلغاء الطلب نهائياً. هل تريد المتابعة؟', 'The request will be cancelled permanently. Continue?')}
        loading={busy === 'cancel'}
        onClose={() => setConfirmCancel(false)}
        onConfirm={exclusive('cancel', handleCancel)}
        open={confirmCancel}
        title={tr('تأكيد إلغاء الطلب', 'Confirm cancellation')}
        variant="danger"
      />
    </div>
  )
}

export default CustomerOrderDetailsPage
