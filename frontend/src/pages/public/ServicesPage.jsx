import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers3, RotateCcw, Search, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import CategoryCard from '../../components/CategoryCard'
import ServiceCard from '../../components/ServiceCard'
import {
  PublicButton,
  PublicCard,
  PublicEmptyState,
  PublicHero,
  PublicLoading,
  PublicPageShell,
  PublicPanel,
  PublicSearchInput,
} from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getCategoryDescription, getCategoryName } from '../../utils/servicePresentation'

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function ServicesPage() {
  const { language, isArabic } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const searchParam = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useState(searchParam)
  const debounceRef = useRef(null)

  const { data: categories = [] } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const { data: services = [], loading } = useAsyncData(() => api.getServices(), [], [])
  const publicServices = useMemo(() => services.filter(isPublicRecord), [services])
  const publicCategories = useMemo(() => categories.filter(isPublicRecord), [categories])

  const serviceCountsByCategory = useMemo(() => {
    return publicServices.reduce((accumulator, service) => {
      const slug = service.category?.slug || 'uncategorized'
      accumulator[slug] = (accumulator[slug] || 0) + 1
      return accumulator
    }, {})
  }, [publicServices])

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchParam.trim().toLowerCase()

    return publicServices.filter((service) => {
      const matchesCategory = !activeCategory || service.category?.slug === activeCategory
      if (!matchesCategory) return false
      if (!normalizedSearch) return true

      return [service.name_ar, service.name_en, service.description_ar, service.description_en, service.category?.name_ar, service.category?.name_en]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [activeCategory, publicServices, searchParam])

  const categorySections = useMemo(() => {
    const sectionsBySlug = new Map()

    filteredServices.forEach((service) => {
      const category = service.category || {}
      const slug = category.slug || 'uncategorized'
      if (!sectionsBySlug.has(slug)) {
        sectionsBySlug.set(slug, { slug, category, services: [] })
      }
      sectionsBySlug.get(slug).services.push(service)
    })

    const orderedSections = publicCategories
      .map((category) => {
        const section = sectionsBySlug.get(category.slug)
        if (!section) return null
        return { ...section, category: { ...category, ...section.category } }
      })
      .filter(Boolean)

    sectionsBySlug.forEach((section, slug) => {
      if (!orderedSections.some((item) => item.slug === slug)) orderedSections.push(section)
    })

    return orderedSections
  }, [filteredServices, publicCategories])

  const featuredCategories = useMemo(() => {
    return publicCategories.filter((category) => (serviceCountsByCategory[category.slug] || 0) > 0)
  }, [publicCategories, serviceCountsByCategory])

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
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'دليل الخدمات العامة' : 'Public service directory'}
        icon={Layers3}
        title={isArabic ? 'تصفح خدمات خلصني بنفس تجربة الصفحة الرئيسية' : 'Browse Khalsni services'}
        description={isArabic ? 'ابحث حسب الخدمة أو التصنيف، ثم انتقل إلى تفاصيل الخدمة أو ابدأ الطلب من المسار الرسمي.' : 'Search by service or category, then open details or start the official request flow.'}
        action={(
          <div className="grid min-w-[16rem] gap-3 rounded-lg border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white/75">
              <Sparkles className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
              {isArabic ? 'ملخص سريع' : 'Quick overview'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <PublicCard><p className="text-2xl font-extrabold">{featuredCategories.length}</p><p className="mt-1 text-[0.65rem] text-white/60">{isArabic ? 'تصنيف' : 'Categories'}</p></PublicCard>
              <PublicCard><p className="text-2xl font-extrabold">{publicServices.length}</p><p className="mt-1 text-[0.65rem] text-white/60">{isArabic ? 'خدمة' : 'Services'}</p></PublicCard>
              <PublicCard><p className="text-2xl font-extrabold">{filteredServices.length}</p><p className="mt-1 text-[0.65rem] text-white/60">{isArabic ? 'نتيجة' : 'Results'}</p></PublicCard>
            </div>
          </div>
        )}
      />

      <PublicPanel>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <PublicSearchInput
            onChange={handleSearchChange}
            placeholder={isArabic ? 'ابحث باسم الخدمة أو التصنيف' : 'Search by service or category'}
            value={inputValue}
          />
          {(activeCategory || searchParam) ? (
            <PublicButton onClick={() => updateSearchParams('', '')} type="button" variant="secondary">
              <RotateCcw className="h-4 w-4" />
              {isArabic ? 'إعادة ضبط التصفية' : 'Reset filters'}
            </PublicButton>
          ) : null}
        </div>

        {featuredCategories.length ? (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            <button
              className={`h-10 shrink-0 rounded-md border px-4 text-sm font-extrabold transition ${!activeCategory ? 'border-[var(--khalsni-public-primary)] bg-[var(--khalsni-public-primary)] text-white' : 'border-white/15 bg-white/10 text-white/75 hover:bg-white/15'}`}
              onClick={() => handleCategorySelect('')}
              type="button"
            >
              {isArabic ? 'كل الخدمات' : 'All services'}
            </button>
            {featuredCategories.map((category) => {
              const isActive = category.slug === activeCategory
              const categoryName = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
              return (
                <button
                  key={category.id || category.slug}
                  className={`h-10 shrink-0 rounded-md border px-4 text-sm font-extrabold transition ${isActive ? 'border-[var(--khalsni-public-primary)] bg-[var(--khalsni-public-primary)] text-white' : 'border-white/15 bg-white/10 text-white/75 hover:bg-white/15'}`}
                  onClick={() => handleCategorySelect(category.slug)}
                  type="button"
                >
                  {categoryName} · {serviceCountsByCategory[category.slug] || 0}
                </button>
              )
            })}
          </div>
        ) : null}
      </PublicPanel>

      {featuredCategories.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredCategories.slice(0, 8).map((category) => (
            <CategoryCard key={category.id || category.slug} category={category} count={serviceCountsByCategory[category.slug] || 0} />
          ))}
        </section>
      ) : null}

      {loading ? (
        <PublicLoading />
      ) : categorySections.length ? (
        <section className="space-y-5">
          {categorySections.map((section) => {
            const categoryName = getCategoryName(section.category, language, isArabic ? 'خدمات عامة' : 'General services')
            const categoryDescription = getCategoryDescription(section.category, language, isArabic ? 'خدمات مرتبة داخل هذا التصنيف لتسهيل الوصول.' : 'Services grouped here to make browsing easier.')

            return (
              <PublicPanel key={section.slug}>
                <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'تصنيف الخدمات' : 'Service category'}</p>
                    <h2 className="mt-1 text-2xl font-extrabold text-white">{categoryName}</h2>
                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-white/50">{categoryDescription}</p>
                  </div>
                  <span className="w-fit rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-white/75">
                    {section.services.length} {isArabic ? 'خدمة' : 'services'}
                  </span>
                </div>
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {section.services.map((service) => <ServiceCard key={service.id} service={service} />)}
                </div>
              </PublicPanel>
            )
          })}
        </section>
      ) : (
        <PublicEmptyState
          icon={Search}
          title={isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}
          description={isArabic ? 'جرّب تصنيفاً آخر أو عدّل عبارة البحث للوصول إلى الخدمة المناسبة.' : 'Try another category or adjust the search phrase.'}
        />
      )}
    </PublicPageShell>
  )
}

export default ServicesPage
