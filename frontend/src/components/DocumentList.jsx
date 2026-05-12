import { useState } from 'react'
import { api } from '../api/services'
import { buildQuery } from '../api/client'
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
  const [downloading, setDownloading] = useState({})

  async function handleAuthenticatedDownload(document) {
    if (downloading[document.id]) return
    setDownloading((prev) => ({ ...prev, [document.id]: true }))
    try {
      const blob = await api.downloadDocumentWithToken(document.id)
      triggerBlobDownload(blob, document.original_filename)
    } catch {
      // Fallback: open the download URL in a new tab if token fetch fails.
      window.open(document.download_url, '_blank', 'noreferrer')
    } finally {
      setDownloading((prev) => ({ ...prev, [document.id]: false }))
    }
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
            <div>
              <p className="font-semibold text-ink">{document.original_filename}</p>
              <p className="mt-1 text-xs text-slate-500">{document.document_type}</p>
            </div>
            <div className="flex items-center gap-3">
              {document.status ? <StatusBadge status={document.status} /> : null}
              {isAnonymousMode ? (
                <a className="btn-secondary px-4 py-2 text-xs" href={anonymousUrl}>
                  تنزيل
                </a>
              ) : (
                <button
                  className="btn-secondary px-4 py-2 text-xs disabled:opacity-60"
                  disabled={downloading[document.id]}
                  onClick={() => handleAuthenticatedDownload(document)}
                  type="button"
                >
                  {downloading[document.id] ? '...' : 'تنزيل'}
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
