import { Building2, FileText, FolderCheck, MessageSquare, UploadCloud } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import DocumentList from '../../components/DocumentList'
import FileUploader from '../../components/FileUploader'
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
import { buildAcceptValue, buildUploadHint, validateSingleFileList } from '../../utils/serviceForms'

function Panel({ icon: Icon, title, description, children }) {
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

function ProviderOrderDetailsPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const { data: order, loading, error, reload } = useAsyncData(() => api.getProviderOrder(id), [id], null)
  const statusForm = useForm()
  const noteForm = useForm()
  const uploadForm = useForm({ defaultValues: { document_type: 'FINAL_RESULT', verification_note: '' } })

  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{getDisplayError(error)}</div>
  if (loading || !order) return <LoadingSpinner />

  const allowedActions = getOrderAllowedActions(order)
  const transitions = allowedActions.available_status_transitions || []
  const canUploadFinal = allowedActions.can_upload_final_document
  const canNote = allowedActions.can_add_internal_note

  async function handleStatus(values) {
    try {
      await api.providerChangeStatus(id, values)
      statusForm.reset({ status: values.status, note: '' })
      reload()
      toast(isArabic ? 'تم تحديث حالة التنفيذ.' : 'Processing status updated.', 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleNote(values) {
    try {
      await api.providerAddNote(id, values)
      noteForm.reset({ note: '' })
      reload()
      toast(isArabic ? 'تمت إضافة الملاحظة الداخلية.' : 'Internal note added.', 'success')
    } catch (e) { toast(getDisplayError(e), 'error') }
  }
  async function handleUpload(values) {
    uploadForm.clearErrors('root.server')
    const formData = new FormData()
    formData.append('document_type', values.document_type || 'FINAL_RESULT')
    formData.append('file', values.file[0])
    formData.append('verification_note', values.verification_note || '')
    try {
      await api.providerUploadFinal(id, formData)
      uploadForm.reset({ document_type: 'FINAL_RESULT', verification_note: '' })
      reload()
      toast(isArabic ? 'تم رفع الوثيقة النهائية.' : 'Final document uploaded.', 'success')
    } catch (e) {
      const message = getDisplayError(e)
      uploadForm.setError('root.server', { type: 'server', message })
      toast(message, 'error')
    }
  }

  const meta = [
    { label: isArabic ? 'الخدمة' : 'Service', value: order.service ? getServiceName(order.service, language) : (isArabic ? 'غير محددة' : 'Not set') },
    { label: isArabic ? 'العميل' : 'Customer', value: order.customer?.full_name || (isArabic ? 'غير متاح' : 'Unavailable') },
    { label: isArabic ? 'المدينة' : 'City', value: order.city || (isArabic ? 'غير محددة' : 'Not set') },
    { label: isArabic ? 'التسليم المتوقع' : 'Expected delivery', value: formatDate(order.expected_delivery_date, language) },
  ]

  return (
    <div className="space-y-6">
      {/* identity band */}
      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{isArabic ? 'تنفيذ الطلب' : 'Request processing'}</p>
            <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
              <Building2 className="me-2 inline h-6 w-6 text-brand-600" />#{order.order_number}
            </h1>
          </div>
          <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-4 py-3 text-start">
            <p className="text-xs font-bold text-slate-500">{isArabic ? 'الحالة الحالية' : 'Current status'}</p>
            <div className="mt-1.5"><StatusBadge status={order.status} /></div>
          </div>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {meta.map((row) => (
            <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 p-3" key={row.label}>
              <dt className="text-xs font-bold text-slate-500">{row.label}</dt>
              <dd className="mt-1 truncate text-sm font-black text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Panel icon={FileText} title={isArabic ? 'مستندات الطلب' : 'Request documents'} description={isArabic ? 'راجع ملفّات الطلب والمرفقات قبل إرسال النتيجة.' : 'Review the request files and attachments before sending the result.'}>
            <DocumentList documents={order.documents || []} />
          </Panel>
          <Panel icon={MessageSquare} title={isArabic ? 'سجل التنفيذ' : 'Processing history'} description={isArabic ? 'سجل زمني لكل تحديثات التنفيذ.' : 'A timeline of every processing update.'}>
            <OrderTimeline items={order.status_logs || []} />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel icon={FolderCheck} title={isArabic ? 'تحديث الحالة' : 'Update status'} description={isArabic ? 'حدّث الحالة فقط عندما تكون المرحلة التالية جاهزة فعلاً.' : 'Only update the status when the next stage is genuinely ready.'}>
            <form className="space-y-3" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <label className="block text-sm font-bold text-ink" htmlFor="provider-status">{isArabic ? 'حالة التنفيذ' : 'Processing status'}</label>
              <select className="field" id="provider-status" {...statusForm.register('status')}>
                {!transitions.length ? <option value="">{isArabic ? 'لا توجد حالة انتقال متاحة حالياً' : 'No status transition available right now'}</option> : null}
                {transitions.map((value) => <option key={value} value={value}>{getStatusLabel(value, language)}</option>)}
              </select>
              <textarea aria-label={isArabic ? 'ملاحظة التحديث' : 'Update note'} className="field min-h-20" placeholder={isArabic ? 'ملاحظة تقدم أو تحديث داخلي' : 'A progress or internal update note'} {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!transitions.length} type="submit">{isArabic ? 'تحديث الحالة' : 'Update status'}</button>
            </form>

            {canNote ? (
              <form className="mt-5 space-y-3 border-t border-border pt-5" onSubmit={noteForm.handleSubmit(handleNote)}>
                <label className="block text-sm font-bold text-ink" htmlFor="provider-note">{isArabic ? 'ملاحظة داخلية' : 'Internal note'}</label>
                <textarea className="field min-h-20" id="provider-note" placeholder={isArabic ? 'ملاحظة داخلية للفريق' : 'An internal note for the team'} {...noteForm.register('note')} />
                <button className="btn-secondary w-full" type="submit">{isArabic ? 'إضافة ملاحظة' : 'Add note'}</button>
              </form>
            ) : null}
          </Panel>

          <Panel icon={UploadCloud} title={isArabic ? 'رفع النتيجة النهائية' : 'Upload the final result'} description={isArabic ? 'ارفع الملف النهائي المعتمد عند اكتمال التنفيذ؛ سيتحول الطلب إلى المراجعة الداخلية.' : 'Upload the approved final file once processing is done; the request moves to internal review.'}>
            <form className="space-y-3" onSubmit={uploadForm.handleSubmit(handleUpload)}>
              <input type="hidden" {...uploadForm.register('document_type')} />
              <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-4 py-3 text-sm text-slate-600">
                {isArabic ? 'نوع الوثيقة النهائية' : 'Final document type'}: <span className="font-black text-ink">FINAL_RESULT</span>
              </div>
              <FileUploader
                accept={buildAcceptValue()}
                error={uploadForm.formState.errors.file}
                hint={buildUploadHint()}
                label={isArabic ? 'الملف النهائي' : 'Final file'}
                registration={uploadForm.register('file', { validate: (fileList) => validateSingleFileList(fileList, null, isArabic ? 'الملف النهائي مطلوب' : 'The final file is required') })}
              />
              <textarea aria-label={isArabic ? 'ملاحظة التسليم' : 'Delivery note'} className="field min-h-20" placeholder={isArabic ? 'ملاحظة التحقق أو التسليم' : 'A verification or delivery note'} {...uploadForm.register('verification_note')} />
              {uploadForm.formState.errors.root?.server ? <p className="text-sm font-bold text-danger" role="alert">{uploadForm.formState.errors.root.server.message}</p> : null}
              <button className="btn-primary w-full" disabled={!canUploadFinal} type="submit">{isArabic ? 'رفع النتيجة' : 'Upload result'}</button>
              {!canUploadFinal ? (
                <p className="text-xs font-semibold text-slate-500">{isArabic ? 'لا يمكن رفع النتيجة النهائية قبل السماح بذلك من مسار الطلب الحالي.' : 'The final result cannot be uploaded until the current workflow stage allows it.'}</p>
              ) : null}
            </form>
          </Panel>
        </div>
      </div>
    </div>
  )
}

export default ProviderOrderDetailsPage
