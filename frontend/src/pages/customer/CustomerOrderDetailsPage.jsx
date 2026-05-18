import { FileText, MessageSquare, Star, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DocumentList from '../../components/DocumentList'
import FileUploader from '../../components/FileUploader'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderTimeline from '../../components/OrderTimeline'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
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

function MetricCard({ label, value }) {
  return (
    <div className="panel-muted p-4">
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
        <div>
          <h2 className="text-xl font-bold text-ink">{title}</h2>
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
  const [confirmCancel, setConfirmCancel] = useState(false)
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

  if (loading || !order) return <LoadingSpinner />

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
      toast('تم رفع الوثيقة بنجاح.', 'success')
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError: uploadForm.setError,
        fallbackField: 'root.server',
      })
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleRating(values) {
    try {
      await api.submitRating(id, values)
      reload()
      toast('تم إرسال التقييم بنجاح.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  async function handleCancel() {
    setConfirmCancel(false)
    try {
      await api.cancelCustomerOrder(id, { reason: 'تم إلغاء الطلب من جهة العميل.' })
      reload()
      toast('تم إلغاء الطلب.', 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="عرض واضح لحالة الطلب الحالية، الوثائق المرفوعة، والخطوات التي تحتاج إلى تنفيذها من جهتك."
        eyebrow="تفاصيل الطلب"
        icon={FileText}
        title={order.order_number}
      />

      {allowedActions.can_view_missing_documents_form ? (
        <div className="glass-panel border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-bold text-amber-900">هذا الطلب يحتاج إلى مستندات إضافية منك</p>
              <p className="mt-1 text-sm text-amber-800">ارفع النواقص المطلوبة حتى يعود الطلب إلى مسار التنفيذ دون تأخير.</p>
            </div>
            <Link className="btn-primary" to={`/customer/orders/${order.id}/missing-docs`}>
              <UploadCloud className="h-4 w-4" />
              فتح شاشة النواقص
            </Link>
          </div>
        </div>
      ) : null}

      <section className="glass-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="الخدمة" value={order.service?.name_ar || 'غير محددة'} />
          <MetricCard label="المدينة" value={order.city || 'غير محددة'} />
          <MetricCard label="التسليم المتوقع" value={formatDate(order.expected_delivery_date)} />
          <MetricCard label="السعر النهائي" value={formatCurrency(order.final_price)} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <div className="space-y-6">
          <SectionCard
            icon={FileText}
            title="الوثائق المرفوعة"
            description="جميع الملفات التي أرفقتها لهذا الطلب مع حالة كل مستند."
          >
            <DocumentList documents={order.documents || []} />
          </SectionCard>

          <SectionCard
            icon={MessageSquare}
            title="الخط الزمني"
            description="تسلسل كامل لتحديثات الطلب من إنشاء الطلب حتى آخر إجراء مسجل."
          >
            <OrderTimeline items={order.status_logs || []} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={MessageSquare}
            title="ملاحظاتك"
            description="أي ملاحظة أدخلتها عند إنشاء الطلب أو أثناء المتابعة تظهر هنا."
          >
            <div className="rounded-3xl border border-border bg-white p-4 text-sm leading-7 text-slate-600">
              {order.customer_notes || 'لا توجد ملاحظات مسجلة على هذا الطلب.'}
            </div>
          </SectionCard>

          {allowedActions.can_view_missing_documents_form && allowedActions.can_upload_customer_document ? (
            <SectionCard
              icon={UploadCloud}
              title="رفع وثيقة سريعة"
              description="إذا كنت تعرف نوع المستند المطلوب، يمكنك رفعه مباشرة من هذه الشاشة."
            >
              <form className="space-y-4" onSubmit={uploadForm.handleSubmit(handleUpload)}>
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
            </SectionCard>
          ) : null}

          {allowedActions.can_submit_rating ? (
            <SectionCard
              icon={Star}
              title="تقييم الخدمة"
              description="يساعدنا تقييمك في تحسين جودة التنفيذ ومتابعة أداء المزوّد."
            >
              <form className="space-y-4" onSubmit={ratingForm.handleSubmit(handleRating)}>
                <input
                  className="field"
                  max="5"
                  min="1"
                  placeholder="التقييم من 1 إلى 5"
                  type="number"
                  {...ratingForm.register('score', { required: true })}
                />
                <textarea className="field min-h-24" placeholder="تعليقك" {...ratingForm.register('comment')} />
                <button className="btn-primary w-full" type="submit">
                  إرسال التقييم
                </button>
              </form>
            </SectionCard>
          ) : null}

          {allowedActions.can_cancel ? (
            <button className="btn-danger w-full" onClick={() => setConfirmCancel(true)} type="button">
              إلغاء الطلب
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        confirmLabel="نعم، ألغِ الطلب"
        description="سيتم إلغاء الطلب نهائياً. هل تريد المتابعة؟"
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        open={confirmCancel}
        title="تأكيد إلغاء الطلب"
        variant="danger"
      />
    </div>
  )
}

export default CustomerOrderDetailsPage
