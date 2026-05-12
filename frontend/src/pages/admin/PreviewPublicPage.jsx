import { Eye } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import PageHeader from '../../components/PageHeader'
import PublicHomepageTemplate from '../../components/publicSite/PublicHomepageTemplate'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  fallbackHomepagePayload,
  fallbackPublicTheme,
  getPublicSiteCssVariables,
  mergeHomepagePayload,
  mergePublicTheme,
} from '../../utils/publicSiteDefaults'
import { subscribePublicSiteUpdates } from '../../utils/publicSiteSync'

function PreviewPublicPage() {
  const { data: themeData, loading: themeLoading, reload: reloadTheme } = useAsyncData(() => api.getPublicTheme(), [], fallbackPublicTheme)
  const { data: homepageData, loading: homepageLoading, reload: reloadHomepage } = useAsyncData(() => api.getPublicHomepage(), [], fallbackHomepagePayload)
  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getServices(), [], [])

  const theme = useMemo(() => mergePublicTheme(themeData), [themeData])
  const homepage = useMemo(() => mergeHomepagePayload(homepageData), [homepageData])
  const featuredServices = services.filter((service) => service.is_featured).slice(0, 3)

  useEffect(() => {
    return subscribePublicSiteUpdates(() => {
      reloadTheme()
      reloadHomepage()
    })
  }, [reloadTheme, reloadHomepage])

  if (themeLoading && homepageLoading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل المعاينة...</div>
  }

  return (
    <div className="page-section">
      <PageHeader
        icon={Eye}
        title="Preview Public Page"
        eyebrow="PUBLIC SITE"
        description="هذه معاينة مباشرة للبيانات العامة القادمة من نفس API المستخدمة في الصفحة الرئيسية العامة."
      />

      <div className="overflow-hidden rounded-[2rem] border border-border" style={getPublicSiteCssVariables(theme)}>
        <div className="public-site-shell min-h-screen p-6">
          <PublicHomepageTemplate
            advertisements={homepage.advertisements}
            content={homepage.content}
            featuredServices={featuredServices}
            loadingServices={servicesLoading}
            previewMode
          />
        </div>
      </div>
    </div>
  )
}

export default PreviewPublicPage
