/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { clearStoredAuth, getStoredRefreshToken, storeAuthTokens } from '../api/client'
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
        const { remember = false, ...credentials } = payload || {}
        const result = await api.login(credentials)
        storeAuthTokens({ access: result.access, refresh: result.refresh }, { persistent: remember })
        setUser(result.user)
        return result.user
      },
      async logout() {
        const refresh = getStoredRefreshToken()
        if (refresh) {
          await api.logout(refresh).catch(() => null)
        }
        clearStoredAuth({ notify: false })
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
