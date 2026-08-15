import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe2,
  Landmark,
  Search,
  SendHorizontal,
  Smartphone,
  Stamp,
  Star,
  UsersRound,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { usePublicSite } from '../../context/PublicSiteContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getCategoryDescription, getCategoryName, getServiceName } from '../../utils/servicePresentation'

const heroImage = '/images/homepage/hero-property.jpg'

const referenceCategories = [
  {
    title: 'العقارات والأراضي',
    description: 'جميع معاملات الملكية وتسوية الأراضي',
    count: 21,
    image: '/images/homepage/category-real-estate.jpg',
    icon: Building2,
    search: 'العقارات',
    services: ['إفراز', 'كشف مساحي', 'نقل ملكية', 'رخصة بناء', 'سند تسجيل'],
  },
  {
    title: 'خدمات الشركات والأعمال',
    description: 'تأسيس وتنظيم الشركات والسجل التجاري',
    count: 34,
    image: '/images/homepage/category-business.jpg',
    icon: BriefcaseBusiness,
    search: 'الشركات',
    services: ['تأسيس شركة', 'تعديل بيانات شركة', 'تجديد السجل التجاري', 'شطب شركة', 'زيادة رأس المال'],
  },
  {
    title: 'الضرائب والرسوم البلدية',
    description: 'دفع الضرائب والرسوم الحكومية والبلدية',
    count: 18,
    image: '/images/homepage/category-tax.jpg',
    icon: Landmark,
    search: 'الضرائب',
    services: ['ضريبة الدخل', 'رسوم بلدية', 'ضريبة المبيعات', 'ضريبة الشقق', 'براءة ذمة ضريبية'],
  },
  {
    title: 'خدمات المركبات والنقل',
    description: 'جميع معاملات المركبات والترخيص',
    count: 16,
    image: '/images/homepage/category-transport.jpg',
    icon: Car,
    search: 'المركبات',
    services: ['تسجيل مركبة', 'تجديد ترخيص', 'نقل ملكية مركبة', 'إلغاء ترخيص', 'رخصة قيادة'],
  },
  {
    title: 'العمالة والإقامة',
    description: 'استقدام وتجديد وإلغاء تصاريح العمل',
    count: 15,
    image: '/images/homepage/category-labor.jpg',
    icon: UsersRound,
    search: 'الإقامة',
    services: ['إصدار إقامة', 'تجديد إقامة', 'استقدام عامل', 'إلغاء إقامة', 'تصريح عمل'],
  },
  {
    title: 'الوثائق والتصديقات',
    description: 'توثيق وتصديق وترجمة جميع الوثائق',
    count: 22,
    image: '/images/homepage/category-documents.jpg',
    icon: Stamp,
    search: 'الوثائق',
    services: ['تصديق وثيقة', 'ترجمة معتمدة', 'وكالة', 'شهادة عدم محكومية', 'تصديق الجامعات'],
  },
  {
    title: 'الخدمات الدولية',
    description: 'معاملات خارج الأردن وفي السفارات',
    count: 12,
    image: '/images/homepage/category-international.jpg',
    icon: Globe2,
    search: 'الدولية',
    services: ['معاملة سفارة', 'استخراج فيزا', 'شهادة دولية', 'تصديق دولي', 'مرضى بتسهيلات'],
  },
]

const howSteps = [
  { icon: BellRing, title: 'اختر الخدمة', text: 'حدد المعاملة التي تحتاجها.' },
  { icon: FileText, title: 'أرسل طلبك', text: 'أرفق البيانات والوثائق المطلوبة.' },
  { icon: UsersRound, title: 'نحن نتابعها', text: 'يتابع الفريق الطلب مع الجهة المختصة.' },
  { icon: CheckCircle2, title: 'استلم النتيجة', text: 'تصلك النتيجة النهائية بأمان.' },
]

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function serviceRequestPath(service) {
  const serviceId = service?.id || service?.service_id
  return serviceId ? `/create-order?service=${encodeURIComponent(serviceId)}` : '/services'
}

function fallbackSearchPath(label) {
  return `/services?search=${encodeURIComponent(label)}`
}

function categoryHref(category, fallback) {
  if (category?.slug) return `/services/category/${category.slug}`
  return fallbackSearchPath(fallback.search || fallback.title)
}

function categoryAllHref(category, fallback) {
  if (category?.slug) return `/services?category=${encodeURIComponent(category.slug)}`
  return fallbackSearchPath(fallback.search || fallback.title)
}

