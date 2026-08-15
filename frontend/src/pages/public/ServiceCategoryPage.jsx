import { ArrowRight, Layers3, Search } from 'lucide-react'
import { useParams } from 'react-router-dom'
import CategoryCard from '../../components/CategoryCard'
import ServiceCard from '../../components/ServiceCard'
import { PublicEmptyState, PublicHero, PublicLinkButton, PublicLoading, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getCategoryDescription, getCategoryName } from '../../utils/servicePresentation'

function ServiceCategoryPage() {
  const { slug } = useParams()
  const { language, isArabic } = useLanguage()
  const { data: categories = [] } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const { data: services = [], loading, error } = useAsyncData(() => api.getPublicCategoryServices(slug), [slug], [])

  const categoryFromList = categories.find((item) => item.slug === slug)
  const category = categoryFromList || services[0]?.category || { slug }
  const relatedCategories = categories.filter((item) => item.slug !== slug && item.is_deleted !== true && item.is_active !== false && item.show_on_public_site !== false).slice(0, 3)
  const title = getCategoryName(category, language, isArabic ? 'تصنيف الخدمات' : 'Service category')
  const description = getCategoryDescription(category, language, isArabic ? 'كل الخدمات المتاحة ضمن هذا التصنيف.' : 'All available services in this category.')

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تصنيف خدمات' : 'Service category'}
        icon={Layers3}
        title={title}
        description={description}
        action={<PublicLinkButton to="/services" variant="secondary"><ArrowRight className="h-4 w-4" />{isArabic ? 'كل الخدمات' : 'All services'}</PublicLinkButton>}
      />

      {loading ? <PublicLoading /> : null}

      {error && !loading ? (
        <PublicEmptyState
          icon={Search}
          title={isArabic ? 'تعذر تحميل التصنيف' : 'Could not load this category'}
          description={isArabic ? 'تحقق من رابط التصنيف أو عد إلى دليل الخدمات.' : 'Check the category link or return to the services directory.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'فتح دليل الخدمات' : 'Open services'}</PublicLinkButton>}
        />
      ) : null}

      {!loading && !error && services.length ? (
        <PublicPanel>
          <div className="flex flex-col gap-3 border-b border-[var(--khalsni-public-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'كل خدمات التصنيف' : 'All category services'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">{title}</h2>
            </div>
            <span className="w-fit rounded-md border border-[var(--khalsni-public-border)] bg-slate-50 px-4 py-2 text-sm font-bold text-slate-600">
              {services.length} {isArabic ? 'خدمة متاحة' : 'available services'}
            </span>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        </PublicPanel>
      ) : null}

      {!loading && !error && !services.length ? (
        <PublicEmptyState
          icon={Layers3}
          title={isArabic ? 'لا توجد خدمات منشورة' : 'No published services'}
          description={isArabic ? 'لا يحتوي هذا التصنيف على خدمات عامة متاحة حالياً.' : 'This category does not currently have public services.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'كل الخدمات' : 'All services'}</PublicLinkButton>}
        />
      ) : null}

      {relatedCategories.length ? (
        <section className="space-y-4">
          <div className="text-right">
            <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'تصنيفات أخرى' : 'Other categories'}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'قد تحتاج أيضاً' : 'You may also need'}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {relatedCategories.map((item) => <CategoryCard key={item.id || item.slug} category={item} />)}
          </div>
        </section>
      ) : null}
    </PublicPageShell>
  )
}

export default ServiceCategoryPage
