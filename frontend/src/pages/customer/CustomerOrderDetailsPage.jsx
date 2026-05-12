import { FileText, MessageSquare, Star, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import DocumentList from '../../components/DocumentList'
import FileUploader from '../../components/FileUploader'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'
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

function CustomerOrderDetailsPage() {
  const { id } = useParams()
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('success')
  const { data: order, loading, reload } = useAsyncData(() => api.getCustomerOrder(id), [id], null)
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

  if (loading || !order) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل تفاصيل الطلب...</div>
  }

  const allowedActions = getOrderAllowedActions(order)
  const missingDocumentTypes = order.missing_document_types || []
  const requiredDocuments = serviceDetails?.required_documents || []
  const selectedDocumentType = uploadForm.watch('document_type')
  const selectedRequirement = findRequiredDocument(requiredDocuments, selectedDocumentType)

  async function handleUpload(values) {
    uploadForm.clearErrors('root.server')

    const formData = new FormData()
    formData.append('document_type', values.document_type)
    formData.append('file', values.file[0])

    try {
      await api.uploadCustomerDocument(id, formData)
      uploadForm.reset({ document_type: values.document_type })
      reload()
      setMessageTone('success')
      setMessage('تم رفع الوثيقة بنجاح.')
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError: uploadForm.setError,
        fallbackField: 'root.server',
      })
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleRating(values) {
    try {
      await api.submitRating(id, values)
      reload()
      setMessageTone('success')
      setMessage('تم إرسال التقييم بنجاح.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  async function handleCancel() {
    try {
      await api.cancelCustomerOrder(id, { reason: 'تم إلغاء الطلب من جهة العميل.' })
      reload()
      setMessageTone('success')
      setMessage('تم إلغاء الطلب.')
    } catch (submitError) {
      setMessageTone('danger')
      setMessage(getDisplayError(submitError))
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="يعرض هذا القسم تفاصيل الطلب، الوثائق المرفوعة، والمسار الزمني الكامل للمعالجة."
        eyebrow="تفاصيل الطلب"
        icon={FileText}
        title={order.order_number}
      />

      {allowedActions.can_view_missing_documents_form ? (
        <div className="glass-panel border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-bold text-amber-900">هناك مستندات ناقصة مطلوبة منك</p>
              <p className="mt-1 text-sm text-amber-800">يمكنك رفعها من الشاشة المخصصة لضمان اكتمال الطلب.</p>
            </div>
            <Link className="btn-primary" to={`/customer/orders/${order.id}/missing-docs`}>
              <UploadCloud className="h-4 w-4" />
              رفع المستندات
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_0.65fr]">
        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">الخدمة</p>
                <p className="mt-2 font-bold text-ink">{order.service?.name_ar}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">المدينة</p>
                <p className="mt-2 font-bold text-ink">{order.city}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">التسليم المتوقع</p>
                <p className="mt-2 font-bold text-ink">{formatDate(order.expected_delivery_date)}</p>
              </div>
              <div className="panel-muted p-4">
                <p className="text-xs text-slate-500">السعر النهائي</p>
                <p className="mt-2 font-bold text-ink">{formatCurrency(order.final_price)}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">التسلسل الزمني</h2>
            <div className="mt-5">
              <OrderTimeline items={order.status_logs || []} />
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-ink">الوثائق المرفوعة</h2>
            <div className="mt-5">
              <DocumentList documents={order.documents || []} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">ملاحظاتك</h2>
                <p className="mt-2 text-sm text-slate-600">{order.customer_notes || 'لا توجد ملاحظات مسجلة.'}</p>
              </div>
            </div>
          </section>

          {allowedActions.can_cancel ? (
            <button className="btn-secondary w-full border-red-200 text-danger hover:bg-red-50" onClick={handleCancel} type="button">
              إلغاء الطلب
            </button>
          ) : null}

          {allowedActions.can_view_missing_documents_form && allowedActions.can_upload_customer_document ? (
            <section className="glass-panel p-6">
              <h2 className="text-xl font-bold text-ink">رفع وثيقة سريعة</h2>
              <form className="mt-5 space-y-4" onSubmit={uploadForm.handleSubmit(handleUpload)}>
                <select className="field" {...uploadForm.register('document_type', { required: 'اختر نوع الوثيقة' })}>
                  <option value="">اختر نوع الوثيقة</option>
                  {missingDocumentTypes.map((item) => {
                    const requirement = findRequiredDocument(requiredDocuments, item)

                    return (
                      <option key={item} value={item}>
                        {getRequiredDocumentLabel(requirement) || item}
                      </option>
                    )
                  })}
                </select>
                {uploadForm.formState.errors.document_type ? (
                  <p className="text-sm text-danger">{uploadForm.formState.errors.document_type.message}</p>
                ) : null}
                <FileUploader
                  accept={buildAcceptValue(selectedRequirement)}
                  error={uploadForm.formState.errors.file}
                  hint={buildUploadHint(selectedRequirement)}
                  label="الملف"
                  registration={uploadForm.register('file', {
                    validate: (fileList) => validateSingleFileList(fileList, selectedRequirement, 'الملف مطلوب'),
                  })}
                />
                {uploadForm.formState.errors.root?.server ? (
                  <p className="text-sm text-danger">{uploadForm.formState.errors.root.server.message}</p>
                ) : null}
                <button className="btn-secondary w-full" type="submit">
                  رفع الوثيقة
                </button>
              </form>
            </section>
          ) : null}

          {allowedActions.can_submit_rating ? (
            <section className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <Star className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ink">تقييم الخدمة</h2>
                  <p className="mt-2 text-sm text-slate-600">يساعدنا تقييمك في تحسين جودة التنفيذ.</p>
                </div>
              </div>
              <form className="mt-5 space-y-4" onSubmit={ratingForm.handleSubmit(handleRating)}>
                <input className="field" max="5" min="1" type="number" {...ratingForm.register('score', { required: true })} />
                <textarea className="field min-h-24" placeholder="تعليقك" {...ratingForm.register('comment')} />
                <button className="btn-primary w-full" type="submit">
                  إرسال التقييم
                </button>
              </form>
            </section>
          ) : null}

          {message ? <p className={`text-sm ${messageTone === 'danger' ? 'text-danger' : 'text-success'}`}>{message}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default CustomerOrderDetailsPage