function QrPattern() {
  const activeCells = new Set([0, 1, 2, 4, 5, 6, 8, 12, 14, 16, 18, 19, 20, 22, 24, 28, 29, 31, 33, 35, 38, 40, 42, 43, 45, 46, 48])

  return (
    <div className="grid h-24 w-24 grid-cols-7 gap-1 rounded-md bg-white p-2 sm:h-28 sm:w-28">
      {Array.from({ length: 49 }).map((_, index) => (
        <span className={`rounded-[1px] ${activeCells.has(index) ? 'bg-[#03122b]' : 'bg-transparent'}`} key={index} />
      ))}
    </div>
  )
}

function StoreBadge({ label, name }) {
  return (
    <span className="inline-flex h-9 min-w-32 items-center justify-center gap-2 rounded-md border border-white/20 bg-black px-3 text-left text-white">
      <Smartphone className="h-4 w-4" />
      <span className="leading-none">
        <span className="block text-[0.5rem] font-bold uppercase text-white/55">{label}</span>
        <span className="block text-xs font-extrabold">{name}</span>
      </span>
    </span>
  )
}

function buildCategoryRows(categories, services, language) {
  const publicServices = services.filter(isPublicRecord)
  const publicCategories = categories.filter(isPublicRecord)
  const servicesByCategory = publicServices.reduce((accumulator, service) => {
    const key = service.category?.slug || service.category?.id
    if (!key) return accumulator
    if (!accumulator[key]) accumulator[key] = []
    accumulator[key].push(service)
    return accumulator
  }, {})

  if (!publicCategories.length) {
    return referenceCategories.map((fallback, index) => ({
      id: `fallback-${index}`,
      fallback,
      title: fallback.title,
      description: fallback.description,
      count: fallback.count,
      image: fallback.image,
      Icon: fallback.icon,
      category: null,
      services: [],
      fallbackServices: fallback.services,
    }))
  }

  return publicCategories.slice(0, 7).map((category, index) => {
    const fallback = referenceCategories[index] || referenceCategories[referenceCategories.length - 1]
    const key = category.slug || category.id
    const categoryServices = (servicesByCategory[key] || []).slice(0, 5)
    return {
      id: key || `category-${index}`,
      fallback,
      title: getCategoryName(category, language, fallback.title),
      description: getCategoryDescription(category, language, fallback.description),
      count: category.service_count ?? categoryServices.length,
      image: category.image_url || category.image || fallback.image,
      Icon: fallback.icon,
      category,
      services: categoryServices,
      fallbackServices: fallback.services,
    }
  })
}

function HomePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { content } = usePublicSite()
  const { language } = useLanguage()
  const { data: services = [], loading: loadingServices } = useAsyncData(() => api.getServices(), [], [])
  const { data: categories = [], loading: loadingCategories } = useAsyncData(() => api.getPublicServiceCategories(), [], [])
  const [search, setSearch] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [customService, setCustomService] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const categoryRows = useMemo(() => buildCategoryRows(categories, services, language), [categories, language, services])
  const publicServices = useMemo(() => services.filter(isPublicRecord), [services])
  const popularServices = useMemo(() => {
    const featured = publicServices.filter((service) => service.is_featured)
    return (featured.length ? featured : publicServices).slice(0, 5)
  }, [publicServices])
  const searchShortcuts = popularServices.length ? popularServices : referenceCategories[0].services

  function handleSearch(event) {
    event.preventDefault()
    const query = search.trim()
    navigate(query ? `/services?search=${encodeURIComponent(query)}` : '/services')
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
        requester_phone: contactValue.includes('@') ? '' : contactValue,
        requester_email: contactValue.includes('@') ? contactValue : '',
        preferred_contact_channel: contactValue.includes('@') ? 'email' : 'phone',
        source: 'homepage_card',
      })
      toast('تم إرسال طلبك الخاص بنجاح.', 'success')
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
    <div className="bg-[var(--khalsni-public-bg)] pb-2 text-white">
      <section
        className="relative overflow-hidden border-b border-[rgba(127,166,224,0.35)]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(2,10,27,0.93) 0%, rgba(3,16,43,0.76) 45%, rgba(2,10,27,0.42) 100%), url(${content.hero_image_url || heroImage})`,
          backgroundPosition: 'center right',
          backgroundSize: 'cover',
        }}
      >
        <div className="kh-public-container relative min-h-[224px] py-7 sm:min-h-[250px] sm:py-9" dir="ltr">
          <div className="max-w-[560px] text-center sm:ml-14 sm:text-right lg:ml-24" dir="rtl">
            <h1 className="text-[2rem] font-extrabold leading-[1.34] text-white sm:text-[2.55rem] lg:text-[3rem]">
              ركّز على حياتك
              <span className="block text-[var(--khalsni-public-primary)]">وخلي المعاملات علينا</span>
            </h1>
            <p className="mx-auto mt-3 max-w-[520px] text-sm font-bold leading-7 text-white/106 sm:mx-0 sm:text-base">
              منصة ذكية لإنجاز معاملاتك الحكومية والإدارية بسهولة وأمان من مكان واحد
            </p>

            <form className="mx-auto mt-5 flex max-w-[500px] flex-col gap-2 sm:mx-0 sm:flex-row" onSubmit={handleSearch}>
              <button className="order-2 h-11 rounded-md bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)] sm:order-1" type="submit">
                اطلب خدمة
              </button>
              <label className="relative order-1 block min-w-0 flex-1 sm:order-2">
                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--khalsni-public-primary)]" />
                <input
                  className="h-11 w-full rounded-md border border-white/20 bg-white pr-11 text-sm font-semibold text-[#071634] outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث عن خدمة أو معاملة"
                  value={search}
                />
              </label>
            </form>

            <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs font-bold text-white/70 sm:justify-start">
              <span>الأكثر طلباً:</span>
              {searchShortcuts.map((item) => {
                const service = typeof item === 'string' ? null : item
                const label = service ? getServiceName(service, language, 'خدمة') : item
                const href = service ? serviceRequestPath(service) : fallbackSearchPath(label)
                return (
                  <Link className="hover:text-white" key={label} to={href}>
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="kh-public-container mt-2 space-y-1.5">
        {(loadingCategories || loadingServices) && !categoryRows.length ? (
          Array.from({ length: 5 }).map((_, index) => <div className="h-[118px] animate-pulse rounded-lg border border-[var(--khalsni-public-border)] bg-white/10" key={index} />)
        ) : (
          categoryRows.map((row, index) => {
            const Icon = row.Icon
            return (
              <article
                className="relative overflow-hidden rounded-lg border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
                key={row.id}
                dir="ltr"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(2,10,27,0.42), rgba(4,20,45,0.84) 43%, rgba(2,10,27,0.99) 100%), url(${row.image})`,
                  backgroundPosition: 'center right',
                  backgroundSize: 'cover',
                }}
              >
                <div className="grid min-h-[118px] gap-3 px-4 py-4 min-[700px]:grid-cols-[180px_1fr] min-[700px]:items-end lg:min-h-[124px] lg:grid-cols-[210px_1fr]">
                  <div className="text-right" dir="rtl">
                    <div className="flex items-start justify-between gap-3 min-[700px]:block">
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-[#071634]/100 px-2 text-sm font-extrabold text-white/100 ring-1 ring-white/10">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="inline-grid h-9 w-9 place-items-center rounded-full border border-[#2f8cff]/40 bg-[#1261ff]/15 text-[#87b8ff] min-[700px]:mt-3">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <h2 className="mt-2 text-[1.25rem] font-extrabold leading-7 text-white sm:text-[1.45rem]">{row.title}</h2>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-white/70">{row.description}</p>
                    <p className="mt-1 text-xs font-bold text-white/50">{row.count} خدمة متاحة</p>
                    <Link className="mt-2 hidden text-xs font-extrabold text-white/108 hover:text-white min-[700px]:inline-flex" to={categoryAllHref(row.category, row.fallback)}>
                      عرض جميع الخدمات
                    </Link>
                  </div>

                  <div className="grid content-end gap-2" dir="rtl">
                    <Link className="inline-flex items-center justify-center text-xs font-extrabold text-white/106 hover:text-white min-[700px]:hidden" to={categoryAllHref(row.category, row.fallback)}>
                      عرض جميع الخدمات
                    </Link>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 min-[700px]:grid-cols-5">
                      {(row.services.length ? row.services : row.fallbackServices).slice(0, 5).map((item) => {
                        const service = typeof item === 'string' ? null : item
                        const label = service ? getServiceName(service, language, 'خدمة') : item
                        const href = service ? serviceRequestPath(service) : fallbackSearchPath(label)
                        return (
                          <Link className="flex h-9 items-center justify-center rounded-md border border-white/10 bg-white/10 px-2 text-center text-[0.68rem] font-extrabold leading-4 text-white/108 transition hover:border-[var(--khalsni-public-primary)] hover:bg-[var(--khalsni-public-primary)]" key={label} to={href}>
                            {label}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <Link className="absolute left-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-[var(--khalsni-public-primary)] min-[700px]:grid" to={categoryHref(row.category, row.fallback)} aria-label="فتح التصنيف">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
                <Link className="absolute right-3 top-1/2 hidden h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-[var(--khalsni-public-primary)] min-[700px]:grid" to={categoryHref(row.category, row.fallback)} aria-label="فتح التصنيف">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </article>
            )
          })
        )}
      </section>

      <section className="kh-public-container mt-1.5">
        <article
          className="relative overflow-hidden rounded-lg border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)]"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(2,10,27,0.5), rgba(4,20,45,0.78) 44%, rgba(2,10,27,0.99) 100%), url(/images/homepage/custom-request.jpg)',
            backgroundPosition: 'center right',
            backgroundSize: 'cover',
          }}
        >
          <div className="grid min-h-[116px] gap-4 px-4 py-4 text-right md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-[#071634]/100 px-2 text-sm font-extrabold text-white/100 ring-1 ring-white/10">08</span>
              <h2 className="mt-2 text-[1.55rem] font-extrabold text-white">طلب خاص</h2>
              <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-white/75">إذا خدمة ما لقيتها، اطلبها من خلصني.</p>
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/40 px-4 text-sm font-extrabold text-white transition hover:bg-white/10" onClick={() => setCustomOpen((current) => !current)} type="button">
              <Star className="h-4 w-4" />
              قدم طلبك الخاص
            </button>
          </div>
          {customOpen ? (
            <form className="grid gap-3 border-t border-white/10 bg-[#020a1b]/70 px-4 py-4 sm:grid-cols-[1fr_16rem_auto]" onSubmit={submitCustomRequest}>
              <input className="h-10 rounded-md border border-white/15 bg-white px-4 text-sm font-semibold text-[#071634] outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)]" onChange={(event) => setCustomService(event.target.value)} placeholder="اسم الخدمة أو الجهة" required value={customService} />
              <input className="h-10 rounded-md border border-white/15 bg-white px-4 text-sm font-semibold text-[#071634] outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)]" onChange={(event) => setContact(event.target.value)} placeholder="هاتف أو بريد إلكتروني" required value={contact} />
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
                {submitting ? 'جاري الإرسال...' : 'إرسال'}
                <SendHorizontal className="h-4 w-4" />
              </button>
            </form>
          ) : null}
        </article>
      </section>

      <section className="kh-public-container mt-1.5">
        <div className="rounded-lg border border-[var(--khalsni-public-border)] bg-[#061634] px-4 py-5 text-center">
          <h2 className="text-2xl font-extrabold text-white">كيف تعمل خلصني؟</h2>
          <p className="mt-1 text-sm font-semibold text-white/60">أربع خطوات بسيطة لإنجاز معاملتك</p>
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            {howSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div className="relative text-center" key={step.title}>
                  {index < howSteps.length - 1 ? <span className="absolute left-[-2.3rem] top-8 hidden w-20 border-t border-dashed border-white/30 md:block" /> : null}
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#2f8cff]/40 bg-[#071f4b] text-white shadow-[0_0_28px_rgba(18,97,255,0.2)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className="text-2xl font-extrabold text-white">{index + 1}</span>
                    <h3 className="text-sm font-extrabold text-white">{step.title}</h3>
                  </div>
                  <p className="mx-auto mt-1 max-w-36 text-xs font-semibold leading-5 text-white/60">{step.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="kh-public-container mt-1.5">
        <div className="overflow-hidden rounded-lg border border-[var(--khalsni-public-border)] bg-[#061634] px-5 py-5">
          <div className="grid items-center gap-6 md:grid-cols-[0.8fr_1.3fr_0.7fr]">
            <div className="flex justify-center gap-3 md:justify-start">
              {[0, 1].map((item) => (
                <div className={`h-40 w-20 rounded-[1.25rem] border-[5px] border-[#0a1020] bg-white p-1 shadow-2xl shadow-black/40 sm:h-48 sm:w-24 ${item ? 'mt-4' : ''}`} key={item}>
                  <div className="h-full rounded-[0.9rem] bg-[#f5f8ff] p-2">
                    <div className="h-6 rounded-md bg-[var(--khalsni-public-primary)]" />
                    <div className="mt-3 space-y-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <span className="block h-2.5 rounded bg-slate-200" key={index} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">تابع طلبك من التطبيق</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-white/70">
                حمل تطبيق خلصني وتابع حالة طلباتك بكل جديد من هاتفك.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <StoreBadge label="Download on the" name="App Store" />
                <StoreBadge label="Get it on" name="Google Play" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 text-right">
              <QrPattern />
              <p className="max-w-24 text-sm font-extrabold leading-6 text-white/80">امسح لتحميل التطبيق</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
