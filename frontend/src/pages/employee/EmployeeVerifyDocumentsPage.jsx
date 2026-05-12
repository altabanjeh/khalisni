import { Eye, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

function getErrorMessage(error) {
  const detail = error?.response?.data
  if (typeof detail === 'string') return detail
  if (detail?.detail) return detail.detail
  if (detail && typeof detail === 'object') {
    return Object.entries(detail)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join(' | ')
  }
  return 'تعذر تنفيذ العملية.'
}

function EmployeeVerifyDocumentsPage() {
  const [searchParams] = useSearchParams()
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [message, setMessage] = useState('')
  const verifyForm = useForm()
  const orderId = searchParams.get('order')
  const { data: documents = [], loading, error, setData: setDocuments, reload } = useAsyncData(
    () => api.getStaffDocuments(orderId ? { order: orderId } : {}),
    [orderId],
    [],
  )

  const selectedDocument = documents.find((document) => document.id === selectedDocumentId) || documents[0] || null
  const [tokenizedUrl, setTokenizedUrl] = useState(null)

  useEffect(() => {
    if (!selectedDocument?.id || !selectedDocument?.download_url) {
      setTokenizedUrl(null)
      return
    }
    let cancelled = false
    api.getDownloadToken(selectedDocument.id).then(({ token }) => {
      if (!cancelled) setTokenizedUrl(`${selectedDocument.download_url}?token=${encodeURIComponent(token)}`)
    }).catch(() => {
      if (!cancelled) setTokenizedUrl(null)
    })
    return () => { cancelled = true }
  }, [selectedDocument?.id, selectedDocument?.download_url])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل الوثائق...</div>
  }

  if (error) {
    return <EmptyState description={getErrorMessage(error)} title="تعذر تحميل الوثائق" />
  }

  if (!selectedDocument) {
    return <EmptyState description="لا توجد وثائق بانتظار التحقق حالياً." title="قائمة التحقق فارغة" />
  }

  async function submitVerification(isVerified) {
    try {
      const note = verifyForm.getValues('note')
      const verifiedDocument = await api.verifyStaffDocument(selectedDocument.id, { is_verified: isVerified, note })
      setDocuments((current) =>
        current.map((document) =>
          document.id === selectedDocument.id ? { ...document, ...verifiedDocument } : document,
        ),
      )
      reload()
      setMessage(isVerified ? 'تم اعتماد الوثيقة.' : 'تم رفض الوثيقة وطلب استبدالها.')
    } catch (submitError) {
      setMessage(getErrorMessage(submitError))
    }
  }

  const isImage = (selectedDocument.mime_type || '').startsWith('image/')
  const isPdf = (selectedDocument.mime_type || '').includes('pdf')

  return (
    <div className="page-section">
      <PageHeader
        description="راجع الوثائق التي ما زالت بانتظار التحقق، ثم اعتمدها أو ارفضها مع سبب واضح حتى تبقى المراجعة قابلة للتتبع."
        eyebrow="التحقق من الوثائق"
        icon={ShieldCheck}
        title="مراجعة الوثائق"
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-3">
          {documents.map((document) => (
            <button
              key={document.id}
              className={`w-full rounded-3xl border px-4 py-4 text-right transition ${
                selectedDocument.id === document.id ? 'border-brand-400 bg-brand-50' : 'border-border bg-white hover:bg-brand-50'
              }`}
              onClick={() => setSelectedDocumentId(document.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">{document.original_filename}</p>
                  <p className="mt-1 text-xs text-slate-500">{document.order?.order_number}</p>
                </div>
                <StatusBadge status={document.status} />
              </div>
            </button>
          ))}
        </aside>

        <section className="glass-panel p-6">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="panel-muted flex min-h-72 flex-col overflow-hidden p-4 text-center">
              {isImage && tokenizedUrl ? (
                <img alt={selectedDocument.original_filename} className="h-full w-full rounded-2xl object-contain" src={tokenizedUrl} />
              ) : null}
              {isPdf && tokenizedUrl ? (
                <iframe className="min-h-72 w-full rounded-2xl border border-border bg-white" src={tokenizedUrl} title={selectedDocument.original_filename} />
              ) : null}
              {!isImage && !isPdf ? (
                <div className="flex min-h-72 flex-col items-center justify-center">
                  <span className="icon-chip mb-4">
                    <Eye className="h-5 w-5" />
                  </span>
                  <p className="font-bold text-ink">{selectedDocument.original_filename}</p>
                  <p className="mt-2 text-sm text-slate-600">لا توجد معاينة مباشرة لهذا النوع من الملفات. استخدم زر التنزيل لفتح الوثيقة.</p>
                </div>
              ) : null}
            </div>

            <div>
              <h2 className="text-xl font-bold text-ink">{selectedDocument.document_type}</h2>
              <p className="mt-2 text-sm text-slate-600">الطلب: {selectedDocument.order?.order_number}</p>
              <div className="mt-4 space-y-2 rounded-3xl border border-border bg-white p-4 text-sm text-slate-700">
                <p>الخدمة: {selectedDocument.order?.service_name || 'غير محدد'}</p>
                <p>رفع بواسطة: {selectedDocument.uploaded_by_name || selectedDocument.uploaded_by_role || 'غير محدد'}</p>
                <p>تاريخ الرفع: {formatDateTime(selectedDocument.created_at)}</p>
                {selectedDocument.verified_by_name ? <p>آخر تحقق بواسطة: {selectedDocument.verified_by_name}</p> : null}
                {selectedDocument.verified_at ? <p>تاريخ آخر تحقق: {formatDateTime(selectedDocument.verified_at)}</p> : null}
                {selectedDocument.rejection_reason ? <p>سبب الرفض السابق: {selectedDocument.rejection_reason}</p> : null}
                {selectedDocument.verification_note ? <p>ملاحظة التحقق السابقة: {selectedDocument.verification_note}</p> : null}
              </div>
              <a className="btn-secondary mt-4 inline-flex" href={tokenizedUrl || selectedDocument.download_url} rel="noreferrer" target="_blank">
                تنزيل أو فتح الوثيقة
              </a>
              <div className="mt-5 space-y-3 rounded-3xl border border-border bg-brand-50/40 p-4 text-sm text-slate-700">
                <p>1. تأكد من وضوح المستند ومطابقته لنوع الخدمة.</p>
                <p>2. استخدم الرفض فقط عند وجود نقص جوهري أو ملف غير صالح.</p>
                <p>3. دوّن سبباً واضحاً عند طلب الاستبدال حتى يتمكن العميل أو المزود من التصحيح.</p>
              </div>

              <form className="mt-5 space-y-4">
                <textarea
                  className="field min-h-28"
                  placeholder="أضف ملاحظة داخلية عند الاعتماد أو سبباً واضحاً عند طلب الاستبدال"
                  {...verifyForm.register('note')}
                />
              </form>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <button className="btn-primary" onClick={() => submitVerification(true)} type="button">
                  <ShieldCheck className="h-4 w-4" />
                  اعتماد الوثيقة
                </button>
                <button
                  className="btn-secondary border-red-200 text-danger hover:bg-red-50"
                  onClick={() => submitVerification(false)}
                  type="button"
                >
                  <XCircle className="h-4 w-4" />
                  رفض الوثيقة وطلب استبدالها
                </button>
              </div>
              {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default EmployeeVerifyDocumentsPage
