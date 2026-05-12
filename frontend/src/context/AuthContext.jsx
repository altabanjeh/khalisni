/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadMe() {
      try {
        const me = await api.me()
        if (mounted) setUser(me)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadMe()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    function handleAuthExpired() {
      setUser(null)
    }

    window.addEventListener('khalisni:auth-expired', handleAuthExpired)
    return () => window.removeEventListener('khalisni:auth-expired', handleAuthExpired)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(payload) {
        const result = await api.login(payload)
        sessionStorage.setItem('khalisni_access', result.access)
        sessionStorage.setItem('khalisni_refresh', result.refresh)
        setUser(result.user)
        return result.user
      },
      async logout() {
        const refresh = sessionStorage.getItem('khalisni_refresh')
        if (refresh) {
          await api.logout(refresh).catch(() => null)
        }
        sessionStorage.removeItem('khalisni_access')
        sessionStorage.removeItem('khalisni_refresh')
        setUser(null)
      },
      setUser,
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
