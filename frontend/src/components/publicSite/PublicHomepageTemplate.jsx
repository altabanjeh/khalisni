import { Bot, Megaphone, MessageCircleMore, Phone, Search, SendHorizontal, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { getLocalizedField } from '../../utils/i18n'
import LoadingSpinner from '../LoadingSpinner'
import ServiceCard from '../ServiceCard'
import { isExternalUrl } from '../../utils/publicSiteDefaults'

function ActionLink({ className, label, to }) {
  if (!to || !label) return null
  if (isExternalUrl(to)) {
    return (
      <a className={className} href={to} rel="noreferrer" target="_blank">
        {label}
      </a>
    )
  }
  return (
    <Link className={className} to={to}>
      {label}
    </Link>
  )
}

function getAdvertisementTypeLabel(type, isArabic) {
  const labels = {
    new_service: { ar: 'خدمة جديدة', en: 'New service' },
    office_announcement: { ar: 'إعلان إداري', en: 'Office announcement' },
    offer: { ar: 'عرض', en: 'Offer' },
    important_alert: { ar: 'تنبيه مهم', en: 'Important alert' },
    general: { ar: 'عام', en: 'General' },
  }

  return labels[type]?.[isArabic ? 'ar' : 'en'] || String(type || '').replace(/_/g, ' ')
}

function AdvertisementCard({ advertisement, compact = false, language, isArabic }) {
  const backgroundColor = advertisement.background_color || 'rgba(255,255,255,0.92)'
  const textColor = advertisement.text_color || 'var(--public-text-color)'
  const title = getLocalizedField(advertisement, { ar: 'title_ar', en: 'title_en' }, language)
  const description = getLocalizedField(advertisement, { ar: 'description_ar', en: 'description_en' }, language)
  const buttonText = getLocalizedField(advertisement, { ar: 'button_text_ar', en: 'button_text_en' }, language)

  return (
    <article
      className={`overflow-hidden rounded-[2rem] border border-border shadow-soft ${compact ? 'p-5' : 'p-6'}`}
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`${advertisement.image_url ? 'grid gap-5 lg:grid-cols-[1fr_220px]' : 'space-y-4'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{getAdvertisementTypeLabel(advertisement.advertisement_type, isArabic)}</p>
          <h3 className="mt-3 text-2xl font-extrabold">{title}</h3>
          <p className="mt-3 text-sm leading-7 opacity-90">{description}</p>
          {advertisement.button_url && buttonText ? (
            <div className="mt-5">
              <ActionLink
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                label={buttonText}
                to={advertisement.button_url}
              />
            </div>
          ) : null}
        </div>
        {advertisement.image_url ? (
          <img
            alt={title}
            className="h-full max-h-56 w-full rounded-[1.5rem] object-cover"
            src={advertisement.image_url}
          />
        ) : null}
      </div>
    </article>
  )
}

const ignoredChatTokens = new Set([
  'اريد',
  'أريد',
  'ابحث',
  'أبحث',
  'عن',
  'على',
  'هل',
  'توجد',
  'يوجد',
  'عندي',
  'خدمة',
  'الخدمة',
  'خدمات',
  'معاملة',
  'المعاملة',
  'التطبيق',
  'موجودة',
  'موجود',
  'غير',
  'في',
  'من',
  'الى',
  'إلى',
  'i',
  'need',
  'want',
  'looking',
  'look',
  'search',
  'for',
  'service',
  'services',
  'request',
  'application',
  'app',
  'not',
  'found',
  'missing',
  'need-a',
])

const homeCopy = {
  ar: {
    heroBadge: 'منصة أردنية قابلة للتحديث من لوحة الإدارة',
    serviceAssistantLabel: 'مساعد الخدمات',
    serviceAssistantTitle: 'اسأل عن خدمة غير موجودة في التطبيق',
    serviceAssistantDescription: 'اكتب اسم الخدمة أو الجهة، وسنخبرك إن كانت موجودة أو نوجّهك لطلبها من فريق الدعم.',
    quickPrompts: [
      'أريد خدمة تجديد جواز سفر',
      'هل توجد خدمة للضمان الاجتماعي؟',
      'عندي خدمة غير موجودة في التطبيق',
    ],
    searchPlaceholder: 'مثال: أريد خدمة معاملة خاصة بوزارة العمل وغير موجودة في التطبيق',
    namePlaceholder: 'الاسم',
    phonePlaceholder: 'رقم الهاتف',
    emailPlaceholder: 'البريد الإلكتروني',
    channels: {
      whatsapp: 'واتساب',
      phone: 'اتصال',
      email: 'بريد إلكتروني',
    },
    submitQuestion: 'إرسال السؤال',
    submittingQuestion: 'جارٍ الإرسال...',
    searchServices: 'بحث في الخدمات',
    missingServiceNote: 'عند عدم العثور على الخدمة، يتم إنشاء طلب متابعة مباشر يصل إلى الإدارة وموظف الدعم.',
    flowSteps: [
      'اكتب الخدمة أو الجهة المطلوبة',
      'استلم نتيجة فورية أو اقتراحات جاهزة',
      'إذا كانت موجودة سنعرضها لك مباشرة',
      'وإذا كانت غير موجودة يذهب الطلب للإدارة والدعم',
    ],
    previewFlowStep: 'وفي المعاينة يمكنك اختبار السيناريو',
    featureSection: [
      { title: 'سريع وواضح', text: 'إدارة محتوى الصفحة الرئيسية لا تحتاج لأي تدخل تقني بعد الإعداد.' },
      { title: 'وثائقك محمية', text: 'ملفات العملاء تبقى ضمن النظام الحالي بصلاحيات الوصول الموجودة بدون أي كسر للمنطق.' },
      { title: 'تشغيل احترافي', text: 'التنبيهات والإعلانات تظهر تلقائياً فقط إذا كانت فعّالة وضمن التاريخ المحدد.' },
    ],
    howItWorksEyebrow: 'كيف تعمل المنصة',
    howItWorksTitle: 'خطوات واضحة للعميل والإدارة',
    contactEyebrow: 'تواصل معنا',
    contactTitle: 'قنوات الدعم العامة',
    phoneLabel: 'الهاتف',
    whatsappLabel: 'واتساب',
    emailLabel: 'البريد الإلكتروني',
    addressLabel: 'العنوان',
    announcementsEyebrow: 'الإعلانات والتنبيهات',
    announcementsTitle: 'محتوى ترويجي وتحديثات عامة قابلة للإدارة',
    activeAds: (count) => `${count} إعلان نشط`,
    noAds: 'لا توجد إعلانات نشطة حالياً.',
    featuredEyebrow: 'الخدمات المميزة',
    featuredTitle: 'ابدأ من أكثر الخدمات طلباً',
    allServices: 'كل الخدمات',
    previewModeLabel: 'وضع المعاينة',
    operationsEyebrow: 'معلومة تشغيلية',
    operationsTitle: 'هذا المحتوى يُدار بالكامل من لوحة الإدارة',
    operationsCards: [
      'يمكن للإدارة تعديل النصوص، الألوان، الشعار، صورة البطل، والإعلانات بدون تغيير الكود.',
      'الإعلانات المهمة تظهر تلقائياً كتنبيه عاجل عندما تكون فعّالة وضمن الفترة الزمنية المحددة.',
    ],
    previewFooter: 'هذه معاينة داخل لوحة الإدارة.',
    liveFooter: 'يمكن ربط هذه البيانات مع حملات أو تنبيهات تشغيلية لاحقاً.',
    welcomeMessage: 'مرحباً، اكتب الخدمة التي تريدها. إذا لم تكن موجودة سنحوّل الطلب مباشرة إلى الإدارة وموظف الدعم للمتابعة.',
    matchedMessage: 'وجدت خدمات قريبة من طلبك داخل التطبيق. يمكنك فتح الخدمة مباشرة أو مشاهدة كل النتائج.',
    mismatchButton: 'الخدمة غير مطابقة',
    missingMessage: 'لم أجد هذه الخدمة داخل التطبيق. إذا كانت بيانات التواصل مكتملة فسأرسل الطلب الآن إلى الإدارة وموظف الدعم.',
    contactRequiredMessage: 'أدخل رقم الهاتف أو البريد الإلكتروني أسفل المربع ثم أعد الإرسال ليصل الطلب إلى الإدارة والدعم.',
    contactButton: 'تواصل معنا',
    supportWhatsapp: 'واتساب الدعم',
    requestCreated: (requestNumber, contactChannel) => `تم إرسال طلبك بنجاح برقم ${requestNumber}. وصل الآن إلى الإدارة وموظف الدعم، وسيتم التواصل معك عبر ${contactChannel}.`,
    requestToast: 'تم إرسال الطلب إلى الإدارة والدعم.',
  },
  en: {
    heroBadge: 'A Jordanian platform managed directly from the admin panel',
    serviceAssistantLabel: 'Service assistant',
    serviceAssistantTitle: 'Ask about a service that is not listed yet',
    serviceAssistantDescription: 'Type the service name or authority and we will either find it or route a follow-up request to the support team.',
    quickPrompts: [
      'I need a passport renewal service',
      'Is there a social security service?',
      'I need a service that is not listed in the app',
    ],
    searchPlaceholder: 'Example: I need a Ministry of Labour service that is not listed in the app',
    namePlaceholder: 'Name',
    phonePlaceholder: 'Phone number',
    emailPlaceholder: 'Email address',
    channels: {
      whatsapp: 'WhatsApp',
      phone: 'Phone call',
      email: 'Email',
    },
    submitQuestion: 'Send question',
    submittingQuestion: 'Sending...',
    searchServices: 'Search services',
    missingServiceNote: 'If no matching service is found, a direct follow-up request is created for admin and support.',
    flowSteps: [
      'Type the service or authority you need',
      'Get an instant answer or ready suggestions',
      'If it exists, we will show it immediately',
      'If not, the request goes to admin and support',
    ],
    previewFlowStep: 'In preview mode you can test the full scenario',
    featureSection: [
      { title: 'Fast and clear', text: 'Homepage content can be managed without technical changes after setup.' },
      { title: 'Your documents stay protected', text: 'Customer files remain inside the current system and respect the existing access model.' },
      { title: 'Operationally reliable', text: 'Alerts and advertisements only appear automatically when they are active and in schedule.' },
    ],
    howItWorksEyebrow: 'How the platform works',
    howItWorksTitle: 'Clear steps for customers and admins',
    contactEyebrow: 'Contact us',
    contactTitle: 'Public support channels',
    phoneLabel: 'Phone',
    whatsappLabel: 'WhatsApp',
    emailLabel: 'Email',
    addressLabel: 'Address',
    announcementsEyebrow: 'Announcements and alerts',
    announcementsTitle: 'Promotional content and public updates managed from admin',
    activeAds: (count) => `${count} active ads`,
    noAds: 'There are no active announcements right now.',
    featuredEyebrow: 'Featured services',
    featuredTitle: 'Start with the most requested services',
    allServices: 'All services',
    previewModeLabel: 'Preview mode',
    operationsEyebrow: 'Operational note',
    operationsTitle: 'This content is fully managed from the admin panel',
    operationsCards: [
      'Admins can update text, colors, logo, hero image, and ads without changing code.',
      'Important alerts appear automatically when they are active and within the configured schedule.',
    ],
    previewFooter: 'This is a preview inside the admin panel.',
    liveFooter: 'These entries can later be connected to campaigns or operational alerts.',
    welcomeMessage: 'Welcome. Type the service you need. If it is not available, we will send a follow-up request directly to admin and support.',
    matchedMessage: 'I found services close to your request in the app. You can open one directly or review all results.',
    mismatchButton: 'Not the right service',
    missingMessage: 'I could not find this service in the app. If your contact details are filled in, I will send the request to admin and support now.',
    contactRequiredMessage: 'Add a phone number or email below, then send again so the request can reach admin and support.',
    contactButton: 'Contact us',
    supportWhatsapp: 'Support WhatsApp',
    requestCreated: (requestNumber, contactChannel) => `Your request was submitted successfully with number ${requestNumber}. It has been sent to admin and support, and they will contact you via ${contactChannel}.`,
    requestToast: 'The request was sent to admin and support.',
  },
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractSearchTokens(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignoredChatTokens.has(token))
}

function getServiceSearchText(service) {
  return normalizeText([
    service?.name_ar,
    service?.name_en,
    service?.category?.name_ar,
    service?.category?.name_en,
    service?.description_ar,
    service?.description_en,
  ].filter(Boolean).join(' '))
}

function getWhatsappUrl(phoneNumber) {
  const normalized = String(phoneNumber || '').replace(/[^\d]/g, '')
  return normalized ? `https://wa.me/${normalized}` : ''
}

function deriveServiceNameFromMessage(message) {
  const tokens = extractSearchTokens(message).slice(0, 6)
  return tokens.join(' ') || String(message || '').trim().slice(0, 120)
}

function PublicHomepageTemplate({
  allServices = [],
  advertisements,
  content,
  featuredServices,
  loadingServices,
  previewMode = false,
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const copy = homeCopy[isArabic ? 'ar' : 'en']
  const heroTitle = getLocalizedField(content, { ar: 'hero_title_ar', en: 'hero_title_en' }, language)
  const heroSubtitle = getLocalizedField(content, { ar: 'hero_subtitle_ar', en: 'hero_subtitle_en' }, language)
  const primaryButtonText = getLocalizedField(content, { ar: 'primary_button_text', en: 'primary_button_text_en' }, language)
  const secondaryButtonText = getLocalizedField(content, { ar: 'secondary_button_text', en: 'secondary_button_text_en' }, language)
  const howItWorksText = getLocalizedField(content, { ar: 'how_it_works_text', en: 'how_it_works_text_en' }, language)
  const officeAddress = getLocalizedField(content, { ar: 'office_address', en: 'office_address_en' }, language)

  const [chatInput, setChatInput] = useState('')
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [contactForm, setContactForm] = useState({
    requester_name: '',
    requester_phone: '',
    requester_email: '',
    preferred_contact_channel: 'whatsapp',
  })
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      text: copy.welcomeMessage,
    },
  ])

  const bannerAdvertisements = advertisements.slice(0, 3)
  const whatsappUrl = getWhatsappUrl(content.whatsapp_number)

  useEffect(() => {
    setChatMessages((currentMessages) => {
      if (currentMessages.length !== 1 || currentMessages[0]?.id !== 'assistant-welcome') return currentMessages
      return [{ id: 'assistant-welcome', role: 'assistant', text: copy.welcomeMessage }]
    })
  }, [copy.welcomeMessage])

  useEffect(() => {
    setContactForm((current) => ({
      ...current,
      requester_name: current.requester_name || user?.full_name || '',
      requester_phone: current.requester_phone || user?.phone || '',
      requester_email: current.requester_email || user?.email || '',
    }))
  }, [user?.email, user?.full_name, user?.phone])

  async function submitMissingServiceRequest(message) {
    setSubmittingRequest(true)
    try {
      const created = await api.createPublicMissingServiceRequest({
        service_name: deriveServiceNameFromMessage(message),
        request_message: message,
        requester_name: contactForm.requester_name,
        requester_phone: contactForm.requester_phone,
        requester_email: contactForm.requester_email,
        preferred_contact_channel: contactForm.preferred_contact_channel,
        source: 'homepage_chat',
      })

      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-submitted-${Date.now()}`,
          role: 'assistant',
          text: copy.requestCreated(created.request_number, copy.channels[contactForm.preferred_contact_channel] || contactForm.preferred_contact_channel),
          mode: 'submitted',
        },
      ])
      toast(copy.requestToast, 'success')
      setChatInput('')
    } catch (error) {
      const messageText = getDisplayError(error)
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: messageText,
          mode: 'error',
        },
      ])
      toast(messageText, 'error')
    } finally {
      setSubmittingRequest(false)
    }
  }

  async function handleChatSubmit(event) {
    event?.preventDefault?.()
    const nextMessage = chatInput.trim()
    if (!nextMessage) return

    const normalizedMessage = normalizeText(nextMessage)
    const messageTokens = extractSearchTokens(nextMessage)
    const matchedServices = allServices
      .filter((service) => {
        const serviceText = getServiceSearchText(service)
        return serviceText.includes(normalizedMessage) || messageTokens.some((token) => serviceText.includes(token))
      })
      .slice(0, 3)

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: nextMessage,
    }

    const assistantMessage = matchedServices.length
      ? {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: copy.matchedMessage,
          matches: matchedServices,
          mode: 'matched',
          originalText: nextMessage,
        }
      : {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: copy.missingMessage,
          mode: 'missing',
        }

    setChatMessages((currentMessages) => [...currentMessages, userMessage, assistantMessage])
    if (matchedServices.length) {
      setChatInput('')
      return
    }

    const hasContactInfo = contactForm.requester_phone.trim() || contactForm.requester_email.trim()
    if (!hasContactInfo) {
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `assistant-contact-${Date.now()}`,
          role: 'assistant',
          text: copy.contactRequiredMessage,
          mode: 'missing',
        },
      ])
      return
    }

    await submitMissingServiceRequest(nextMessage)
  }

  return (
    <div className="space-y-8">
      <section className="public-hero-section relative overflow-hidden rounded-[2rem] px-6 py-16 text-white shadow-soft">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_28%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/90">
              {copy.heroBadge}
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">{heroTitle}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">{heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink className="public-primary-button" label={primaryButtonText} to={content.primary_button_url} />
              <ActionLink className="public-secondary-button" label={secondaryButtonText} to={content.secondary_button_url} />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 text-ink shadow-[0_24px_60px_rgba(15,53,84,0.18)]">
            {content.hero_image_url ? (
              <img
                alt={heroTitle}
                className="mb-5 h-40 w-full rounded-[1.5rem] object-cover"
                src={content.hero_image_url}
              />
            ) : null}
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                <Bot className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-brand-700">{copy.serviceAssistantLabel}</p>
                <h2 className="mt-1 text-xl font-extrabold text-ink">{copy.serviceAssistantTitle}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.serviceAssistantDescription}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-[1.75rem] bg-slate-50 p-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 ${
                    message.role === 'user'
                      ? `${isArabic ? 'mr-auto' : 'ml-auto'} bg-brand-700 text-white`
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <p>{message.text}</p>
                  {message.matches?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.matches.map((service) => (
                        <button
                          key={service.id}
                          className="rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-100"
                          onClick={() => navigate(`/services/${service.slug}`)}
                          type="button"
                        >
                          {getLocalizedField(service, { ar: 'name_ar', en: 'name_en' }, language)}
                        </button>
                      ))}
                      <button
                        className="rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                        onClick={() => setChatInput(message.originalText || '')}
                        type="button"
                      >
                        {copy.mismatchButton}
                      </button>
                    </div>
                  ) : null}
                  {message.mode === 'missing' ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-full bg-brand-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-800"
                        onClick={() => navigate('/contact')}
                        type="button"
                      >
                        {copy.contactButton}
                      </button>
                      {whatsappUrl ? (
                        <a
                          className="rounded-full border border-brand-200 px-3 py-2 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
                          href={whatsappUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {copy.supportWhatsapp}
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {copy.quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  onClick={() => setChatInput(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleChatSubmit}>
              <textarea
                className="field min-h-28 bg-white text-ink"
                placeholder={copy.searchPlaceholder}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="field"
                  placeholder={copy.namePlaceholder}
                  value={contactForm.requester_name}
                  onChange={(event) => setContactForm((current) => ({ ...current, requester_name: event.target.value }))}
                />
                <select
                  className="field"
                  value={contactForm.preferred_contact_channel}
                  onChange={(event) => setContactForm((current) => ({ ...current, preferred_contact_channel: event.target.value }))}
                >
                  {Object.entries(copy.channels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  placeholder={copy.phonePlaceholder}
                  value={contactForm.requester_phone}
                  onChange={(event) => setContactForm((current) => ({ ...current, requester_phone: event.target.value }))}
                />
                <input
                  className="field"
                  placeholder={copy.emailPlaceholder}
                  value={contactForm.requester_email}
                  onChange={(event) => setContactForm((current) => ({ ...current, requester_email: event.target.value }))}
                />
              </div>
              <p className="text-xs leading-6 text-slate-500">{copy.missingServiceNote}</p>
              <div className="flex flex-wrap gap-3">
                <button className="public-primary-button" disabled={submittingRequest} type="submit">
                  <SendHorizontal className="h-4 w-4" />
                  {submittingRequest ? copy.submittingQuestion : copy.submitQuestion}
                </button>
                <button
                  className="public-secondary-button !border-slate-200 !text-brand-700"
                  onClick={() => navigate(`/services?search=${encodeURIComponent(chatInput.trim())}`)}
                  type="button"
                >
                  <Search className="h-4 w-4" />
                  {copy.searchServices}
                </button>
              </div>
            </form>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[...copy.flowSteps.slice(0, 3), previewMode ? copy.previewFlowStep : copy.flowSteps[3]].map((item, index) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <span className="mb-2 block text-xs font-bold text-brand-700">0{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {bannerAdvertisements.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {bannerAdvertisements.map((advertisement) => (
            <AdvertisementCard
              key={advertisement.id || advertisement.advertisement_id}
              advertisement={advertisement}
              compact
              isArabic={isArabic}
              language={language}
            />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {copy.featureSection.map((item) => (
          <div key={item.title} className="glass-panel p-6">
            <h3 className="text-xl font-bold text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <span className="icon-chip">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-700">{copy.howItWorksEyebrow}</p>
              <h2 className="section-title text-2xl">{copy.howItWorksTitle}</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-8 text-slate-600">{howItWorksText}</p>
        </div>
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <span className="icon-chip">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-700">{copy.contactEyebrow}</p>
              <h2 className="section-title text-2xl">{copy.contactTitle}</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">{copy.phoneLabel}</p>
              <p className="mt-1">{content.contact_phone}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">{copy.whatsappLabel}</p>
              <p className="mt-1">{content.whatsapp_number}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">{copy.emailLabel}</p>
              <p className="mt-1">{content.email}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">{copy.addressLabel}</p>
              <p className="mt-1">{officeAddress}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-700">{copy.announcementsEyebrow}</p>
            <h2 className="section-title">{copy.announcementsTitle}</h2>
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {copy.activeAds(advertisements.length)}
          </span>
        </div>
        {advertisements.length ? (
          <div className="grid gap-5">
            {advertisements.map((advertisement) => (
              <AdvertisementCard
                key={advertisement.id || advertisement.advertisement_id}
                advertisement={advertisement}
                isArabic={isArabic}
                language={language}
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6 text-sm text-slate-500">{copy.noAds}</div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-700">{copy.featuredEyebrow}</p>
            <h2 className="section-title">{copy.featuredTitle}</h2>
          </div>
          {!previewMode ? (
            <Link className="btn-secondary" to="/services">
              {copy.allServices}
            </Link>
          ) : (
            <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">{copy.previewModeLabel}</span>
          )}
        </div>
        {loadingServices ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section className="glass-panel p-6">
        <div className="flex items-center gap-3">
          <span className="icon-chip">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-700">{copy.operationsEyebrow}</p>
            <h2 className="text-xl font-bold text-ink">{copy.operationsTitle}</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {copy.operationsCards.map((item) => (
            <div key={item} className="rounded-2xl border border-border bg-brand-50/60 p-4 text-sm text-slate-600">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <MessageCircleMore className="h-4 w-4" />
          {previewMode ? copy.previewFooter : copy.liveFooter}
        </div>
      </section>
    </div>
  )
}

export default PublicHomepageTemplate
