/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredAuth,
  getStoredAccessToken,
  getStoredAuthMode,
  getStoredRefreshToken,
  storeAuthTokens,
  AUTH_STORAGE_MODE_LOCAL,
} from '../api/client'
import { api } from '../api/services'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadMe() {
      if (!getStoredAccessToken() && !getStoredRefreshToken()) {
        if (mounted) setLoading(false)
        return
      }

      try {
        const me = await api.me()
        if (mounted) setUser(me)
      } catch {
        if (mounted) setUser(null)
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

  useEffect(() => {
    // Another tab signed in or out with a remembered login. This tab shares
    // that storage, so its screen must not keep showing the previous account
    // while requests go out under the new one.
    function handleStorage(event) {
      if (event.storageArea !== localStorage) return
      if (event.key !== null && event.key !== ACCESS_TOKEN_KEY && event.key !== REFRESH_TOKEN_KEY) return
      if (event.key === ACCESS_TOKEN_KEY && event.oldValue && event.newValue && user) {
        // Same account refreshing its access token in another tab is not a switch.
        api.me().then((me) => {
          if (me?.id !== user.id) window.location.reload()
        }).catch(() => setUser(null))
        return
      }
      if (getStoredAuthMode() !== AUTH_STORAGE_MODE_LOCAL) return
      window.location.reload()
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [user])

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
