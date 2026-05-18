import { useEffect, useRef, useState } from 'react'
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

  const { data: services = [], loading } = useAsyncData(
    () =>
      api.getServices({
        search: searchParam || undefined,
        category: activeCategory || undefined,
      }),
    [searchParam, activeCategory],
    [],
  )

  const { data: categories = [] } = useAsyncData(() => api.getCategories(), [], [])

  function handleSearchChange(event) {
    const value = event.target.value
    setInputValue(value)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchParams({ search: value, category: activeCategory })
    }, 350)
  }

  function handleCategoryChange(event) {
    setSearchParams({ search: inputValue, category: event.target.value })
  }

  useEffect(() => {
    setInputValue(searchParam)
  }, [searchParam])

  return (
    <div className="space-y-8">
      <section className="glass-panel p-6">
        <p className="text-sm font-bold text-brand-700">{isArabic ? 'دليل الخدمات' : 'Service directory'}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'اختر الخدمة المناسبة لمعاملتك' : 'Choose the right service for your request'}</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
          <input
            className="field"
            value={inputValue}
            placeholder={isArabic ? 'ابحث بالاسم أو الوصف' : 'Search by name or description'}
            onChange={handleSearchChange}
          />
          <select className="field min-w-56" value={activeCategory} onChange={handleCategoryChange}>
            <option value="">{isArabic ? 'كل التصنيفات' : 'All categories'}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {getLocalizedField(
                  category,
                  { ar: 'full_path_name', en: 'full_path_name_en' },
                  language,
                  getLocalizedField(category, { ar: 'name_ar', en: 'name_en' }, language),
                )}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
          {!loading && services.length === 0 ? (
            <p className="col-span-full text-center text-sm text-slate-500">
              {isArabic ? 'لا توجد خدمات تطابق البحث.' : 'No services match this search.'}
            </p>
          ) : null}
        </section>
      )}
    </div>
  )
}

export default ServicesPage
