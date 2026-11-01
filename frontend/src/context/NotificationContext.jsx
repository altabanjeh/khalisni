/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/services'

const NotificationContext = createContext(null)

// Accepts a paged response ({results, hasNext}) or a plain list.
function normalizePage(response) {
  if (Array.isArray(response)) return { results: response, hasNext: false, count: response.length }
  const results = Array.isArray(response?.results) ? response.results : []
  return { results, hasNext: Boolean(response?.hasNext), count: Number(response?.count ?? results.length) }
}

function mergeById(current, incoming) {
  const seen = new Set(current.map((item) => item.id))
  return [...current, ...incoming.filter((item) => !seen.has(item.id))]
}

// F01 latent / DEF-C05: the bell no longer reads only the first 20 rows. The
// unread badge comes from the server count (GET /notifications/unread-count/)
// and further pages are loaded on demand ("load more").
export function NotificationProvider({ children, user }) {
  const { pathname } = useLocation()
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [serverUnread, setServerUnread] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const requestEpoch = useRef(0)
  const userId = user?.id ?? user?.user_id ?? null

  const loadFirstPage = useCallback(async (epoch) => {
    const [pageResult, unreadResult] = await Promise.allSettled([
      api.getNotificationCenterPage({ page: 1 }),
      api.getNotificationUnreadCount(),
    ])
    if (epoch !== requestEpoch.current) return null
    if (unreadResult.status === 'fulfilled' && Number.isFinite(Number(unreadResult.value))) {
      setServerUnread(Number(unreadResult.value))
    }
    if (pageResult.status === 'rejected') throw pageResult.reason
    const { results, hasNext } = normalizePage(pageResult.value)
    setNotifications(results)
    setPage(1)
    setHasMore(hasNext)
    setError(null)
    return results
  }, [])

  const reset = useCallback(() => {
    setNotifications([])
    setServerUnread(null)
    setHasMore(false)
    setPage(1)
  }, [])

  const refresh = useCallback(async () => {
    const epoch = ++requestEpoch.current
    if (!userId) {
      reset()
      return []
    }
    setLoading(true)
    try {
      return (await loadFirstPage(epoch)) || []
    } catch (failure) {
      if (epoch === requestEpoch.current) setError(failure)
      throw failure
    } finally {
      setLoading(false)
    }
  }, [loadFirstPage, reset, userId])

  useEffect(() => {
    const epoch = ++requestEpoch.current
    if (!userId) {
      reset()
      return undefined
    }
    loadFirstPage(epoch).catch((failure) => { if (epoch === requestEpoch.current) setError(failure) })
    return undefined
  }, [loadFirstPage, reset, userId, pathname])

  useEffect(() => {
    if (!userId) return undefined
    const onFocus = () => { refresh().catch(() => null) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh, userId])

  const loadMore = useCallback(async () => {
    if (!userId || !hasMore || loadingMore) return []
    const epoch = requestEpoch.current
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const { results, hasNext } = normalizePage(await api.getNotificationCenterPage({ page: nextPage }))
      if (epoch !== requestEpoch.current) return []
      setNotifications((current) => mergeById(current, results))
      setPage(nextPage)
      setHasMore(hasNext)
      return results
    } finally {
      setLoadingMore(false)
    }
  }, [hasMore, loadingMore, page, userId])

  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const markRead = useCallback(async (id) => {
    await api.markNotificationRead(id)
    requestEpoch.current += 1
    const wasUnread = notificationsRef.current.some((item) => item.id === id && !item.is_read)
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, is_read: true } : item)))
    if (wasUnread) setServerUnread((count) => (count == null ? count : Math.max(0, count - 1)))
  }, [])

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead()
    requestEpoch.current += 1
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    setServerUnread(0)
  }, [])

  // The server counts every unread row, not only the loaded pages; the loaded
  // rows can only raise it (e.g. a count fetched a moment earlier).
  const localUnread = notifications.filter((item) => !item.is_read).length
  const unreadCount = Math.max(serverUnread ?? 0, localUnread)

  const value = useMemo(() => ({
    notifications, loading, loadingMore, error, hasMore, unreadCount, refresh, loadMore, markRead, markAllRead,
  }), [notifications, loading, loadingMore, error, hasMore, unreadCount, refresh, loadMore, markRead, markAllRead])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
