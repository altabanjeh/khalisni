import { FolderCheck, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import DocumentList from '../../components/DocumentList'
import FileUploader from '../../components/FileUploader'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getOrderAllowedActions } from '../../utils/authz'
import { formatDate, getStatusLabel } from '../../utils/format'
import { buildAcceptValue, buildUploadHint, validateSingleFileList } from '../../utils/serviceForms'

function ProviderOrderDetailsPage() {
  const { id } = useParams()
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('success')
  const { data: order, loading, error, reload } = useAsyncData(() => api.getProviderOrder(id), [id], null)
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

  if (loading || !order) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل تفاصيل الطلب...</div>
  }

  const allowedActions = getOrderAllowedActions(order)
  const availableStatusTransitions = allowedActions.available_status_transitions || []
  const canUploadFinal = allowedActions.can_upload_final_document

  async function handleStatus(values) {
    try {
      await api.providerChangeStatus(id, values)
      reload()
      setMessageTone('success')
      setMessage('تم تحديث حالة التنفيذ.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleNote(values) {
    try {
      await api.providerAddNote(id, values)
      reload()
      setMessageTone('success')
      setMessage('تمت إضافة الملاحظة الداخلية.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
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
      setMessageTone('success')
      setMessage('تم رفع الوثيقة النهائية.')
    } catch (submitError) {
      const errorMessage = getDisplayError(submitError)
      uploadForm.setError('root.server', { type: 'server', message: errorMessage })
      setMessageTone('danger')
      setMessage(errorMessage)
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="نفّذ الطلب من خلال تحديث الحالة، إضافة ملاحظات داخلية، ثم رفع النتيجة النهائية للمراجعة."
        eyebrow="تفاصيل تنفيذ الطلب"
        icon={FolderCheck}
        title={order.order_number}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">الخدمة</p>
                <p className="mt-2 font-bold text-ink">{order.service?.name_ar}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">العميل</p>
                <p className="mt-2 font-bold text-ink">{order.customer?.full_name}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">الموعد المتوقع</p>
                <p className="mt-2 font-bold text-ink">{formatDate(order.expected_delivery_date)}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">الوثائق المتاحة</h2>
            <div className="mt-5">
              <DocumentList documents={order.documents || []} />
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">تقدم التنفيذ</h2>
            <div className="mt-5">
              <OrderTimeline items={order.status_logs || []} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">إجراءات التنفيذ</h2>
            <form className="mt-5 space-y-4" onSubmit={statusForm.handleSubmit(handleStatus)}>
              <select className="field" {...statusForm.register('status')}>
                {availableStatusTransitions.length ? null : <option value="">لا توجد حالة انتقال متاحة حالياً</option>}
                {availableStatusTransitions.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {getStatusLabel(statusValue)}
                  </option>
                ))}
              </select>
              <textarea className="field min-h-24" placeholder="ملاحظة تقدم" {...statusForm.register('note')} />
              <button className="btn-secondary w-full" disabled={!availableStatusTransitions.length} type="submit">
                تحديث الحالة
              </button>
            </form>

            {allowedActions.can_add_internal_note ? (
              <form className="mt-6 space-y-4" onSubmit={noteForm.handleSubmit(handleNote)}>
                <textarea className="field min-h-24" placeholder="ملاحظة داخلية" {...noteForm.register('note')} />
                <button className="btn-secondary w-full" type="submit">
                  إضافة ملاحظة
                </button>
              </form>
            ) : null}
          </section>

          <section className="glass-panel p-6">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <UploadCloud className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">رفع النتيجة النهائية</h2>
                <p className="mt-1 text-sm text-slate-600">سيتم تحويل الطلب إلى حالة جاهز للتسليم بعد رفع الملف النهائي المسموح.</p>
              </div>
            </div>
            <form className="mt-5 space-y-4" onSubmit={uploadForm.handleSubmit(handleUpload)}>
              <input type="hidden" {...uploadForm.register('document_type')} />
              <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">نوع الوثيقة: FINAL_RESULT</div>
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
                <p className="text-sm text-slate-500">لا يمكن رفع النتيجة النهائية إلا عندما يسمح backend بهذا الإجراء.</p>
              ) : null}
            </form>
          </section>

          {message ? <p className={`text-sm ${messageTone === 'danger' ? 'text-danger' : 'text-success'}`}>{message}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default ProviderOrderDetailsPage
