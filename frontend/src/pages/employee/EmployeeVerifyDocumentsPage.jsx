import { CheckCircle2, Download, Eye, FileText, ShieldCheck, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import EmptyState from '../../components/EmptyState'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

function EmployeeVerifyDocumentsPage() {
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const { isArabic, language } = useLanguage()
  const [selectedDocumentId, setSelectedDocumentId] = useState(null)
  const [tokenizedUrl, setTokenizedUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const verifyForm = useForm({ defaultValues: { note: '' } })
  const orderId = searchParams.get('order')

  const { data: documents = [], loading, error, setData: setDocuments, reload } = useAsyncData(
    () => api.getStaffDocuments(orderId ? { order: orderId } : {}),
    [orderId],
    [],
  )

  const selectedDocument = documents.find((d) => d.id === selectedDocumentId) || documents[0] || null

  useEffect(() => {
    if (!selectedDocument?.id || !selectedDocument?.download_url) {
      setTokenizedUrl(null)
      return undefined
    }
    let cancelled = false
    api.getDownloadToken(selectedDocument.id)
      .then(({ token }) => { if (!cancelled) setTokenizedUrl(`${selectedDocument.download_url}?token=${encodeURIComponent(token)}`) })
      .catch(() => { if (!cancelled) setTokenizedUrl(null) })
    return () => { cancelled = true }
  }, [selectedDocument?.id, selectedDocument?.download_url])

  if (loading) return <LoadingSpinner />
  if (error) return <EmptyState description={getDisplayError(error)} title={isArabic ? 'تعذر تحميل الوثائق' : 'Could not load documents'} />
  if (!selectedDocument) {
    return <EmptyState icon={ShieldCheck} description={isArabic ? 'لا توجد وثائق بانتظار التحقق حالياً.' : 'No documents are waiting for verification right now.'} title={isArabic ? 'قائمة التحقق فارغة' : 'Verification queue is empty'} />
  }

  async function submitVerification(isVerified) {
    const note = verifyForm.getValues('note').trim()
    if (!isVerified && !note) {
      verifyForm.setError('note', { message: isArabic ? 'سبب الرفض مطلوب.' : 'A rejection reason is required.' })
      return
    }
    setBusy(true)
    try {
      const updated = await api.verifyStaffDocument(selectedDocument.id, { is_verified: isVerified, note })
      setDocuments((current) => current.map((d) => (d.id === selectedDocument.id ? { ...d, ...updated } : d)))
      verifyForm.reset({ note: '' })
      reload()
      toast(isVerified ? (isArabic ? 'تم اعتماد الوثيقة.' : 'Document approved.') : (isArabic ? 'تم رفض الوثيقة وطلب استبدالها.' : 'Document rejected — replacement requested.'), 'success')
    } catch (submitError) {
      toast(getDisplayError(submitError), 'error')
    } finally {
      setBusy(false)
    }
  }

  const mime = selectedDocument.mime_type || ''
  const isImage = mime.startsWith('image/')
  const isPdf = mime.includes('pdf')
  const pending = documents.filter((d) => ['pending_review', 'uploaded', 'PENDING', 'SUBMITTED'].includes(String(d.status))).length

  const meta = [
    { label: isArabic ? 'الطلب' : 'Request', value: selectedDocument.order?.order_number },
    { label: isArabic ? 'الخدمة' : 'Service', value: selectedDocument.order?.service_name || (isArabic ? 'غير محدد' : 'Not set') },
    { label: isArabic ? 'العميل' : 'Customer', value: selectedDocument.order?.customer_name || selectedDocument.uploaded_by_name || '—' },
    { label: isArabic ? 'نوع المستند' : 'Document type', value: selectedDocument.document_type },
    { label: isArabic ? 'اسم الملف' : 'File name', value: selectedDocument.original_filename },
    { label: isArabic ? 'رفع بواسطة' : 'Uploaded by', value: selectedDocument.uploaded_by_name || selectedDocument.uploaded_by_role || '—' },
    { label: isArabic ? 'تاريخ الرفع' : 'Uploaded at', value: formatDateTime(selectedDocument.created_at, language) },
  ]
  if (selectedDocument.rejection_reason) meta.push({ label: isArabic ? 'سبب رفض سابق' : 'Previous rejection', value: selectedDocument.rejection_reason })

  return (
    <div className="space-y-6">
      <header className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{isArabic ? 'العمليات' : 'Operations'}</p>
        <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
          <ShieldCheck className="me-2 inline h-6 w-6 text-brand-600" />
          {isArabic ? 'التحقق من الوثائق' : 'Document verification'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">
          {isArabic
            ? 'راجع كل ملف مرفوع، تحقق من وضوحه ومطابقته لنوع الخدمة، ثم اعتمده أو ارفضه بسبب واضح.'
            : 'Review each uploaded file, confirm it is legible and matches the service, then approve or reject it with a clear reason.'}
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        {/* queue */}
        <aside className="space-y-2">
          <p className="px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            {isArabic ? `بانتظار التحقق (${pending})` : `Awaiting review (${pending})`}
          </p>
          {documents.map((document) => (
            <button
              className={`kh-focusable w-full rounded-[var(--radius-lg)] border p-3 text-start transition ${
                selectedDocument.id === document.id ? 'border-brand-400 bg-brand-50' : 'border-border bg-card hover:bg-brand-50'
              }`}
              key={document.id}
              onClick={() => setSelectedDocumentId(document.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-black text-ink">{document.original_filename}</p>
                <StatusBadge status={document.status} />
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                #{document.order?.order_number} · {document.document_type}
              </p>
            </button>
          ))}
        </aside>

        {/* workspace */}
        <section className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          {/* preview */}
          <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-slate-50 p-4">
            {isImage && tokenizedUrl ? (
              <img alt={selectedDocument.original_filename} className="h-full w-full rounded-[var(--radius-lg)] object-contain" src={tokenizedUrl} />
            ) : isPdf && tokenizedUrl ? (
              <iframe className="min-h-[24rem] w-full rounded-[var(--radius-lg)] border border-border bg-white" src={tokenizedUrl} title={selectedDocument.original_filename} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Eye className="h-6 w-6" /></span>
                <p className="mt-3 font-black text-ink">{selectedDocument.original_filename}</p>
                <p className="mt-1 max-w-xs text-sm font-semibold text-slate-500">
                  {isArabic ? 'لا توجد معاينة مباشرة لهذا النوع. نزّل الملف لفتحه.' : 'No inline preview for this type. Download the file to open it.'}
                </p>
              </div>
            )}
            <a
              className="btn-secondary mt-4 self-start"
              href={tokenizedUrl || selectedDocument.download_url}
              rel="noreferrer"
              target="_blank"
            >
              <Download className="h-4 w-4" />
              {isArabic ? 'تنزيل / فتح' : 'Download / open'}
            </a>
          </div>

          {/* metadata + actions */}
          <div className="space-y-4">
            <div className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-soft">
              <h2 className="flex items-center gap-2 text-sm font-black text-ink">
                <FileText className="h-4 w-4 text-brand-600" />
                {isArabic ? 'تفاصيل الوثيقة' : 'Document details'}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                {meta.map((row) => (
                  <div className="flex justify-between gap-3" key={row.label}>
                    <dt className="shrink-0 font-bold text-slate-500">{row.label}</dt>
                    <dd className="min-w-0 truncate text-end font-bold text-ink">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-soft">
              <h2 className="text-sm font-black text-ink">{isArabic ? 'قرار التحقق' : 'Verification decision'}</h2>
              <textarea
                aria-label={isArabic ? 'ملاحظة التحقق' : 'Verification note'}
                className="field mt-3 min-h-24"
                placeholder={isArabic ? 'ملاحظة داخلية عند الاعتماد، أو سبب واضح عند الرفض' : 'Internal note on approval, or a clear reason on rejection'}
                {...verifyForm.register('note')}
              />
              {verifyForm.formState.errors.note ? (
                <p className="mt-1 text-xs font-bold text-danger" role="alert">{verifyForm.formState.errors.note.message}</p>
              ) : null}
              <div className="mt-3 grid gap-2">
                <button className="btn-primary" disabled={busy} onClick={() => submitVerification(true)} type="button">
                  <CheckCircle2 className="h-4 w-4" />
                  {isArabic ? 'اعتماد الوثيقة' : 'Approve document'}
                </button>
                <button className="btn-secondary border-red-200 text-danger hover:bg-red-50" disabled={busy} onClick={() => submitVerification(false)} type="button">
                  <XCircle className="h-4 w-4" />
                  {isArabic ? 'رفض وطلب استبدال' : 'Reject & request replacement'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default EmployeeVerifyDocumentsPage
