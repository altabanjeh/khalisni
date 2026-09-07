import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Layers,
  Loader2,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CategoryCard from '../../components/CategoryCard'
import ServiceCard from '../../components/ServiceCard'
import { ServiceRail, ServiceRailItem } from '../../components/ServiceRail'
import { ImageFallback } from '../../components/public/PublicPage'
import { getCover } from '../../utils/cover'
import { CUSTOM_REQUEST_ILLUSTRATION, HERO_ILLUSTRATION } from '../../utils/catalogImagery'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  getCategoryDescription,
  getCategoryName,
  getServiceDescription,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../../utils/servicePresentation'


const copy = {
  ar: {
    heroEyebrow: 'منصة خدمات حكومية وإدارية',
    headline: 'ركّز على اللي بهمّك...',
    headlineAccent: 'وإحنا بنخلّص الباقي.',
    heroText: 'ابحث عن الخدمة، اعرف المتطلبات، وابدأ طلبك من مسار واضح.',
    searchPlaceholder: 'ابحث عن خدمة أو تصنيف...',
    searchLabel: 'البحث في خدمات خلصني',
    loading: 'جاري تحميل الخدمات...',
    suggestionLabel: 'اقتراحات مباشرة',
    noResults: 'طلب خدمة غير موجودة',
    noResultsHint: 'لم نجد خدمة مطابقة. أرسل طلباً خاصاً وسيتابع الفريق احتياجك.',
    categoryType: 'تصنيف',
    serviceType: 'خدمة',
    browseServices: 'تصفح الخدمات',
    trackRequest: 'تتبع طلبك',
    servicesLabel: 'خدمة',
    categoriesLabel: 'تصنيف',
    heroCardTitle: 'متابعة واضحة من البداية للنهاية',
    heroCardText: 'الخدمات، المستندات، السعر المتاح، وحالة الطلب في تجربة واحدة.',
    trustItems: [
      ['متابعة لحظية', 'اعرف حالة طلبك من صفحة التتبع.'],
      ['أسعار شفافة', 'تظهر الأسعار عندما تكون متاحة للنشر.'],
      ['مستندات منظمة', 'المتطلبات واضحة قبل بدء الطلب.'],
      ['دعم للطلبات الخاصة', 'أرسل الخدمة غير الموجودة ليتابعها الفريق.'],
    ],
    latestTitle: 'أحدث الخدمات',
    latestText: 'خدمات فعلية من كتالوج خلصني، مرتبة حسب البيانات المتاحة.',
    categoriesTitle: 'التصنيفات الرئيسية',
    categoriesText: 'تصفح التصنيفات المنشورة واكتشف الخدمات المرتبطة بها.',
    viewAll: 'عرض الكل',
    categoryRowsTitle: 'خدمات حسب التصنيف',
    categoryRowsText: 'مجموعات مختصرة من التصنيفات التي تحتوي على خدمات منشورة.',
    serviceCount: 'خدمة متاحة',
    emptyCategories: 'لا توجد تصنيفات منشورة حالياً.',
    emptyServices: 'لا توجد خدمات منشورة حالياً.',
    howTitle: 'كيف تعمل خلصني؟',
    howText: 'أربع خطوات بسيطة من اختيار الخدمة إلى متابعة الإنجاز.',
    steps: [
      ['اختر الخدمة', 'ابحث أو تصفح التصنيفات واختر الخدمة المناسبة.'],
      ['راجع المتطلبات', 'اطلع على المستندات والمدة والسعر المتاح.'],
      ['أرسل الطلب', 'أدخل بياناتك وارفع المستندات المطلوبة.'],
      ['تابع الحالة', 'راقب التحديثات حتى اكتمال الطلب.'],
    ],
    specialTitle: 'لم تجد الخدمة؟',
    specialText: 'أرسل اسم الخدمة أو الجهة المطلوبة وسيقوم الفريق بمراجعة الطلب الخاص.',
    specialService: 'اسم الخدمة أو الجهة',
    specialContact: 'هاتف أو بريد إلكتروني',
    specialSubmit: 'إرسال الطلب',
    sending: 'جاري الإرسال...',
    specialSuccess: 'تم إرسال طلبك الخاص بنجاح.',
    previous: 'السابق',
    next: 'التالي',
  },
  en: {
    heroEyebrow: 'Government and administrative services platform',
    headline: 'Focus on what matters...',
    headlineAccent: 'and we will handle the rest.',
    heroText: 'Search for a service, review the requirements, and start through a clear request flow.',
    searchPlaceholder: 'Search for a service or category...',
    searchLabel: 'Search Khalsni services',
    loading: 'Loading services...',
    suggestionLabel: 'Direct suggestions',
    noResults: 'Request an unlisted service',
    noResultsHint: 'No matching service was found. Send a special request and the team will follow up.',
    categoryType: 'Category',
    serviceType: 'Service',
    browseServices: 'Browse services',
    trackRequest: 'Track request',
    servicesLabel: 'Services',
    categoriesLabel: 'Categories',
    heroCardTitle: 'Clear tracking from start to finish',
    heroCardText: 'Services, documents, available price, and request status in one experience.',
    trustItems: [
      ['Live tracking', 'Follow your request from the tracking page.'],
      ['Transparent pricing', 'Prices appear when approved for public display.'],
      ['Organized documents', 'Requirements are clear before you start.'],
      ['Special-request support', 'Send unlisted services for team follow-up.'],
    ],
    latestTitle: 'Latest services',
    latestText: 'Real services from the Khalsni catalog, ordered by available backend data.',
    categoriesTitle: 'Main categories',
    categoriesText: 'Browse published categories and discover the services inside them.',
    viewAll: 'View all',
    categoryRowsTitle: 'Services by category',
    categoryRowsText: 'Short rows from categories that contain published services.',
    serviceCount: 'available services',
    emptyCategories: 'No public categories are published yet.',
    emptyServices: 'No public services are published yet.',
    howTitle: 'How Khalsni Works',
    howText: 'Four simple steps from choosing a service to tracking completion.',
    steps: [
      ['Choose a service', 'Search or browse categories and select the right service.'],
      ['Review requirements', 'Check documents, duration, and available price.'],
      ['Submit request', 'Enter your details and upload the required documents.'],
      ['Track status', 'Watch updates until the request is complete.'],
    ],
    specialTitle: 'Can not find the service?',
    specialText: 'Send the service or authority name and the team will review the special request.',
    specialService: 'Service or authority name',
    specialContact: 'Phone or email',
    specialSubmit: 'Send request',
    sending: 'Sending...',
    specialSuccess: 'Your special request was sent.',
    previous: 'Previous',
    next: 'Next',
  },
}

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function serviceDetailsPath(service) {
  const slug = service?.slug || service?.id || service?.service_id
  return slug ? `/services/${encodeURIComponent(slug)}` : '/services'
}

