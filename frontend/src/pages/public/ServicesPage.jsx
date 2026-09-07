import { useEffect, useMemo, useRef, useState } from 'react'
import { Grid2X2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import CategoryCard from '../../components/CategoryCard'
import ServiceCard from '../../components/ServiceCard'
import {
  EmptyState,
  LoadingSkeleton,
  PublicButton,
  PublicEmptyState,
  PublicPageShell,
  PublicSearchInput,
} from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getCategoryDescription, getCategoryName } from '../../utils/servicePresentation'
import { EMPTY_STATE_ILLUSTRATIONS } from '../../utils/catalogImagery'

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function getServiceCategoryKey(service) {
  return service?.category?.slug || String(service?.category_id || '')
}

function ServicesPage() {
  const { language, isArabic } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const searchParam = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useState(searchParam)
  const debounceRef = useRef(null)

  const { data: categories = [], loading: loadingCategories } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const { data: services = [], loading: loadingServices } = useAsyncData(() => api.getServices(), [], [])
  const publicServices = useMemo(() => services.filter(isPublicRecord), [services])
  const publicCategories = useMemo(() => categories.filter(isPublicRecord), [categories])

  const serviceCountsByCategory = useMemo(() => {
    return publicServices.reduce((accumulator, service) => {
      const slug = service.category?.slug || String(service.category_id || 'uncategorized')
      accumulator[slug] = (accumulator[slug] || 0) + 1
      return accumulator
    }, {})
  }, [publicServices])

  const activeCategoryRecord = useMemo(() => {
    return publicCategories.find((category) => category.slug === activeCategory || String(category.id) === activeCategory) || null
  }, [activeCategory, publicCategories])

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchParam.trim().toLowerCase()

    return publicServices.filter((service) => {
      const serviceCategoryKey = getServiceCategoryKey(service)
      const serviceCategoryId = String(service.category?.id || service.category_id || '')
      const matchesCategory = !activeCategory || serviceCategoryKey === activeCategory || serviceCategoryId === activeCategory
      if (!matchesCategory) return false
      if (!normalizedSearch) return true

      return [service.name_ar, service.name_en, service.description_ar, service.description_en, service.category?.name_ar, service.category?.name_en]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [activeCategory, publicServices, searchParam])

  function updateSearchParams(nextSearch, nextCategory) {
    const nextParams = new URLSearchParams()
    if (nextSearch) nextParams.set('search', nextSearch)
    if (nextCategory) nextParams.set('category', nextCategory)
    setSearchParams(nextParams)
  }

  function handleSearchChange(event) {
    const value = event.target.value
    setInputValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateSearchParams(value, activeCategory), 300)
  }

  function handleCategorySelect(slug) {
    updateSearchParams(inputValue, slug === activeCategory ? '' : slug)
  }

  useEffect(() => setInputValue(searchParam), [searchParam])
  useEffect(() => () => clearTimeout(debounceRef.current), [])

  return (
    <PublicPageShell className="py-0 sm:py-0">
      <section className="grid gap-5 rounded-[var(--radius-xl)] bg-white p-5 text-start shadow-soft ring-1 ring-[var(--khalsni-public-border)] sm:p-7 lg:grid-cols-[1fr_20rem] lg:items-end">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
            <Grid2X2 aria-hidden="true" className="h-4 w-4" />
            {isArabic ? 'دليل التصنيفات' : 'Category directory'}
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--khalsni-public-navy)] sm:text-4xl">
            {isArabic ? 'تصفح خدمات خلصني حسب التصنيف' : 'Browse Khalsni Services by Category'}
          </h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">
            {isArabic ? 'اختر تصنيفاً أو ابحث باسم الخدمة للوصول إلى التفاصيل وبدء الطلب من المسار الحالي.' : 'Choose a category or search by service name to open details and continue through the existing request flow.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4">
            <p className="text-2xl font-black text-[var(--khalsni-public-navy)]">{publicCategories.length}</p>
            <p className="mt-1 text-xs font-bold text-[var(--khalsni-public-text-secondary)]">{isArabic ? 'تصنيف' : 'Categories'}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] bg-[var(--khalsni-public-primary-soft)] p-4">
            <p className="text-2xl font-black text-[var(--khalsni-public-accent-text)]">{filteredServices.length}</p>
            <p className="mt-1 text-xs font-bold text-[var(--khalsni-public-text-secondary)]">{isArabic ? 'نتيجة' : 'Results'}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-white p-3 shadow-sm ring-1 ring-[var(--khalsni-public-border)] lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <PublicSearchInput
              onChange={handleSearchChange}
              placeholder={isArabic ? 'ابحث باسم الخدمة أو التصنيف' : 'Search by service or category'}
              value={inputValue}
            />
          </div>
          {(activeCategory || searchParam) ? (
            <PublicButton className="shrink-0" onClick={() => updateSearchParams('', '')} type="button" variant="secondary">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {isArabic ? 'إعادة ضبط' : 'Reset'}
            </PublicButton>
          ) : null}
        </div>

        {publicCategories.length ? (
          <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
            <button
              className={`kh-focusable inline-flex h-10 shrink-0 snap-start items-center justify-center rounded-[var(--radius-md)] border px-4 text-sm font-extrabold transition ${!activeCategory ? 'border-[var(--khalsni-public-primary)] bg-[var(--khalsni-public-primary)] text-white' : 'border-[var(--khalsni-public-border)] bg-white text-[var(--khalsni-public-navy)] hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]'}`}
              onClick={() => handleCategorySelect('')}
              type="button"
            >
              {isArabic ? 'كل الخدمات' : 'All services'}
            </button>
            {publicCategories.map((category) => {
              const slug = category.slug || String(category.id || '')
              const isActive = slug === activeCategory
              const categoryName = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
              const count = serviceCountsByCategory[slug] ?? category.service_count
              return (
                <button
                  key={category.id || category.slug}
                  className={`kh-focusable inline-flex h-10 shrink-0 snap-start items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-extrabold transition ${isActive ? 'border-[var(--khalsni-public-primary)] bg-[var(--khalsni-public-primary)] text-white' : 'border-[var(--khalsni-public-border)] bg-white text-[var(--khalsni-public-navy)] hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]'}`}
                  onClick={() => handleCategorySelect(slug)}
                  type="button"
                >
                  <span>{categoryName}</span>
                  {count != null ? <span className="text-xs opacity-75">{count}</span> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 text-start sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
              {isArabic ? 'التصنيفات الرئيسية' : 'Main categories'}
            </p>
            <h2 className="mt-1 text-2xl font-black text-[var(--khalsni-public-navy)]">{isArabic ? 'اختر التصنيف المناسب' : 'Choose the right category'}</h2>
          </div>
          <Link className="text-sm font-extrabold text-[var(--khalsni-public-accent-text)] hover:text-[var(--khalsni-public-primary-hover)]" to="/services">
            {isArabic ? 'عرض الكل' : 'View all'}
          </Link>
        </div>

        {loadingCategories && !publicCategories.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => <LoadingSkeleton className="h-72" key={index} />)}
          </div>
        ) : publicCategories.length ? (
          <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
            {publicCategories.map((category) => {
              const slug = category.slug || String(category.id || '')
              return (
                <div className="w-[82vw] shrink-0 snap-start sm:w-auto" key={category.id || category.slug}>
                  <CategoryCard category={category} count={serviceCountsByCategory[slug] ?? category.service_count} />
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon={Grid2X2}
            title={isArabic ? 'لا توجد تصنيفات منشورة حالياً' : 'No public categories yet'}
            description={isArabic ? 'ستظهر التصنيفات هنا بعد نشرها من إدارة الكتالوج.' : 'Categories will appear here after they are published from catalog management.'}
          />
        )}
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 text-start sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">{isArabic ? 'الخدمات' : 'Services'}</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--khalsni-public-navy)]">
              {activeCategoryRecord
                ? getCategoryName(activeCategoryRecord, language, isArabic ? 'خدمات التصنيف' : 'Category services')
                : isArabic ? 'الخدمات المتاحة' : 'Available services'}
            </h2>
            {activeCategoryRecord ? (
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
                {getCategoryDescription(activeCategoryRecord, language, '')}
              </p>
            ) : null}
          </div>
          <span className="inline-flex h-10 items-center justify-center self-start rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary-soft)] px-4 text-sm font-extrabold text-[var(--khalsni-public-accent-text)] sm:self-auto">
            {filteredServices.length} {isArabic ? 'خدمة' : 'services'}
          </span>
        </div>

        {loadingServices ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton className="h-96" key={index} />)}
          </div>
        ) : filteredServices.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id || service.slug} service={service} />
            ))}
          </div>
        ) : (
          <PublicEmptyState
            illustration={EMPTY_STATE_ILLUSTRATIONS.results}
            icon={Search}
            title={isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}
            description={isArabic ? 'جرّب تصنيفاً آخر أو عدّل عبارة البحث للوصول إلى الخدمة المناسبة.' : 'Try another category or adjust the search phrase.'}
          />
        )}
      </section>
    </PublicPageShell>
  )
}

export default ServicesPage
