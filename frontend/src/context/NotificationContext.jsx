/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/services'

const NotificationContext = createContext(null)

export function NotificationProvider({ children, user }) {
  const { pathname } = useLocation()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestEpoch = useRef(0)
  const userId = user?.id ?? user?.user_id ?? null

  const refresh = useCallback(async () => {
    const epoch = ++requestEpoch.current
    if (!userId) {
      setNotifications([])
      return []
    }
    setLoading(true)
    try {
      const next = await api.getNotificationCenter()
      if (epoch === requestEpoch.current) {
        setNotifications(Array.isArray(next) ? next : [])
        setError(null)
      }
      return next
    } catch (failure) {
      if (epoch === requestEpoch.current) setError(failure)
      throw failure
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let active = true
    const epoch = ++requestEpoch.current
    if (!userId) {
      setNotifications([])
      return undefined
    }
    api.getNotificationCenter()
      .then((next) => {
        if (active && epoch === requestEpoch.current) {
          setNotifications(Array.isArray(next) ? next : [])
          setError(null)
        }
      })
      .catch((failure) => { if (active && epoch === requestEpoch.current) setError(failure) })
    return () => { active = false }
  }, [userId, pathname])

  useEffect(() => {
    if (!userId) return undefined
    const onFocus = () => { refresh().catch(() => null) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh, userId])

  const markRead = useCallback(async (id) => {
    await api.markNotificationRead(id)
    requestEpoch.current += 1
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item))
  }, [])

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead()
    requestEpoch.current += 1
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }, [])

  const value = useMemo(() => ({ notifications, loading, error, refresh, markRead, markAllRead }),
    [notifications, loading, error, refresh, markRead, markAllRead])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotifications must be used within NotificationProvider')
  return context
}
