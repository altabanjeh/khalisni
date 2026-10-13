import { useState } from 'react'
import { api } from '../api/services'
import { buildQuery, getDisplayError } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import { useToast } from '../context/ToastContext'
import StatusBadge from './StatusBadge'
import { findRequiredDocument, getRequiredDocumentLabel } from '../utils/serviceForms'

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename || 'document'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function DocumentList({ documents = [], orderNumber, phone, variant = 'default', requiredDocuments = [], staff = false }) {
  const { isArabic, language } = useLanguage()
  const { toast } = useToast()

  // Customers see the configured document name, never the internal type code.
  function documentLabel(document) {
    if (document.is_final_document) return isArabic ? 'النتيجة النهائية' : 'Final result'
    const requirement = findRequiredDocument(requiredDocuments, document.document_type)
    if (requirement) return getRequiredDocumentLabel(requirement, language)
    if (staff) return document.document_type
    return isArabic ? 'مستند مرفوع' : 'Uploaded document'
  }
  const [downloading, setDownloading] = useState({})
  const isPublic = variant === 'public'

  async function handleAuthenticatedDownload(document) {
    if (downloading[document.id]) return
    setDownloading((prev) => ({ ...prev, [document.id]: true }))
    try {
      const blob = await api.downloadDocumentWithToken(document.id)
      triggerBlobDownload(blob, document.original_filename)
    } catch (downloadError) {
      // Never fall back to opening the raw API URL: without the token it shows
      // an error page. Say what went wrong and let the user try again.
      const reason = downloadError?.response ? '' : ` ${getDisplayError(downloadError)}`
      toast(`${isArabic ? 'تعذر تنزيل الملف. حاول مرة أخرى.' : 'The file could not be downloaded. Please try again.'}${reason}`, 'error')
    } finally {
      setDownloading((prev) => ({ ...prev, [document.id]: false }))
    }
  }

  if (!documents.length) {
    return (
      <div className={isPublic
        ? 'rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-white px-5 py-6 text-sm font-semibold text-slate-500'
        : 'rounded-3xl border border-dashed border-border bg-white/100 px-5 py-6 text-sm text-slate-500'}
      >
        {isArabic ? 'لا توجد مستندات مرفوعة لهذا الطلب حتى الآن.' : 'No uploaded documents are available for this order yet.'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documents.map((document) => {
        const isAnonymousMode = Boolean(orderNumber && phone)
        const anonymousUrl = isAnonymousMode
          ? `${document.download_url}${buildQuery({ order_number: orderNumber, phone })}`
          : null

        return (
          <div key={document.id} className={isPublic
            ? 'flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white px-4 py-4 shadow-sm'
            : 'flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-white px-4 py-4'}
          >
            <div className="min-w-0 flex-1">
              <p className={isPublic ? 'font-semibold text-ink' : 'font-semibold text-ink'}>{document.original_filename}</p>
              <p className={isPublic ? 'mt-1 text-xs text-slate-500' : 'mt-1 text-xs text-slate-500'}>{documentLabel(document)}</p>
            </div>
            <div className="flex items-center gap-3">
              {document.status ? <StatusBadge status={document.status} /> : null}
              {isAnonymousMode ? (
                <a
                  className={isPublic
                    ? 'inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-xs font-extrabold text-[var(--khalsni-public-text)] transition hover:bg-[var(--khalsni-public-bg-secondary)]'
                    : 'btn-secondary px-4 py-2 text-xs'}
                  href={anonymousUrl}
                >
                  {isArabic ? 'تنزيل' : 'Download'}
                </a>
              ) : (
                <button
                  className={isPublic
                    ? 'inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-xs font-extrabold text-[var(--khalsni-public-text)] transition hover:bg-[var(--khalsni-public-bg-secondary)] disabled:opacity-60'
                    : 'btn-secondary px-4 py-2 text-xs disabled:opacity-60'}
                  disabled={downloading[document.id]}
                  onClick={() => handleAuthenticatedDownload(document)}
                  type="button"
                >
                  {downloading[document.id]
                    ? isArabic
                      ? 'جار التنزيل...'
                      : 'Downloading...'
                    : isArabic
                      ? 'تنزيل'
                      : 'Download'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DocumentList
