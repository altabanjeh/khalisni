import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  FileText,
  Globe2,
  Landmark,
  Loader2,
  Search,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Stamp,
  TimerReset,
  UploadCloud,
  UsersRound,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { usePublicSite } from '../../context/PublicSiteContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import {
  getCategoryDescription,
  getCategoryName,
  getServiceDescription,
  getServiceName,
} from '../../utils/servicePresentation'

const heroImage = '/images/homepage/hero-property.jpg'

const categoryVisuals = [
  {
    icon: Building2,
    image: '/images/homepage/category-real-estate.jpg',
    match: ['real', 'estate', 'land', 'property', 'عقار', 'أراضي', 'اراضي'],
  },
  {
    icon: BriefcaseBusiness,
    image: '/images/homepage/category-business.jpg',
    match: ['business', 'company', 'companies', 'commercial', 'شركة', 'شركات', 'أعمال', 'اعمال'],
  },
  {
    icon: Landmark,
    image: '/images/homepage/category-tax.jpg',
    match: ['tax', 'fee', 'municipal', 'ضريبة', 'ضرائب', 'رسوم', 'بلدية'],
  },
  {
    icon: Car,
    image: '/images/homepage/category-transport.jpg',
    match: ['vehicle', 'transport', 'car', 'license', 'مركبة', 'مركبات', 'نقل', 'ترخيص'],
  },
  {
    icon: UsersRound,
    image: '/images/homepage/category-labor.jpg',
    match: ['labor', 'residency', 'work', 'worker', 'إقامة', 'اقامة', 'عمالة', 'عمل'],
  },
  {
    icon: Stamp,
    image: '/images/homepage/category-documents.jpg',
    match: ['document', 'attestation', 'certificate', 'translation', 'وثائق', 'تصديق', 'تصديقات', 'ترجمة'],
  },
  {
    icon: Globe2,
    image: '/images/homepage/category-international.jpg',
    match: ['international', 'embassy', 'visa', 'global', 'دولي', 'دولية', 'سفارة', 'فيزا'],
  },
]

const fallbackVisual = {
  icon: FileText,
  image: '/images/homepage/category-documents.jpg',
}

