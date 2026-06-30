import { useEffect, useMemo, useRef, useState } from 'react'
import { Layers3, Search, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import ServiceCard from '../../components/ServiceCard'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getLocalizedField } from '../../utils/i18n'

function ServicesPage() {
  const { language, isArabic } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || ''
  const searchParam = searchParams.get('search') || ''
  const [inputValue, setInputValue] = useState(searchParam)
  const debounceRef = useRef(null)

  const { data: categories = [] } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const { data: services = [], loading } = useAsyncData(() => api.getServices(), [], [])

  const serviceCountsByCategory = useMemo(() => {
    return services.reduce((accumulator, service) => {
      const slug = service.category?.slug || 'uncategorized'
      accumulator[slug] = (accumulator[slug] || 0) + 1
      return accumulator
    }, {})
  }, [services])

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchParam.trim().toLowerCase()

    return services.filter((service) => {
      const matchesCategory = !activeCategory || service.category?.slug === activeCategory
      if (!matchesCategory) return false
      if (!normalizedSearch) return true

      return [service.name_ar, service.name_en, service.description_ar, service.description_en, service.category?.name_ar, service.category?.name_en]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    })
  }, [activeCategory, searchParam, services])

  const categorySections = useMemo(() => {
    const sectionsBySlug = new Map()

    filteredServices.forEach((service) => {
      const category = service.category || {}
      const slug = category.slug || 'uncategorized'
      if (!sectionsBySlug.has(slug)) {
        sectionsBySlug.set(slug, {
          slug,
          category,
          services: [],
        })
      }
      sectionsBySlug.get(slug).services.push(service)
    })

    const orderedSections = categories
      .map((category) => {
        const section = sectionsBySlug.get(category.slug)
        if (!section) return null
        return {
          ...section,
          category: { ...category, ...section.category },
        }
      })
      .filter(Boolean)

    sectionsBySlug.forEach((section, slug) => {
      if (!orderedSections.some((item) => item.slug === slug)) {
        orderedSections.push(section)
      }
    })

    return orderedSections
  }, [categories, filteredServices])

  const featuredCategories = useMemo(() => {
    return categories.filter((category) => (serviceCountsByCategory[category.slug] || 0) > 0)
  }, [categories, serviceCountsByCategory])

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
    debounceRef.current = setTimeout(() => {
      updateSearchParams(value, activeCategory)
    }, 300)
  }

  function handleCategorySelect(slug) {
    updateSearchParams(inputValue, slug === activeCategory ? '' : slug)
  }

  useEffect(() => {
    setInputValue(searchParam)
  }, [searchParam])

  useEffect(() => {
    return () => clearTimeout(debounceRef.current)
  }, [])

  return (
    <div className="space-y-8">
      <section className="glass-panel overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700">
              <Layers3 className="h-4 w-4" />
              {isArabic ? 'دليل الخدمات العامة' : 'Public service directory'}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold text-ink sm:text-4xl">
              {isArabic ? 'تصفح الخدمات حسب التصنيف بشكل أوضح وأسهل' : 'Browse services by category in a clearer, easier layout'}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600 sm:text-base">
              {isArabic
                ? 'كل تصنيف يظهر كقسم مستقل، وداخله بطاقات الخدمات المرتبطة به. هذا يجعل المستخدم العام يصل للخدمة المطلوبة أسرع بدون التنقل العشوائي.'
                : 'Each category appears as its own section, with its services shown inside it. This helps public users reach the right service faster without jumping around.'}
            </p>

            <div className="mt-6 relative">
              <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isArabic ? 'right-4' : 'left-4'}`} />
              <input
                className={`field ${isArabic ? 'pr-10' : 'pl-10'}`}
                onChange={handleSearchChange}
                placeholder={isArabic ? 'ابحث باسم الخدمة أو التصنيف' : 'Search by service or category'}
                value={inputValue}
              />
            </div>
          </div>

          <div className="border-t border-border bg-slate-50/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-soft">
              <Sparkles className="h-4 w-4" />
              {isArabic ? 'اختصار سريع' : 'Quick overview'}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'التصنيفات النشطة' : 'Active categories'}</p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{featuredCategories.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'الخدمات المتاحة' : 'Available services'}</p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{services.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-border bg-white p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{isArabic ? 'النتائج الحالية' : 'Current results'}</p>
                <p className="mt-3 text-3xl font-extrabold text-ink">{filteredServices.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-brand-700">{isArabic ? 'التصفح حسب التصنيف' : 'Browse by category'}</p>
            <h2 className="section-title">{isArabic ? 'ابدأ من الجهة أو نوع المعاملة' : 'Start with the authority or request type'}</h2>
          </div>
          {(activeCategory || searchParam) ? (
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => updateSearchParams('', '')} type="button">
              {isArabic ? 'إعادة ضبط التصفية' : 'Reset filters'}
            </button>
          ) : null}
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${!activeCategory ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-600 hover:border-brand-200 hover:text-ink'}`}
            onClick={() => handleCategorySelect('')}
            type="button"
          >
            {isArabic ? 'كل الخدمات' : 'All services'}
          </button>
          {featuredCategories.map((category) => {
            const isActive = category.slug === activeCategory
            const categoryName = getLocalizedField(category, { ar: 'name_ar', en: 'name_en' }, language)

            return (
              <button
                key={category.id}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${isActive ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-600 hover:border-brand-200 hover:text-ink'}`}
                onClick={() => handleCategorySelect(category.slug)}
                type="button"
              >
                {categoryName} · {serviceCountsByCategory[category.slug] || 0}
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : categorySections.length ? (
        <section className="space-y-6">
          {categorySections.map((section) => {
            const categoryName = getLocalizedField(section.category, { ar: 'name_ar', en: 'name_en' }, language, isArabic ? 'خدمات عامة' : 'General services')
            const categoryDescription = getLocalizedField(
              section.category,
              { ar: 'description_ar', en: 'description_en' },
              language,
              isArabic ? 'خدمات مرتبة داخل هذا التصنيف لتسهيل الوصول.' : 'Services are grouped here to make browsing easier.',
            )

            return (
              <article key={section.slug} className="glass-panel overflow-hidden p-0">
                <div className="border-b border-border bg-slate-50/70 p-6 sm:p-7">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-sm font-bold text-brand-700">{isArabic ? 'تصنيف الخدمات' : 'Service category'}</p>
                      <h3 className="mt-2 text-2xl font-extrabold text-ink sm:text-3xl">{categoryName}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{categoryDescription}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-soft">
                        {section.services.length} {isArabic ? 'خدمة' : 'services'}
                      </span>
                      <button className="btn-secondary px-4 py-2 text-sm" onClick={() => handleCategorySelect(section.slug)} type="button">
                        {activeCategory === section.slug ? (isArabic ? 'فتح كل التصنيفات' : 'Show all categories') : isArabic ? 'عرض هذا التصنيف فقط' : 'Focus on this category'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-7">
                  <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {section.services.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <div className="glass-panel p-8 text-center">
          <p className="text-lg font-bold text-ink">{isArabic ? 'لا توجد نتائج مطابقة' : 'No matching results'}</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {isArabic
              ? 'جرّب تصنيفاً آخر أو عدّل عبارة البحث للوصول إلى الخدمة المناسبة.'
              : 'Try another category or adjust the search phrase to find the right service.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default ServicesPage
