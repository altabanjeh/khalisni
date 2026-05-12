export const PUBLIC_SITE_REFRESH_EVENT = 'public-site:refresh'
const PUBLIC_SITE_REFRESH_KEY = 'public-site:refresh-token'

export function broadcastPublicSiteUpdate(source = 'admin') {
  if (typeof window === 'undefined') return

  const detail = {
    source,
    timestamp: Date.now(),
  }

  window.dispatchEvent(new CustomEvent(PUBLIC_SITE_REFRESH_EVENT, { detail }))

  try {
    window.localStorage.setItem(PUBLIC_SITE_REFRESH_KEY, String(detail.timestamp))
  } catch {
    // Ignore storage failures in private mode or restricted browsers.
  }
}

export function subscribePublicSiteUpdates(callback) {
  if (typeof window === 'undefined') return () => {}

  const handleRefresh = (event) => {
    callback(event?.detail || null)
  }

  const handleStorage = (event) => {
    if (event.key !== PUBLIC_SITE_REFRESH_KEY || !event.newValue) return
    callback({
      source: 'storage',
      timestamp: Number(event.newValue),
    })
  }

  window.addEventListener(PUBLIC_SITE_REFRESH_EVENT, handleRefresh)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(PUBLIC_SITE_REFRESH_EVENT, handleRefresh)
    window.removeEventListener('storage', handleStorage)
  }
}
