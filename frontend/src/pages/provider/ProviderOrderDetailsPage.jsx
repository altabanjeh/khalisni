import { FolderCheck, MessageSquare, ShieldCheck, UploadCloud } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import DocumentList from '../../components/DocumentList'
import FileUploader from '../../components/FileUploader'
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
import { buildAcceptValue, buildUploadHint, validateSingleFileList } from '../../utils/serviceForms'

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

function ProviderOrderDetailsPage() {
  const { id } = useParams()
  const { toast } = useToast()
  const { data: order, loading, error, reload } = useAsyncData(() => api.getProviderOrder(id), [id], null)
  useRegisterPageHelp({ workflowStatus: order?.status || '' })
  const statusForm = useForm()
  const noteForm = useForm()
  const uploadForm = useForm({
    defaultValues: {
      document_type: 'FINAL_RESULT',
      verification_note: '',
    },
  })

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  }

  if (loading || !order) return <LoadingSpinner />

  const allowedActions = getOrderAllowedActions(order)
  const availableStatusTransitions = allowedActions.available_status_transitions || []
  const canUploadFinal = allowedActions.can_upload_final_document

  async function handleStatus(values) {
    try {
      await api.providerChangeStatus(id, values)
      reload()
      toast('تم تحديث حالة التنفيذ.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleNote(values) {
    try {
      await api.providerAddNote(id, values)
      reload()
      toast('تمت إضافة الملاحظة الداخلية.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleUpload(values) {
    uploadForm.clearErrors('root.server')

    const formData = new FormData()
    formData.append('document_type', values.document_type || 'FINAL_RESULT')
    formData.append('file', values.file[0])
    formData.append('verification_note', values.verification_note || '')

    try {
      await api.providerUploadFinal(id, formData)
      reload()
      toast('تم رفع الوثيقة النهائية.', 'success')
    } catch (submitError) {
      const errorMessage = getDisplayError(submitError)
      uploadForm.setError('root.server', { type: 'server', message: errorMessage })
      toast(errorMessage, 'error')
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="نفّذ الطلب من شاشة واحدة واضحة: راجع المستندات، حدّث حالة التنفيذ، أضف ملاحظات داخلية، ثم ارفع النتيجة النهائية."
        eyebrow="تفاصيل تنفيذ الطلب"
        icon={FolderCheck}
        title={order.order_number}
      />

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="الخدمة" value={order.service?.name_ar || 'غير محددة'} />
          <MetricCard label="العميل" value={order.customer?.full_name || 'غير متاح'} hint={order.city || 'غير محددة'} />
          <MetricCard label="التسليم المتوقع" value={formatDate(order.expected_delivery_date)} />
          <MetricCard label="الحالة الحالية" value={getStatusLabel(order.status)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <SectionCard
            icon={ShieldCheck}
            title="المستندات المتاحة"
            description="راجع ملفّات الطلب والمرفقات الحالية قبل إرسال النتيجة النهائية."
          >
            <DocumentList documents={order.documents || []} />
          </SectionCard>

          <SectionCard
            icon={MessageSquare}
            title="تقدم التنفيذ"
            description="سجل زمني واضح لكل تحديثات التنفيذ على الطلب."
          >
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={FolderCheck}
            title="إدارة التنفيذ"
            description="حدّث الحالة فقط عندما تكون المرحلة التالية جاهزة فعلاً."
          >
            <form className="space-y-4" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <select className="field" {...statusForm.register('status')}>
                {!availableStatusTransitions.length ? <option value="">لا توجد حالة انتقال متاحة حالياً</option> : null}
                {availableStatusTransitions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {getStatusLabel(statusValue)}
                  </option>
                ))}
              </select>
              <textarea className="field min-h-24" placeholder="ملاحظة تقدم أو تحديث داخلي" {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!availableStatusTransitions.length} type="submit">
                تحديث الحالة
              </button>
            </form>

            {allowedActions.can_add_internal_note ? (
              <form className="mt-5 space-y-4 border-t border-border pt-5" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea className="field min-h-24" placeholder="ملاحظة داخلية" {...noteForm.register('note')} />
                <button className="btn-secondary w-full" type="submit">
                  إضافة ملاحظة
                </button>
              </form>
            ) : null}
          </SectionCard>

          <SectionCard
            icon={UploadCloud}
            title="رفع النتيجة النهائية"
            description="ارفع الملف النهائي المعتمد فقط عند اكتمال التنفيذ، وسيتم تحويل الطلب إلى مرحلة المراجعة الداخلية."
          >
            <form className="space-y-4" onSubmit={uploadForm.handleSubmit(handleUpload)}>
              <input type="hidden" {...uploadForm.register('document_type')} />
              <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                نوع الوثيقة النهائية: <span className="font-semibold text-ink">FINAL_RESULT</span>
              </div>
              <FileUploader
                accept={buildAcceptValue()}
                error={uploadForm.formState.errors.file}
                hint={buildUploadHint()}
                label="الملف النهائي"
                registration={uploadForm.register('file', {
                  validate: (fileList) => validateSingleFileList(fileList, null, 'الملف النهائي مطلوب'),
                })}
              />
              <textarea
                className="field min-h-24"
                placeholder="ملاحظة التحقق أو التسليم"
                {...uploadForm.register('verification_note')}
              />
              {uploadForm.formState.errors.root?.server ? (
                <p className="text-sm text-danger">{uploadForm.formState.errors.root.server.message}</p>
              ) : null}
              <button className="btn-primary w-full" disabled={!canUploadFinal} type="submit">
                رفع النتيجة
              </button>
              {!canUploadFinal ? (
                <p className="text-sm text-slate-500">لا يمكن رفع النتيجة النهائية قبل السماح بذلك من مسار الطلب الحالي.</p>
              ) : null}
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default ProviderOrderDetailsPage
