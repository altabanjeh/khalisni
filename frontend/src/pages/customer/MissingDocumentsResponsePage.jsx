import { CircleAlert, UploadCloud } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import FileUploader from '../../components/FileUploader'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getOrderAllowedActions } from '../../utils/authz'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  applyServerFieldErrors,
  buildAcceptValue,
  buildUploadHint,
  findRequiredDocument,
  getRequiredDocumentLabel,
  validateSingleFileList,
} from '../../utils/serviceForms'

function MissingDocumentsResponsePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const { data: order, loading } = useAsyncData(() => api.getCustomerOrder(id), [id], null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm()
  const { data: serviceDetails } = useAsyncData(
    () => (order?.service?.slug ? api.getService(order.service.slug) : Promise.resolve(null)),
    [order?.service?.slug],
    null,
  )

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل الطلب...</div>
  }

  if (!order) {
    return <EmptyState description="تعذر العثور على الطلب المطلوب." title="الطلب غير متاح" />
  }

  const allowedActions = getOrderAllowedActions(order)
  const requestedDocuments = order.missing_document_types || []
  const customerNotes = order.notes?.filter((note) => note.visibility === 'CUSTOMER') || []
  const requiredDocuments = serviceDetails?.required_documents || []

  if (!allowedActions.can_view_missing_documents_form) {
    return (
      <EmptyState
        description="هذه الشاشة تُستخدم فقط عندما تكون حالة الطلب بانتظار مستندات من العميل."
        icon={CircleAlert}
        title="لا توجد مستندات ناقصة حالياً"
      />
    )
  }

  async function onSubmit(values) {
    clearErrors('root.server')

    try {
      for (let index = 0; index < requestedDocuments.length; index += 1) {
        const file = values[`file_${index}`]?.[0]
        const formData = new FormData()
        formData.append('document_type', requestedDocuments[index])
        formData.append('file', file)
        await api.uploadCustomerDocument(id, formData)
      }

      setMessage('تم رفع المستندات الناقصة وإعادة إرسال الطلب للمراجعة.')
      navigate(`/customer/orders/${id}`)
    } catch (submitError) {
      applyServerFieldErrors({
        error: submitError,
        setError,
        documents: requestedDocuments,
        fallbackField: 'root.server',
        fieldNameForDocumentIndex: (index) => `file_${index}`,
      })
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        badge={<StatusBadge status={order.status} />}
        description="ارفع كل مستند مطلوب في بطاقة مستقلة. لن يتم تفعيل زر الإرسال إلا بعد استكمال كل العناصر المطلوبة."
        eyebrow="استكمال الطلب"
        icon={CircleAlert}
        title={`مستندات ناقصة للطلب ${order.order_number}`}
      />

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {customerNotes.length ? (
          <section className="glass-panel border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            {customerNotes.map((note) => (
              <p key={note.id} className="leading-7">
                {note.note}
              </p>
            ))}
          </section>
        ) : null}

        {requestedDocuments.map((documentType, index) => {
          const requirement = findRequiredDocument(requiredDocuments, documentType)
          const label = getRequiredDocumentLabel(requirement) || getRequiredDocumentLabel(documentType)

          return (
            <section key={documentType} className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <UploadCloud className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-ink">{label}</h2>
                  <p className="mt-1 text-sm text-slate-600">{buildUploadHint(requirement)}</p>
                </div>
              </div>
              <div className="mt-5">
                <FileUploader
                  accept={buildAcceptValue(requirement)}
                  error={errors[`file_${index}`]}
                  hint={buildUploadHint(requirement)}
                  label={label}
                  registration={register(`file_${index}`, {
                    validate: (fileList) => validateSingleFileList(fileList, requirement, 'هذا المستند مطلوب قبل إعادة الإرسال'),
                  })}
                />
              </div>
            </section>
          )
        })}

        {errors.root?.server ? <p className="text-sm text-danger">{errors.root.server.message}</p> : null}

        <div className="sticky bottom-4 flex justify-start">
          <button className="btn-primary" disabled={isSubmitting} type="submit">
            <UploadCloud className="h-4 w-4" />
            {isSubmitting ? 'جارٍ الرفع...' : 'رفع المستندات وإعادة الإرسال'}
          </button>
        </div>

        {message ? <p className="text-sm text-success">{message}</p> : null}
      </form>
    </div>
  )
}

export default MissingDocumentsResponsePage
