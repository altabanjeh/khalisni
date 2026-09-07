import { ArrowLeft, ArrowRight, Grid2X2, Layers3, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import CategoryCard from '../../components/CategoryCard'
import ServiceCard from '../../components/ServiceCard'
import { ImageFallback, LoadingSkeleton, PublicEmptyState, PublicLinkButton, PublicLoading, PublicPageShell } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getCategoryDescription, getCategoryName } from '../../utils/servicePresentation'
import { resolveCategoryImage } from '../../utils/catalogImagery'

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function ServiceCategoryPage() {
  const { slug } = useParams()
  const { language, isArabic } = useLanguage()
  const { data: categories = [], loading: loadingCategories } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const { data: services = [], loading, error } = useAsyncData(() => api.getPublicCategoryServices(slug), [slug], [])
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight

  const publicServices = services.filter(isPublicRecord)
  const categoryFromList = categories.find((item) => item.slug === slug)
  const category = categoryFromList || publicServices[0]?.category || { slug }
  const relatedCategories = categories
    .filter((item) => item.slug !== slug && isPublicRecord(item))
    .slice(0, 6)
  const title = getCategoryName(category, language, isArabic ? 'تصنيف الخدمات' : 'Service category')
  const description = getCategoryDescription(category, language, '')
  const categoryImageUrl = category.image_url || category.image || resolveCategoryImage(category).url
  const serviceCount = category.service_count ?? publicServices.length

  return (
    <PublicPageShell>
      <section className="grid gap-5 overflow-hidden rounded-[var(--radius-xl)] bg-white p-4 shadow-soft ring-1 ring-[var(--khalsni-public-border)] sm:p-5 lg:grid-cols-[0.78fr_1fr] lg:items-stretch">
        <ImageFallback
          alt={title}
          className="aspect-[16/10] min-h-56 rounded-[var(--radius-lg)] lg:h-full"
          icon={Layers3}
          src={categoryImageUrl}
        />

        <div className="flex flex-col justify-center p-1 text-start sm:p-4">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
            <Grid2X2 aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'تصنيف خدمات' : 'Service category'}
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--khalsni-public-navy)] sm:text-4xl">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{description}</p> : null}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-10 items-center rounded-[var(--radius-md)] bg-[var(--khalsni-public-bg-secondary)] px-4 text-sm font-extrabold text-[var(--khalsni-public-navy)]">
              {serviceCount} {isArabic ? 'خدمة متاحة' : 'available services'}
            </span>
            <Link className="kh-focusable inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-extrabold text-[var(--khalsni-public-navy)] transition hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]" to="/services">
              {isArabic ? 'كل الخدمات' : 'All services'}
              <ArrowIcon aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {loading ? <PublicLoading /> : null}

      {error && !loading ? (
        <PublicEmptyState
          icon={Search}
          title={isArabic ? 'تعذر تحميل التصنيف' : 'Could not load this category'}
          description={isArabic ? 'تحقق من رابط التصنيف أو عد إلى دليل الخدمات.' : 'Check the category link or return to the services directory.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'فتح دليل الخدمات' : 'Open services'}</PublicLinkButton>}
        />
      ) : null}

      {!loading && !error && publicServices.length ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 text-start sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">{isArabic ? 'خدمات التصنيف' : 'Category services'}</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--khalsni-public-navy)]">{title}</h2>
            </div>
            <span className="w-fit rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary-soft)] px-4 py-2 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
              {publicServices.length} {isArabic ? 'خدمة' : 'services'}
            </span>
          </div>
          <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {publicServices.map((service) => (
              <div className="w-[86vw] shrink-0 snap-start sm:w-auto" key={service.id || service.slug}>
                <ServiceCard service={service} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && !error && !publicServices.length ? (
        <PublicEmptyState
          icon={Layers3}
          title={isArabic ? 'لا توجد خدمات منشورة' : 'No published services'}
          description={isArabic ? 'لا يحتوي هذا التصنيف على خدمات عامة متاحة حالياً.' : 'This category does not currently have public services.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'كل الخدمات' : 'All services'}</PublicLinkButton>}
        />
      ) : null}

      {loadingCategories && !relatedCategories.length ? (
        <section className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <LoadingSkeleton className="h-72" key={index} />)}
        </section>
      ) : null}

      {relatedCategories.length ? (
        <section className="space-y-4">
          <div className="text-start">
            <p className="text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">{isArabic ? 'تصنيفات أخرى' : 'Other categories'}</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--khalsni-public-navy)]">{isArabic ? 'قد تحتاج أيضاً' : 'You may also need'}</h2>
          </div>
          <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {relatedCategories.map((item) => (
              <div className="w-[82vw] shrink-0 snap-start sm:w-auto" key={item.id || item.slug}>
                <CategoryCard category={item} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </PublicPageShell>
  )
}

export default ServiceCategoryPage
