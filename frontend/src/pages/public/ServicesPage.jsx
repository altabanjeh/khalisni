import { useEffect, useMemo, useRef, useState } from 'react'
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
  const { data: services = [], loading } = useAsyncData(
    () =>
      activeCategory
        ? api.getPublicCategoryServices(activeCategory)
        : api.getServices({
            search: searchParam || undefined,
          }),
    [activeCategory, searchParam],
    [],
  )

  const filteredServices = useMemo(() => {
    const normalizedSearch = searchParam.trim().toLowerCase()
    if (!normalizedSearch || !activeCategory) return services

    return services.filter((service) =>
      [service.name_ar, service.name_en, service.description_ar, service.description_en]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    )
  }, [activeCategory, searchParam, services])

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
    }, 350)
  }

  function handleCategorySelect(slug) {
    updateSearchParams(inputValue, slug === activeCategory ? '' : slug)
  }

  useEffect(() => {
    setInputValue(searchParam)
  }, [searchParam])

  return (
    <div className="space-y-8">
      <section className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">{isArabic ? 'دليل الخدمات' : 'Service directory'}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">
          {isArabic ? 'اختر الخدمة المناسبة لمعاملتك' : 'Choose the right service for your request'}
        </h1>
        <div className="mt-6">
          <input
            className="field"
            value={inputValue}
            placeholder={isArabic ? 'ابحث بالاسم أو الوصف' : 'Search by name or description'}
            onChange={handleSearchChange}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-title">{isArabic ? 'التصنيفات' : 'Categories'}</h2>
          {activeCategory ? (
            <button className="btn-secondary px-4 py-2 text-sm" onClick={() => handleCategorySelect(activeCategory)} type="button">
              {isArabic ? 'إظهار كل الخدمات' : 'Show all services'}
            </button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => {
            const isActive = category.slug === activeCategory
            const categoryName = getLocalizedField(category, { ar: 'name_ar', en: 'name_en' }, language)
            const categoryDescription = getLocalizedField(
              category,
              { ar: 'description_ar', en: 'description_en' },
              language,
              isArabic ? 'استعرض الخدمات المرتبطة بهذا التصنيف.' : 'Browse the services inside this category.',
            )

            return (
              <button
                key={category.id}
                className={`glass-panel text-start transition ${isActive ? 'ring-2 ring-brand-500' : 'hover:-translate-y-0.5'}`}
                onClick={() => handleCategorySelect(category.slug)}
                type="button"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
                      {category.service_count || 0} {isArabic ? 'خدمة' : 'services'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {isActive ? (isArabic ? 'محدد الآن' : 'Selected') : isArabic ? 'افتح القائمة' : 'Open list'}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-ink">{categoryName}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{categoryDescription}</p>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">
              {activeCategory
                ? getLocalizedField(
                    categories.find((category) => category.slug === activeCategory),
                    { ar: 'name_ar', en: 'name_en' },
                    language,
                    isArabic ? 'الخدمات' : 'Services',
                  )
                : isArabic
                  ? 'كل الخدمات'
                  : 'All services'}
            </h2>
            <span className="text-sm text-slate-500">
              {filteredServices.length} {isArabic ? 'نتيجة' : 'results'}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            {!filteredServices.length ? (
              <p className="col-span-full text-center text-sm text-slate-500">
                {isArabic ? 'لا توجد خدمات تطابق البحث أو التصنيف المحدد.' : 'No services match this search or category.'}
              </p>
            ) : null}
          </div>
        </section>
      )}
    </div>
  )
}

export default ServicesPage
