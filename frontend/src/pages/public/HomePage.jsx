import PublicHomepageTemplate from '../../components/publicSite/PublicHomepageTemplate'
import { useAsyncData } from '../../hooks/useAsyncData'
import { api } from '../../api/services'
import { usePublicSite } from '../../context/PublicSiteContext'

function HomePage() {
  const { advertisements, content } = usePublicSite()
  const { data: services = [], loading } = useAsyncData(() => api.getServices(), [], [])

  const featuredServices = services.filter((service) => service.is_featured).slice(0, 3)

  return (
    <PublicHomepageTemplate
      allServices={services}
      advertisements={advertisements}
      content={content}
      featuredServices={featuredServices}
      loadingServices={loading}
    />
  )
}

export default HomePage
