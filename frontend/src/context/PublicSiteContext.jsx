/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/services'
import {
  fallbackHomepagePayload,
  fallbackPublicTheme,
  getPublicSiteCssVariables,
  mergeHomepagePayload,
  mergePublicTheme,
} from '../utils/publicSiteDefaults'
import { subscribePublicSiteUpdates } from '../utils/publicSiteSync'

const PublicSiteContext = createContext(null)

function setFavicon(href) {
  if (typeof document === 'undefined' || !href) return
  let favicon = document.querySelector("link[rel='icon']")
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.setAttribute('rel', 'icon')
    document.head.appendChild(favicon)
  }
  favicon.setAttribute('href', href)
}

export function PublicSiteProvider({ children }) {
  const [theme, setTheme] = useState(fallbackPublicTheme)
  const [homepage, setHomepage] = useState(fallbackHomepagePayload)
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let mounted = true

    async function loadPublicSite() {
      try {
        const [themeResult, homepageResult] = await Promise.allSettled([
          api.getPublicTheme(),
          api.getPublicHomepage(),
        ])

        if (!mounted) return

        if (themeResult.status === 'fulfilled') {
          setTheme(mergePublicTheme(themeResult.value))
        }

        if (homepageResult.status === 'fulfilled') {
          setHomepage(mergeHomepagePayload(homepageResult.value))
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPublicSite()

    return () => {
      mounted = false
    }
  }, [refreshToken])

  useEffect(() => subscribePublicSiteUpdates(() => setRefreshToken((current) => current + 1)), [])

  useEffect(() => {
    if (theme?.favicon_url) setFavicon(theme.favicon_url)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      homepage,
      content: homepage.content,
      advertisements: homepage.advertisements,
      importantAlert: homepage.important_alert,
      loading,
      refreshPublicSite: () => setRefreshToken((current) => current + 1),
    }),
    [theme, homepage, loading],
  )

  return (
    <PublicSiteContext.Provider value={value}>
      <div className="public-site-shell min-h-screen" style={getPublicSiteCssVariables(theme)}>
        {children}
      </div>
    </PublicSiteContext.Provider>
  )
}

export function usePublicSite() {
  const context = useContext(PublicSiteContext)
  if (!context) throw new Error('usePublicSite must be used within PublicSiteProvider')
  return context
}