const copy = {
  ar: {
    heroEyebrow: 'منصة خدمات حكومية وإدارية',
    headline: 'ركّز على حياتك',
    headlineAccent: 'وخلّي المعاملات علينا',
    heroText: 'ابحث عن الخدمة، اعرف المتطلبات، وابدأ طلبك من مسار واضح يحافظ على نفس سير العمل الرسمي.',
    startCta: 'ابدأ طلبك',
    browseCta: 'تصفح الخدمات',
    trackCta: 'تتبع طلب',
    searchPlaceholder: 'ابحث عن خدمة أو تصنيف',
    loading: 'جاري تحميل الخدمات...',
    servicesLabel: 'خدمات',
    categoriesLabel: 'تصنيفات',
    suggestionLabel: 'اقتراحات مباشرة',
    noResults: 'طلب خدمة غير موجودة / طلب خاص',
    noResultsHint: 'لم نجد خدمة مطابقة. أرسل طلباً خاصاً وسيتابع الفريق احتياجك.',
    categoryType: 'تصنيف',
    serviceType: 'خدمة',
    benefitsTitle: 'تجربة واحدة للمعاملات اليومية',
    benefits: [
      ['اختيار واضح للخدمة', 'كل خدمة تعرض متطلباتها قبل بدء الطلب.'],
      ['متابعة دقيقة', 'حالة الطلب والمسؤول الحالي ظاهران للعميل.'],
      ['وثائق منظمة', 'تحميل ومراجعة المستندات داخل نفس المسار.'],
    ],
    categoriesTitle: 'خدمات حسب المجال',
    categoriesText: 'تصفح المجالات الرئيسية كما هي معرفة في نظام إدارة الخدمات، مع عرض عينة من الخدمات الفعلية داخل كل مجال.',
    browseAll: 'عرض جميع الخدمات',
    serviceCount: 'خدمة متاحة',
    emptyCategory: 'لا توجد خدمات ظاهرة حالياً داخل هذا التصنيف.',
    specialTitle: 'طلب خاص',
    specialText: 'إذا لم تجد الخدمة المطلوبة، أرسل اسم الخدمة ووسيلة التواصل دون أن يطغى هذا المسار على كتالوج الخدمات الرئيسي.',
    specialService: 'اسم الخدمة أو الجهة',
    specialContact: 'هاتف أو بريد إلكتروني',
    specialSubmit: 'إرسال الطلب',
    sending: 'جاري الإرسال...',
    specialSuccess: 'تم إرسال طلبك الخاص بنجاح.',
    howTitle: 'كيف تعمل خلصني؟',
    howText: 'مسار مختصر وواضح من اختيار الخدمة إلى اكتمال الطلب.',
    steps: [
      ['اختر الخدمة', 'ابحث أو تصفح التصنيفات واختر الخدمة المناسبة.'],
      ['راجع المتطلبات', 'اطلع على الوثائق، السعر، والمدة المتوقعة.'],
      ['أرسل الطلب', 'أدخل بياناتك وارفع المستندات المطلوبة.'],
      ['تابع الحالة', 'اعرف من يحتاج إلى التصرف حتى اكتمال الطلب.'],
    ],
    portalTitle: 'بوابة العميل تعمل بسلاسة على الهاتف',
    portalText: 'تابع الطلبات، ارفع الوثائق المطلوبة، وراجع حالة المعاملة من نفس التجربة المتجاوبة.',
  },
  en: {
    heroEyebrow: 'Government and administrative services platform',
    headline: 'Focus on your life',
    headlineAccent: 'and leave the paperwork to us',
    heroText: 'Search for a service, understand the requirements, and start a request through the existing official workflow.',
    startCta: 'Start Request',
    browseCta: 'Browse services',
    trackCta: 'Track request',
    searchPlaceholder: 'Search services or categories',
    loading: 'Loading services...',
    servicesLabel: 'Services',
    categoriesLabel: 'Categories',
    suggestionLabel: 'Direct suggestions',
    noResults: 'Request a service / Special request',
    noResultsHint: 'No matching service was found. Send a special request and the team will follow up.',
    categoryType: 'Category',
    serviceType: 'Service',
    benefitsTitle: 'One experience for daily paperwork',
    benefits: [
      ['Clear service selection', 'Each service shows what is needed before you start.'],
      ['Accurate tracking', 'Current request status and responsibility are visible.'],
      ['Organized documents', 'Upload and review files inside the same request flow.'],
    ],
    categoriesTitle: 'Services by domain',
    categoriesText: 'Browse the main domains from the service management system, with real services shown inside each domain.',
    browseAll: 'Browse all services',
    serviceCount: 'available services',
    emptyCategory: 'No public services are currently visible in this category.',
    specialTitle: 'Special request',
    specialText: 'If the needed service is not listed, send the service name and contact method without replacing the main catalog path.',
    specialService: 'Service or authority name',
    specialContact: 'Phone or email',
    specialSubmit: 'Send request',
    sending: 'Sending...',
    specialSuccess: 'Your special request was sent.',
    howTitle: 'How Khalsni Works',
    howText: 'A simple path from service selection to completion.',
    steps: [
      ['Choose a service', 'Search or browse categories and select the right service.'],
      ['Review requirements', 'Check documents, price, and expected duration.'],
      ['Submit request', 'Enter your details and upload the required documents.'],
      ['Track progress', 'See who needs to act until the request is complete.'],
    ],
    portalTitle: 'The customer portal works well on mobile',
    portalText: 'Track requests, upload required documents, and review the transaction status from the same responsive experience.',
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

function getCategoryVisual(category, index) {
  const haystack = normalize([
    category?.slug,
    category?.name_ar,
    category?.name_en,
    category?.description_ar,
    category?.description_en,
  ].filter(Boolean).join(' '))
  const matched = categoryVisuals.find((visual) => visual.match.some((token) => haystack.includes(normalize(token))))
  const visual = matched || categoryVisuals[index % categoryVisuals.length] || fallbackVisual
  return {
    Icon: visual.icon,
    image: category?.image_url || category?.image || visual.image,
  }
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
    const visual = getCategoryVisual(category, index)
    const categoryServices = (servicesByCategory[key] || []).filter(isPublicRecord)
    return {
      id: key || `category-${index}`,
      category,
      title: getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category'),
      description: getCategoryDescription(category, language, isArabic ? 'خدمات مرتبة داخل هذا المجال.' : 'Services grouped in this domain.'),
      count: category.service_count ?? categoryServices.length,
      services: categoryServices,
      ...visual,
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
    if (!normalizedQuery) return searchItems.slice(0, 7)
    return searchItems
      .filter((item) => [item.label, item.description, ...(item.keywords || [])].some((value) => normalize(value).includes(normalizedQuery)))
      .slice(0, 8)
  }, [query, searchItems])

  function selectSuggestion(item) {
    if (!item) return
    navigate(item.href)
    setOpen(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex])
      return
    }
    const trimmed = query.trim()
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
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--khalsni-public-primary)]" />
        {loading ? <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" /> : null}
        <input
          aria-autocomplete="list"
          aria-controls="home-service-search-list"
          aria-expanded={open}
          aria-label={dictionary.searchPlaceholder}
          className="h-14 w-full rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white pl-12 pr-12 text-base font-bold text-ink shadow-soft outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20"
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
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white text-right shadow-2xl"
          id="home-service-search-list"
          role="listbox"
        >
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-extrabold text-slate-500">
            {loading ? dictionary.loading : dictionary.suggestionLabel}
          </div>
          {suggestions.length ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((item, index) => (
                <button
                  aria-selected={index === activeIndex}
                  className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-right transition ${index === activeIndex ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(item)}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold text-ink">{item.label}</span>
                    {item.description ? <span className="mt-0.5 block line-clamp-1 text-xs font-semibold text-slate-500">{item.description}</span> : null}
                  </span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[0.68rem] font-extrabold text-slate-600">
                    {item.type === 'category' ? dictionary.categoryType : dictionary.serviceType}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-right transition hover:bg-brand-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSpecialRequest(query)}
              type="button"
            >
              <span>
                <span className="block text-sm font-extrabold text-ink">{dictionary.noResults}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500">{dictionary.noResultsHint}</span>
              </span>
              <SendHorizontal className="h-4 w-4 shrink-0 text-[var(--khalsni-public-primary)]" />
            </button>
          )}
        </div>
      ) : null}
    </form>
  )
}

