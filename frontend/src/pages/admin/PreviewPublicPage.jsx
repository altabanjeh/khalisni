import { Eye } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLanguage } from '../../context/LanguageContext'
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
  const { isArabic } = useLanguage()
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
    return <div className="glass-panel p-6 text-sm text-slate-500">{isArabic ? "جاري تحميل المعاينة..." : "Loading preview..."}</div>
  }

  return (
    <div className="page-section">
      <PageHeader
        icon={Eye}
        title={isArabic ? "معاينة الموقع العام" : "Preview public site"}
        eyebrow={isArabic ? "الموقع العام" : "Public site"}
        description={isArabic ? "معاينة مباشرة للبيانات العامة من نفس واجهة API المستخدمة في الصفحة الرئيسية." : "A live preview of the public data from the same API used by the public homepage."}
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
