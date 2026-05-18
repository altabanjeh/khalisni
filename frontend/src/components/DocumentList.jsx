import { useState } from 'react'
import { api } from '../api/services'
import { buildQuery } from '../api/client'
import { useLanguage } from '../context/LanguageContext'
import StatusBadge from './StatusBadge'

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

function DocumentList({ documents = [], orderNumber, phone }) {
  const { isArabic } = useLanguage()
  const [downloading, setDownloading] = useState({})

  async function handleAuthenticatedDownload(document) {
    if (downloading[document.id]) return
    setDownloading((prev) => ({ ...prev, [document.id]: true }))
    try {
      const blob = await api.downloadDocumentWithToken(document.id)
      triggerBlobDownload(blob, document.original_filename)
    } catch {
      window.open(document.download_url, '_blank', 'noreferrer')
    } finally {
      setDownloading((prev) => ({ ...prev, [document.id]: false }))
    }
  }

  if (!documents.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/80 px-5 py-6 text-sm text-slate-500">
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
          <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-white px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink">{document.original_filename}</p>
              <p className="mt-1 text-xs text-slate-500">{document.document_type}</p>
            </div>
            <div className="flex items-center gap-3">
              {document.status ? <StatusBadge status={document.status} /> : null}
              {isAnonymousMode ? (
                <a className="btn-secondary px-4 py-2 text-xs" href={anonymousUrl}>
                  {isArabic ? 'تنزيل' : 'Download'}
                </a>
              ) : (
                <button
                  className="btn-secondary px-4 py-2 text-xs disabled:opacity-60"
                  disabled={downloading[document.id]}
                  onClick={() => handleAuthenticatedDownload(document)}
                  type="button"
                >
                  {downloading[document.id]
                    ? isArabic
                      ? 'جارٍ التنزيل...'
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