function HomePage() {
  const { toast } = useToast()
  const { content } = usePublicSite()
  const { language, isArabic } = useLanguage()
  const dictionary = copy[isArabic ? 'ar' : 'en']
  const { data: services = [], loading: loadingServices } = useAsyncData(() => api.getServices(), [], [])
  const { data: categories = [], loading: loadingCategories } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const [customOpen, setCustomOpen] = useState(false)
  const [customService, setCustomService] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categorySections = useMemo(() => buildCategorySections(categories, services, language, isArabic), [categories, isArabic, language, services])
  const publicServices = useMemo(() => services.filter(isPublicRecord), [services])
  const loadingCatalog = loadingServices || loadingCategories
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight

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
      <section className="border-b border-[var(--khalsni-public-border)] bg-white">
        <div className="kh-public-container grid gap-8 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-10">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">
              <Sparkles className="h-4 w-4" />
              {dictionary.heroEyebrow}
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              {dictionary.headline}
              <span className="block text-[var(--khalsni-public-primary)]">{dictionary.headlineAccent}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base font-semibold leading-8 text-slate-600">{dictionary.heroText}</p>
            <div className="mt-6 max-w-xl">
              <ServiceSearch categories={categories} loading={loadingCatalog} onSpecialRequest={openSpecialRequest} services={services} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]" to="/services">
                {dictionary.startCta}
                <ArrowIcon className="h-4 w-4" />
              </Link>
              <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-5 text-sm font-extrabold text-ink transition hover:bg-slate-50" to="/track-order">
                {dictionary.trackCta}
              </Link>
            </div>
          </div>

          <div className="relative min-h-[270px] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-slate-100 shadow-soft sm:min-h-[330px]">
            <img
              alt={isArabic ? 'عميل يتابع معاملة من منصة خلصني' : 'Customer following a service request through Khalsni'}
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              src={content.hero_image_url || heroImage}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,22,52,0.08),rgba(7,22,52,0.68))]" />
            <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[var(--radius-md)] bg-white/92 p-3 shadow-lg backdrop-blur">
                <p className="text-2xl font-black text-ink">{publicServices.length}</p>
                <p className="text-xs font-bold text-slate-500">{dictionary.servicesLabel}</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-white/92 p-3 shadow-lg backdrop-blur">
                <p className="text-2xl font-black text-ink">{categorySections.length}</p>
                <p className="text-xs font-bold text-slate-500">{dictionary.categoriesLabel}</p>
              </div>
              <div className="rounded-[var(--radius-md)] bg-white/92 p-3 shadow-lg backdrop-blur">
                <p className="text-2xl font-black text-[var(--khalsni-public-primary)]">24/7</p>
                <p className="text-xs font-bold text-slate-500">{isArabic ? 'متابعة رقمية' : 'Digital tracking'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kh-public-container grid gap-3 py-5 md:grid-cols-3">
        {dictionary.benefits.map(([title, text], index) => {
          const BenefitIcon = [ShieldCheck, TimerReset, UploadCloud][index]
          return (
            <article className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4 shadow-sm" key={title}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-[var(--khalsni-public-primary)]">
                <BenefitIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-ink">{title}</h2>
                <p className="mt-1 text-xs font-semibold leading-6 text-slate-600">{text}</p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="kh-public-container py-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-[var(--khalsni-public-primary)]">{dictionary.benefitsTitle}</p>
            <h2 className="mt-1 text-3xl font-black text-ink">{dictionary.categoriesTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-slate-600">{dictionary.categoriesText}</p>
          </div>
          <Link className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-extrabold text-ink transition hover:bg-slate-50" to="/services">
            {dictionary.browseCta}
          </Link>
        </div>

        {loadingCatalog && !categorySections.length ? (
          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => <div className="h-44 animate-pulse rounded-[var(--radius-xl)] bg-white shadow-soft" key={index} />)}
          </div>
        ) : categorySections.length ? (
          <div className="grid gap-4">
            {categorySections.slice(0, 8).map((section) => {
              const Icon = section.Icon
              return (
                <article className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white shadow-soft" key={section.id}>
                  <div className="grid md:grid-cols-[minmax(15rem,0.78fr)_1fr]">
                    <Link className="relative block min-h-48 overflow-hidden md:min-h-full" to={categoryPath(section.category)}>
                      <img alt={section.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 hover:scale-[1.03]" loading="lazy" src={section.image} />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,22,52,0.08),rgba(7,22,52,0.74))]" />
                      <span className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-white text-[var(--khalsni-public-primary)] shadow-lg">
                        <Icon className="h-6 w-6" />
                      </span>
                    </Link>
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-2xl font-black text-ink">{section.title}</h3>
                          <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{section.description}</p>
                        </div>
                        <span className="w-fit rounded-full bg-brand-50 px-4 py-2 text-xs font-extrabold text-brand-700">
                          {section.count} {dictionary.serviceCount}
                        </span>
                      </div>
                      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                        {section.services.length ? (
                          section.services.slice(0, 8).map((service) => (
                            <Link
                              className="inline-flex min-h-11 min-w-[11rem] max-w-[14rem] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-slate-50 px-4 text-center text-xs font-extrabold leading-5 text-ink transition hover:border-[var(--khalsni-public-primary)] hover:bg-brand-50 hover:text-[var(--khalsni-public-primary)]"
                              key={service.id || service.slug}
                              to={serviceDetailsPath(service)}
                            >
                              {getServiceName(service, language, isArabic ? 'خدمة' : 'Service')}
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm font-semibold text-slate-500">{dictionary.emptyCategory}</p>
                        )}
                      </div>
                      <Link className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]" to={categoryPath(section.category)}>
                        {dictionary.browseAll}
                        <ArrowIcon className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--khalsni-public-border)] bg-white p-8 text-center shadow-soft">
            <p className="text-lg font-extrabold text-ink">{isArabic ? 'لا توجد تصنيفات منشورة حالياً.' : 'No public categories are published yet.'}</p>
          </div>
        )}
      </section>

      <section className="kh-public-container py-6" id="special-request">
        <article className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white shadow-soft">
          <div className="grid gap-5 md:grid-cols-[0.82fr_1fr] md:items-stretch">
            <div className="relative min-h-48 overflow-hidden">
              <img alt={dictionary.specialTitle} className="absolute inset-0 h-full w-full object-cover" loading="lazy" src="/images/homepage/custom-request.jpg" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,22,52,0.08),rgba(7,22,52,0.62))]" />
            </div>
            <div className="p-5 sm:p-6">
              <h2 className="text-2xl font-black text-ink">{dictionary.specialTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-7 text-slate-600">{dictionary.specialText}</p>
              <button className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-extrabold text-ink transition hover:bg-slate-50" onClick={() => setCustomOpen((current) => !current)} type="button">
                <ChevronDown className={`h-4 w-4 transition ${customOpen ? 'rotate-180' : ''}`} />
                {dictionary.noResults}
              </button>
              {customOpen ? (
                <form className="mt-4 grid gap-3 lg:grid-cols-[1fr_16rem_auto]" onSubmit={submitCustomRequest}>
                  <input className="h-11 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-semibold text-ink outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20" onChange={(event) => setCustomService(event.target.value)} placeholder={dictionary.specialService} required value={customService} />
                  <input className="h-11 rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-semibold text-ink outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20" onChange={(event) => setContact(event.target.value)} placeholder={dictionary.specialContact} required value={contact} />
                  <button className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
                    {submitting ? dictionary.sending : dictionary.specialSubmit}
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="kh-public-container grid gap-4 py-6 lg:grid-cols-[0.72fr_1fr] lg:items-center">
        <div>
          <h2 className="text-3xl font-black text-ink">{dictionary.howTitle}</h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{dictionary.howText}</p>
          <div className="mt-5 rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white p-5 shadow-soft">
            <h3 className="text-xl font-black text-ink">{dictionary.portalTitle}</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{dictionary.portalText}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {dictionary.steps.map(([title, text], index) => {
            const StepIcon = [Search, FileText, UploadCloud, CheckCircle2][index]
            return (
              <article className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-5 shadow-sm" key={title}>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-brand-50 text-[var(--khalsni-public-primary)]">
                    <StepIcon className="h-5 w-5" />
                  </span>
                  <span className="text-3xl font-black text-slate-200">{index + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{text}</p>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default HomePage
