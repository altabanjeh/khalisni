/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
import { clearStoredOrderDrafts } from '../pages/customer/orderDrafts'

const ME_RETRY_DELAY_MS = 1500
const LOGOUT_TIMEOUT_MS = 10000

function hasStoredSession() {
  return Boolean(getStoredAccessToken() || getStoredRefreshToken())
}

// Only a refused session ends it. Offline, a timeout or a server fault says
// nothing about whether the stored tokens are still good.
function isSessionEndingError(error) {
  return error?.status === 401 || error?.response?.status === 401 || !hasStoredSession()
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // Set when the profile could not be loaded for a reason other than a refused
  // session, so the route guard can offer a retry instead of the login page.
  const [authError, setAuthError] = useState(null)
  const [loadToken, setLoadToken] = useState(0)
  const retryAuth = useCallback(() => {
    setAuthError(null)
    setLoading(true)
    setLoadToken((current) => current + 1)
  }, [])

  useEffect(() => {
    let mounted = true
    let retryTimer = null

    async function loadMe(attempt) {
      if (!hasStoredSession()) {
        if (mounted) setLoading(false)
        return
      }

      try {
        const me = await api.me()
        if (!mounted) return
        setUser(me)
        setAuthError(null)
        setLoading(false)
      } catch (error) {
        if (!mounted) return
        if (isSessionEndingError(error)) {
          setUser(null)
          setLoading(false)
          return
        }
        if (attempt === 0) {
          retryTimer = setTimeout(() => loadMe(1), ME_RETRY_DELAY_MS)
          return
        }
        setAuthError(error)
        setLoading(false)
      }
    }

    loadMe(0)

    return () => {
      mounted = false
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [loadToken])

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
        }).catch((error) => {
          if (isSessionEndingError(error)) setUser(null)
        })
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
      authError,
      retryAuth,
      async login(payload) {
        const { remember = false, ...credentials } = payload || {}
        const result = await api.login(credentials)
        storeAuthTokens({ access: result.access, refresh: result.refresh }, { persistent: remember })
        setAuthError(null)
        setUser(result.user)
        return result.user
      },
      async logout() {
        const refresh = getStoredRefreshToken()
        const access = getStoredAccessToken()
        // Sign out locally first: the screen must not wait on the network.
        clearStoredAuth({ notify: false })
        // Drafts hold the customer's national ID and phone number.
        clearStoredOrderDrafts()
        setAuthError(null)
        setUser(null)
        if (refresh) {
          // Best effort: revoke the refresh token on the server.
          api.logout(refresh, {
            timeout: LOGOUT_TIMEOUT_MS,
            headers: access ? { Authorization: `Bearer ${access}` } : undefined,
          }).catch(() => null)
        }
      },
      setUser,
    }),
    [authError, loading, retryAuth, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
