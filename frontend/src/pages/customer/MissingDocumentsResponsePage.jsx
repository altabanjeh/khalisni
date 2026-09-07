import { AlertTriangle, CheckCircle2, CircleAlert, Info, UploadCloud } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import FileUploader from '../../components/FileUploader'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import {
  applyServerFieldErrors,
  buildAcceptValue,
  buildUploadHint,
  findRequiredDocument,
  getRequiredDocumentLabel,
  validateSingleFileList,
} from '../../utils/serviceForms'

const SUBMIT_BTN_AR = 'رفع المستندات وإعادة الإرسال'

function MissingDocumentsResponsePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { isArabic } = useLanguage()
  const { data: order, loading } = useAsyncData(() => api.getCustomerOrder(id), [id], null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm()
  const { data: serviceDetails } = useAsyncData(
    () => (order?.service?.slug ? api.getService(order.service.slug) : Promise.resolve(null)),
    [order?.service?.slug],
    null,
  )

  if (loading) return <LoadingSpinner />

  if (!order) {
    return <EmptyState description={isArabic ? 'تعذر العثور على الطلب المطلوب.' : 'The requested order could not be found.'} title={isArabic ? 'الطلب غير متاح' : 'Order not available'} />
  }

  const allowedActions = getOrderAllowedActions(order)
  const requestedDocuments = order.missing_document_types || []
  const customerNotes = order.notes?.filter((note) => note.visibility === 'CUSTOMER') || []
  const requiredDocuments = serviceDetails?.required_documents || []
  const existingDocs = order.documents || []

  if (!allowedActions.can_view_missing_documents_form) {
    return (
      <EmptyState
        description={isArabic ? 'تُستخدم هذه الشاشة فقط عندما تكون حالة الطلب بانتظار مستندات من العميل.' : 'This screen is only used when the request is waiting for documents from you.'}
        icon={CircleAlert}
        title={isArabic ? 'لا توجد مستندات ناقصة حالياً' : 'No missing documents right now'}
      />
    )
  }

  function docState(type) {
    const doc = existingDocs.find((d) => (d.document_type || d.type) === type)
    if (!doc) return null
    return String(doc.status || doc.verification_status || 'pending_review')
  }

  const values = watch()
  const total = requestedDocuments.length
  const provided = requestedDocuments.filter((_, index) => values[`file_${index}`]?.length).length

  async function onSubmit(formValues) {
    clearErrors('root.server')
    try {
      for (let index = 0; index < requestedDocuments.length; index += 1) {
        const file = formValues[`file_${index}`]?.[0]
        if (!file) continue
        const formData = new FormData()
        formData.append('document_type', requestedDocuments[index])
        formData.append('file', file)
        await api.uploadCustomerDocument(id, formData)
      }
      toast(isArabic ? 'تم رفع المستندات وإعادة إرسال الطلب للمراجعة.' : 'Documents uploaded and the request was resubmitted for review.', 'success')
      navigate(`/customer/orders/${id}`)
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError,
        documents: requestedDocuments,
        fallbackField: 'root.server',
        fieldNameForDocumentIndex: (index) => `file_${index}`,
      })
      toast(getDisplayError(submitError), 'error')
    }
  }

  return (
    <div className="space-y-6">
      {/* header band */}
      <section className="overflow-hidden rounded-[var(--radius-xl)] border-2 border-amber-300 bg-amber-50 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-amber-200 bg-amber-100/60 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-400 text-amber-950">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-black text-amber-950 sm:text-xl">
                {isArabic ? `مستندات ناقصة — الطلب ${order.order_number}` : `Missing documents — request ${order.order_number}`}
              </h1>
              <p className="text-xs font-semibold text-amber-900">
                {isArabic ? 'ارفع كل مستند مطلوب لإعادة الطلب إلى مسار التنفيذ.' : 'Upload every requested document to send the request back for processing.'}
              </p>
            </div>
          </div>
          <StatusBadge status={order.status} />
        </div>
        {customerNotes.length ? (
          <div className="px-5 py-4 sm:px-6">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-amber-900">
              <Info className="h-4 w-4" />
              {isArabic ? 'ملاحظة الفريق' : 'Note from the team'}
            </p>
            <div className="mt-2 space-y-1 text-sm font-semibold leading-7 text-amber-900">
              {customerNotes.map((note) => <p key={note.id}>{note.note}</p>)}
            </div>
          </div>
        ) : null}
      </section>

      {/* progress */}
      <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 text-sm font-bold shadow-soft">
        <span className="text-slate-500">{isArabic ? 'الاكتمال' : 'Completion'}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-brand-50">
          <span className="block h-full rounded-full bg-brand-500 transition-all" style={{ width: total ? `${(provided / total) * 100}%` : '0%' }} />
        </span>
        <span className="text-ink">{provided} / {total}</span>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {requestedDocuments.map((documentType, index) => {
          const requirement = findRequiredDocument(requiredDocuments, documentType)
          const label = getRequiredDocumentLabel(requirement) || getRequiredDocumentLabel(documentType) || documentType
          const state = docState(documentType)
          const providedNow = values[`file_${index}`]?.length

          return (
            <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft" key={documentType}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className={providedNow ? 'grid h-10 w-10 place-items-center rounded-full bg-green-100 text-green-700' : 'grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700'}>
                    {providedNow ? <CheckCircle2 className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                  </span>
                  <div>
                    <h2 className="text-base font-black text-ink">{label}</h2>
                    <p className="text-xs font-semibold text-slate-500">{buildUploadHint(requirement)}</p>
                  </div>
                </div>
                {state && !providedNow ? <StatusBadge status={state} /> : null}
                {providedNow ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                    {isArabic ? 'جاهز للإرسال' : 'Ready to submit'}
                  </span>
                ) : null}
              </div>
              <div className="mt-4">
                <FileUploader
                  accept={buildAcceptValue(requirement)}
                  error={errors[`file_${index}`]}
                  hint={buildUploadHint(requirement)}
                  registration={register(`file_${index}`, {
                    validate: (fileList) => validateSingleFileList(fileList, requirement, isArabic ? 'هذا المستند مطلوب قبل إعادة الإرسال' : 'This document is required before resubmitting'),
                  })}
                />
              </div>
            </section>
          )
        })}

        {errors.root?.server ? <p className="text-sm font-bold text-danger" role="alert">{errors.root.server.message}</p> : null}

        <div className="sticky bottom-2 z-10 flex justify-end rounded-[var(--radius-xl)] border border-border bg-card/95 p-3 shadow-soft backdrop-blur">
          <button className="btn-primary" disabled={isSubmitting} type="submit">
            <UploadCloud className="h-4 w-4" />
            {isSubmitting
              ? (isArabic ? 'جارٍ الرفع...' : 'Uploading...')
              : isArabic ? SUBMIT_BTN_AR : 'Upload documents & resubmit'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default MissingDocumentsResponsePage