function categoryPath(category) {
  if (category?.slug) return `/services/category/${encodeURIComponent(category.slug)}`
  if (category?.id) return `/services?category=${encodeURIComponent(category.id)}`
  return '/services'
}

function getRecordTime(record) {
  return Date.parse(record?.created_at || record?.updated_at || '') || 0
}

function uniqueByServiceId(services) {
  const seen = new Set()
  return services.filter((service) => {
    const key = service?.id || service?.service_id || service?.slug
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function buildCategorySections(categories, services, language, isArabic) {
  const publicServices = services.filter(isPublicRecord)
  const servicesByCategory = publicServices.reduce((accumulator, service) => {
    const category = service.category || {}
    const keys = [category.slug, category.id, service.category_id].filter(Boolean)
    keys.forEach((key) => {
      if (!accumulator[key]) accumulator[key] = []
      accumulator[key].push(service)
    })
    return accumulator
  }, {})

  return categories.filter(isPublicRecord).map((category, index) => {
    const key = category.slug || category.id
    const categoryServices = (servicesByCategory[key] || []).filter(isPublicRecord)
    return {
      id: key || `category-${index}`,
      category,
      title: getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category'),
      description: getCategoryDescription(category, language, isArabic ? 'خدمات مرتبطة بهذا التصنيف.' : 'Services grouped under this category.'),
      count: category.service_count ?? categoryServices.length,
      services: categoryServices,
    }
  })
}

function buildSearchItems(services, categories, language, isArabic) {
  const serviceItems = services.filter(isPublicRecord).map((service) => ({
    id: `service-${service.id || service.slug}`,
    type: 'service',
    label: getServiceName(service, language, isArabic ? 'خدمة' : 'Service'),
    description: getServiceDescription(service, language, service.category ? getCategoryName(service.category, language, '') : ''),
    href: serviceDetailsPath(service),
    keywords: [
      service.name_ar,
      service.name_en,
      service.description_ar,
      service.description_en,
      service.category?.name_ar,
      service.category?.name_en,
      service.category?.slug,
    ],
  }))

  const categoryItems = categories.filter(isPublicRecord).map((category) => ({
    id: `category-${category.id || category.slug}`,
    type: 'category',
    label: getCategoryName(category, language, isArabic ? 'تصنيف' : 'Category'),
    description: getCategoryDescription(category, language, ''),
    href: categoryPath(category),
    keywords: [category.name_ar, category.name_en, category.description_ar, category.description_en, category.slug],
  }))

  return [...serviceItems, ...categoryItems]
}

function ServiceSearch({ services, categories, loading, onSpecialRequest }) {
  const navigate = useNavigate()
  const { language, isArabic } = useLanguage()
  const dictionary = copy[isArabic ? 'ar' : 'en']
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const searchItems = useMemo(() => buildSearchItems(services, categories, language, isArabic), [categories, isArabic, language, services])
  const suggestions = useMemo(() => {
    const normalizedQuery = normalize(query)
    if (!normalizedQuery) return searchItems.slice(0, 6)
    return searchItems
      .filter((item) => [item.label, item.description, ...(item.keywords || [])].some((value) => normalize(value).includes(normalizedQuery)))
      .slice(0, 7)
  }, [query, searchItems])

  function selectSuggestion(item) {
    if (!item) return
    navigate(item.href)
    setOpen(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = query.trim()
    if (open && suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex])
      return
    }
    navigate(trimmed ? `/services?search=${encodeURIComponent(trimmed)}` : '/services')
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, Math.max(suggestions.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && open && suggestions[activeIndex]) {
      event.preventDefault()
      selectSuggestion(suggestions[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <form className="relative" onSubmit={handleSubmit}>
      <label className="relative block">
        <span className="sr-only">{dictionary.searchLabel}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--khalsni-public-accent-text)]" />
        {loading ? <Loader2 aria-hidden="true" className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--khalsni-public-text-muted)]" /> : null}
        <input
          aria-autocomplete="list"
          aria-controls="home-service-search-list"
          aria-expanded={open}
          aria-label={dictionary.searchLabel}
          className="kh-focusable h-14 w-full rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white px-12 text-base font-bold text-[var(--khalsni-public-navy)] shadow-md outline-none placeholder:text-[var(--khalsni-public-text-muted)] focus:border-[var(--khalsni-public-primary)]"
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={dictionary.searchPlaceholder}
          ref={inputRef}
          role="combobox"
          value={query}
        />
      </label>

      {open ? (
        <div
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white text-start shadow-lift"
          id="home-service-search-list"
          role="listbox"
        >
          <div className="border-b border-[var(--khalsni-public-border)] px-4 py-3 text-xs font-extrabold text-[var(--khalsni-public-text-secondary)]">
            {loading ? dictionary.loading : dictionary.suggestionLabel}
          </div>
          {suggestions.length ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((item, index) => (
                <button
                  aria-selected={index === activeIndex}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-start transition ${index === activeIndex ? 'bg-[var(--khalsni-public-primary-soft)]' : 'hover:bg-[var(--khalsni-public-bg-secondary)]'}`}
                  key={item.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectSuggestion(item)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-[var(--khalsni-public-navy)]">{item.label}</span>
                    {item.description ? <span className="mt-0.5 block line-clamp-1 text-xs font-semibold text-[var(--khalsni-public-text-secondary)]">{item.description}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[0.68rem] font-extrabold text-[var(--khalsni-public-accent-text)] shadow-sm">
                    {item.type === 'category' ? dictionary.categoryType : dictionary.serviceType}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-start transition hover:bg-[var(--khalsni-public-primary-soft)]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSpecialRequest(query)}
              type="button"
            >
              <span>
                <span className="block text-sm font-extrabold text-[var(--khalsni-public-navy)]">{dictionary.noResults}</span>
                <span className="mt-1 block text-xs font-semibold text-[var(--khalsni-public-text-secondary)]">{dictionary.noResultsHint}</span>
              </span>
              <SendHorizontal aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)] rtl:-scale-x-100" />
            </button>
          )}
        </div>
      ) : null}
    </form>
  )
}


function HeroPreviewCard({ service, dictionary, isArabic, language, className = '' }) {
  const name = service ? getServiceName(service, language, isArabic ? 'خدمة' : 'Service') : dictionary.heroCardTitle
  const category = service?.category ? getCategoryName(service.category, language, '') : ''
  const durationLabel = service ? getServiceDuration(service, language).label : dictionary.servicesLabel
  const priceLabel = service ? getServicePublicPrice(service, language).label : dictionary.categoriesLabel
  const cover = getCover(service || { slug: name }, service?.category?.slug || '', { as: 'service' })
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = cover.hasImage && !imageFailed

  return (
    <div className={`w-64 overflow-hidden rounded-[var(--radius-xl)] border border-black/5 bg-white shadow-xl ${className}`}>
      <div className="kh-cover relative h-24 w-full" style={showImage ? undefined : cover.style}>
        {showImage ? (
          <img alt={name} className="absolute inset-0 h-full w-full object-cover" decoding="async" loading="lazy" onError={() => setImageFailed(true)} src={cover.imageUrl} />
        ) : (
          <>
            <span aria-hidden="true" className="kh-cover-pattern" />
            <Layers aria-hidden="true" className="kh-cover-glyph" />
          </>
        )}
        {category ? (
          <div className="kh-cover-content flex h-full items-start p-3">
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[0.65rem] font-extrabold text-[var(--khalsni-public-navy)]">{category}</span>
          </div>
        ) : null}
      </div>
      <div className="p-3 text-start">
        <p className="line-clamp-2 text-sm font-black leading-5 text-[var(--khalsni-public-navy)]">{name}</p>
        <div className="mt-2 flex items-center gap-3 text-[0.7rem] font-bold text-[var(--khalsni-public-text-secondary)]">
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 text-[var(--khalsni-public-accent-text)]" />
            <span className="truncate">{durationLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <WalletCards aria-hidden="true" className="h-3.5 w-3.5 text-[var(--khalsni-public-accent-text)]" />
            <span className="truncate">{priceLabel}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function HeroVisual({ services, categories, dictionary, isArabic, language }) {
  return (
    <div className="relative mx-auto w-full max-w-md lg:ms-auto lg:max-w-none">
      {/* Branded discovery stage */}
      <div className="kh-cover relative aspect-[4/3] w-full rounded-[var(--radius-2xl)] shadow-2xl sm:aspect-[5/4]" style={getCover({ slug: 'khalsni-hero' }).style}>
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
          fetchPriority="high"
          onError={(event) => { event.currentTarget.style.display = 'none' }}
          src={HERO_ILLUSTRATION}
        />
        <div className="kh-cover-content absolute inset-0" />
      </div>

      {/* Floating service preview cards */}
      <HeroPreviewCard
        className="absolute -start-4 top-6 -rotate-6 sm:-start-8"
        dictionary={dictionary}
        isArabic={isArabic}
        language={language}
        service={services[0]}
      />
      <HeroPreviewCard
        className="absolute -end-3 bottom-8 rotate-6 sm:-end-6"
        dictionary={dictionary}
        isArabic={isArabic}
        language={language}
        service={services[1] || services[0]}
      />

      {/* Metric chips */}
      <div className="absolute -top-4 end-6 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--khalsni-public-accent-text)] shadow-lg ring-1 ring-black/5">
        +{services.length} {dictionary.servicesLabel}
      </div>
      <div className="absolute -bottom-4 start-8 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--khalsni-public-navy)] shadow-lg ring-1 ring-black/5">
        {categories.length} {dictionary.categoriesLabel}
      </div>
    </div>
  )
}

function HomePage() {
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const dictionary = copy[isArabic ? 'ar' : 'en']
  const { data: services = [], loading: loadingServices } = useAsyncData(() => api.getServices(), [], [])
  const { data: categories = [], loading: loadingCategories } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const [customOpen, setCustomOpen] = useState(false)
  const [customService, setCustomService] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const publicServices = useMemo(() => services.filter(isPublicRecord), [services])
  const publicCategories = useMemo(() => categories.filter(isPublicRecord), [categories])
  const categorySections = useMemo(() => buildCategorySections(categories, services, language, isArabic), [categories, isArabic, language, services])
  const latestServices = useMemo(() => {
    const featured = publicServices.filter((service) => service.is_featured)
    const ordered = [...publicServices].sort((a, b) => getRecordTime(b) - getRecordTime(a))
    return uniqueByServiceId([...featured, ...ordered]).slice(0, 8)
  }, [publicServices])
  const categoryRows = useMemo(() => categorySections.filter((section) => section.services.length).slice(0, 2), [categorySections])
  const loadingCatalog = loadingServices || loadingCategories

  function openSpecialRequest(initialValue = '') {
    setCustomService(initialValue.trim())
    setCustomOpen(true)
    window.setTimeout(() => document.getElementById('special-request')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 20)
  }

  async function submitCustomRequest(event) {
    event.preventDefault()
    const serviceName = customService.trim()
    const contactValue = contact.trim()
    if (!serviceName || !contactValue) return

    setSubmitting(true)
    try {
      await api.createPublicMissingServiceRequest({
        service_name: serviceName.slice(0, 120),
        request_message: serviceName,
        requester_name: '',
        requester_phone: contactValue.includes('@') ? '' : contactValue,
        requester_email: contactValue.includes('@') ? contactValue : '',
        preferred_contact_channel: contactValue.includes('@') ? 'email' : 'phone',
        source: 'homepage_special_request',
      })
      toast(dictionary.specialSuccess, 'success')
      setCustomService('')
      setContact('')
      setCustomOpen(false)
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-[var(--khalsni-public-bg)] text-[var(--khalsni-public-text)]">
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              'radial-gradient(60% 55% at 88% 8%, color-mix(in srgb, var(--khalsni-public-primary) 16%, transparent) 0%, transparent 70%), radial-gradient(45% 45% at 4% 100%, color-mix(in srgb, var(--khalsni-public-primary) 10%, transparent) 0%, transparent 70%)',
          }}
        />
        <div className="kh-public-container grid items-center gap-12 pb-14 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.9fr)] lg:gap-16 lg:pb-20">
          <div className="max-w-2xl text-start">
            <span className="kh-eyebrow">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
              {dictionary.heroEyebrow}
            </span>
            <h1 className="kh-display-xl mt-5">
              {dictionary.headline}
              <span className="block text-[var(--khalsni-public-accent-text)]">{dictionary.headlineAccent}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-8 text-[var(--khalsni-public-text-secondary)] sm:text-lg">
              {dictionary.heroText}
            </p>
            <div className="mt-7 max-w-xl">
              <ServiceSearch categories={categories} loading={loadingCatalog} onSpecialRequest={openSpecialRequest} services={services} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="kh-focusable inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-6 text-sm font-extrabold text-white shadow-lg shadow-[color:color-mix(in_srgb,var(--khalsni-public-primary)_35%,transparent)] transition hover:bg-[var(--khalsni-public-primary-hover)] hover:shadow-xl" to="/services">
                {dictionary.browseServices}
                {isArabic ? <ArrowLeft aria-hidden="true" className="h-4 w-4" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}
              </Link>
              <Link className="kh-focusable inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-6 text-sm font-extrabold text-[var(--khalsni-public-navy)] shadow-sm transition hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)]" to="/track-order">
                {dictionary.trackRequest}
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-[var(--khalsni-public-text-secondary)]">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--khalsni-public-accent-text)]" />{dictionary.trustItems[0][0]}</span>
              <span className="inline-flex items-center gap-1.5"><WalletCards aria-hidden="true" className="h-4 w-4 text-[var(--khalsni-public-accent-text)]" />{dictionary.trustItems[1][0]}</span>
              <span className="inline-flex items-center gap-1.5"><FileText aria-hidden="true" className="h-4 w-4 text-[var(--khalsni-public-accent-text)]" />{dictionary.trustItems[2][0]}</span>
            </div>
          </div>

          <HeroVisual categories={publicCategories} dictionary={dictionary} isArabic={isArabic} language={language} services={latestServices} />
        </div>
      </section>

      <section className="kh-public-container grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-4">
        {dictionary.trustItems.map(([title, text], index) => {
          const Icon = [ShieldCheck, WalletCards, FileText, UploadCloud][index]
          return (
            <article className="flex items-start gap-3 rounded-[var(--radius-lg)] bg-white p-4 text-start shadow-sm ring-1 ring-[var(--khalsni-public-border)] transition hover:-translate-y-0.5 hover:shadow-md" key={title}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary-soft)] text-[var(--khalsni-public-accent-text)]">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-[var(--khalsni-public-navy)]">{title}</h2>
                <p className="mt-1 text-xs font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{text}</p>
              </div>
            </article>
          )
        })}
      </section>

      <ServiceRail
        action={<Link className="kh-focusable inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-4 text-sm font-extrabold text-[var(--khalsni-public-navy)] shadow-sm hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)]" to="/services">{dictionary.viewAll}</Link>}
        description={dictionary.latestText}
        eyebrow={isArabic ? 'اكتشف' : 'Discover'}
        id="home-latest-services"
        itemCount={latestServices.length}
        title={dictionary.latestTitle}
      >
        {loadingCatalog && !latestServices.length ? (
          Array.from({ length: 4 }).map((_, index) => <ServiceRailItem key={index} size="featured"><div className="h-96 animate-pulse rounded-[var(--radius-lg)] bg-[var(--khalsni-public-surface)] shadow-soft" /></ServiceRailItem>)
        ) : latestServices.length ? (
          latestServices.map((service) => (
            <ServiceRailItem key={service.id || service.slug} size="featured">
              <ServiceCard service={service} variant="featured" />
            </ServiceRailItem>
          ))
        ) : (
          <div className="w-full rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-8 text-center text-sm font-bold text-[var(--khalsni-public-text-secondary)]">
            {dictionary.emptyServices}
          </div>
        )}
      </ServiceRail>

      <ServiceRail
        action={<Link className="kh-focusable inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-4 text-sm font-extrabold text-[var(--khalsni-public-navy)] shadow-sm hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)]" to="/services">{dictionary.viewAll}</Link>}
        description={dictionary.categoriesText}
        eyebrow={isArabic ? 'تصفح' : 'Browse'}
        id="home-categories"
        itemCount={categorySections.length}
        title={dictionary.categoriesTitle}
      >
        {loadingCatalog && !categorySections.length ? (
          Array.from({ length: 5 }).map((_, index) => <ServiceRailItem key={index}><div className="h-80 animate-pulse rounded-[var(--radius-lg)] bg-[var(--khalsni-public-surface)] shadow-soft" /></ServiceRailItem>)
        ) : categorySections.length ? (
          categorySections.slice(0, 10).map((section) => (
            <ServiceRailItem key={section.id}>
              <CategoryCard category={section.category} count={section.count} />
            </ServiceRailItem>
          ))
        ) : (
          <div className="w-full rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-8 text-center text-sm font-bold text-[var(--khalsni-public-text-secondary)]">
            {dictionary.emptyCategories}
          </div>
        )}
      </ServiceRail>

      {categoryRows.length ? (
        <section className="kh-public-container py-8 sm:py-11">
          <div className="mb-6 max-w-3xl text-start">
            <span className="kh-eyebrow mb-3">{isArabic ? 'مجموعات' : 'Collections'}</span>
            <h2 className="text-[1.75rem] font-black leading-tight tracking-tight text-[var(--khalsni-public-navy)] sm:text-4xl">{dictionary.categoryRowsTitle}</h2>
            <p className="mt-2.5 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{dictionary.categoryRowsText}</p>
          </div>
          <div className="grid gap-5">
            {categoryRows.map((section) => (
              <article className="rounded-[var(--radius-xl)] bg-white p-4 shadow-soft ring-1 ring-[var(--khalsni-public-border)] sm:p-5" key={section.id}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3 text-start">
                  <div>
                    <h3 className="text-xl font-black text-[var(--khalsni-public-navy)]">{section.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-[var(--khalsni-public-text-secondary)]">
                      {section.count} {dictionary.serviceCount}
                    </p>
                  </div>
                  <Link className="text-sm font-extrabold text-[var(--khalsni-public-accent-text)] hover:text-[var(--khalsni-public-primary-hover)]" to={categoryPath(section.category)}>
                    {dictionary.viewAll}
                  </Link>
                </div>
                <div className="kh-rail-scroll -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
                  {section.services.slice(0, 6).map((service) => (
                    <div className="w-[74vw] shrink-0 snap-start xs:w-[15rem] sm:w-[16rem]" key={service.id || service.slug}>
                      <ServiceCard service={service} variant="compact" />
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden py-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[var(--khalsni-public-bg-secondary)]"
        />
        <div className="kh-public-container">
          <div className="max-w-2xl text-start">
            <span className="kh-eyebrow mb-3">{isArabic ? 'الخطوات' : 'How it works'}</span>
            <h2 className="text-[1.75rem] font-black leading-tight tracking-tight text-[var(--khalsni-public-navy)] sm:text-4xl">{dictionary.howTitle}</h2>
            <p className="mt-2.5 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{dictionary.howText}</p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dictionary.steps.map(([title, text], index) => {
              const StepIcon = [Search, FileText, UploadCloud, CheckCircle2][index]
              return (
                <li className="relative rounded-[var(--radius-lg)] bg-white p-5 text-start shadow-sm ring-1 ring-[var(--khalsni-public-border)]" key={title}>
                  <span className="absolute -top-3 inset-inline-start-5 grid h-9 w-9 place-items-center rounded-full bg-[var(--khalsni-public-primary)] text-sm font-black text-white shadow-md">
                    {index + 1}
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary-soft)] text-[var(--khalsni-public-accent-text)]">
                    <StepIcon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-black text-[var(--khalsni-public-navy)]">{title}</h3>
                  <p className="mt-1.5 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{text}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="kh-public-container pb-10 pt-6" id="special-request">
        <article className="overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-soft ring-1 ring-[var(--khalsni-public-border)]">
          <div className="grid gap-0 md:grid-cols-[0.62fr_1fr]">
            <ImageFallback alt="" className="aspect-[16/10] min-h-48 md:h-full" imgClassName="object-cover" src={CUSTOM_REQUEST_ILLUSTRATION} />
            <div className="p-5 text-start sm:p-6">
              <h2 className="text-2xl font-black text-[var(--khalsni-public-navy)]">{dictionary.specialTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{dictionary.specialText}</p>
              <button className="kh-focusable mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-extrabold text-[var(--khalsni-public-navy)] transition hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]" onClick={() => setCustomOpen((current) => !current)} type="button">
                <ChevronDown aria-hidden="true" className={`h-4 w-4 transition ${customOpen ? 'rotate-180' : ''}`} />
                {dictionary.noResults}
              </button>
              {customOpen ? (
                <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_16rem_auto]" onSubmit={submitCustomRequest}>
                  <input className="kh-focusable h-11 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-semibold text-[var(--khalsni-public-navy)] outline-none placeholder:text-[var(--khalsni-public-text-muted)] focus:border-[var(--khalsni-public-primary)]" onChange={(event) => setCustomService(event.target.value)} placeholder={dictionary.specialService} required value={customService} />
                  <input className="kh-focusable h-11 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-semibold text-[var(--khalsni-public-navy)] outline-none placeholder:text-[var(--khalsni-public-text-muted)] focus:border-[var(--khalsni-public-primary)]" onChange={(event) => setContact(event.target.value)} placeholder={dictionary.specialContact} required value={contact} />
                  <button className="kh-focusable inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
                    {submitting ? dictionary.sending : dictionary.specialSubmit}
                    {submitting ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <SendHorizontal aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}

export default HomePage
