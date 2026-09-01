import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Layers3,
  ListChecks,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ServiceCard from '../../components/ServiceCard'
import {
  EmptyState,
  ImageFallback,
  PublicLinkButton,
  PublicLoading,
  PublicPageShell,
  PublicPanel,
  SectionHeader,
} from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'
import { getLocalizedField } from '../../utils/i18n'
import {
  getCategoryName,
  getServiceDescription,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../../utils/servicePresentation'

function getRequiredDocumentLabel(item, language) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  return getLocalizedField(item, { ar: 'name_ar', en: 'name_en' }, language, item.document_type || '')
}

function getServiceNameFromRelation(item, key, language) {
  return getLocalizedField(item?.[key], { ar: 'name_ar', en: 'name_en' }, language)
}

function normalizeInformationSchema(schema) {
  if (Array.isArray(schema)) return schema
  if (Array.isArray(schema?.fields)) return schema.fields
  return []
}

function getInformationFieldLabel(field, language, index) {
  const fallback = field?.label || field?.name || field?.key || `Field ${index + 1}`
  return getLocalizedField(field, { ar: 'label_ar', en: 'label_en' }, language, fallback)
}

function getInformationFieldHelp(field, language) {
  return getLocalizedField(
    field,
    { ar: 'help_text_ar', en: 'help_text_en' },
    language,
    field?.description || field?.helpText || '',
  )
}

function getVisiblePricingItems(pricing, language, isArabic) {
  return [
    pricing?.total_price != null
      ? { key: 'total', label: isArabic ? 'السعر الظاهر' : 'Public price', value: formatCurrency(pricing.total_price, language) }
      : null,
    pricing?.government_fee != null
      ? { key: 'government', label: isArabic ? 'رسوم حكومية' : 'Government fee', value: formatCurrency(pricing.government_fee, language) }
      : null,
    pricing?.company_fee != null
      ? { key: 'company', label: isArabic ? 'رسوم خدمة' : 'Service fee', value: formatCurrency(pricing.company_fee, language) }
      : null,
  ].filter(Boolean)
}

function DetailPill({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4">
      <p className="flex items-center gap-2 text-xs font-bold text-[var(--khalsni-public-text-muted)]">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-primary)]" />
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-extrabold text-[var(--khalsni-public-navy)] sm:text-base">{value}</p>
    </div>
  )
}

function ServiceDetailsPage() {
  const { language, isArabic } = useLanguage()
  const { slug } = useParams()
  const { data: service, loading, error } = useAsyncData(() => api.getService(slug), [slug], null)
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight

  if (loading) {
    return (
      <PublicPageShell>
        <PublicLoading label={isArabic ? 'جاري تحميل الخدمة...' : 'Loading service...'} />
      </PublicPageShell>
    )
  }

  if (error || !service) {
    return (
      <PublicPageShell>
        <EmptyState
          icon={Layers3}
          title={isArabic ? 'تعذر تحميل الخدمة' : 'Could not load service'}
          description={isArabic ? 'تحقق من رابط الخدمة أو عد إلى دليل الخدمات المنشورة.' : 'Check the service link or return to the published services directory.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'فتح دليل الخدمات' : 'Open services'}</PublicLinkButton>}
        />
      </PublicPageShell>
    )
  }

  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language, '')
  const categoryName = getCategoryName(service.category, language, isArabic ? 'الخدمات' : 'Services')
  const serviceImageUrl = service.image_url || service.image || service.category?.image_url || service.category?.image
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const pricing = service.pricing || {}
  const visiblePricingItems = getVisiblePricingItems(pricing, language, isArabic)
  const publicPriceNote = isArabic ? pricing.public_note_ar : pricing.public_note_en
  const requestPath = `/create-order?service=${service.id}`
  const terms = getLocalizedField(service, { ar: 'terms_ar', en: 'terms_en' }, language, '')
  const informationFields = normalizeInformationSchema(service.required_information_schema)
  const requiredDocuments = (service.required_documents || [])
    .map((item, index) => ({
      id: item?.id || item?.definition_id || item?.document_type || `required-document-${index}`,
      label: getRequiredDocumentLabel(item, language),
      instructions: getLocalizedField(item, { ar: 'instructions_ar', en: 'instructions_en' }, language, ''),
      required: item?.is_required !== false,
    }))
    .filter((item) => item.label)
  const prerequisiteServices = service.prerequisite_services || []
  const recommendedServices = service.recommended_services || []
  const relatedServices = service.related_services || recommendedServices.map((item) => item.target_service).filter(Boolean)
  const steps = (isArabic ? service.steps : service.steps_en) || []
  const notices = [
    service.requires_appointment
      ? {
          key: 'appointment',
          title: isArabic ? 'تتطلب موعداً' : 'Appointment required',
          description: isArabic ? 'سيتم التعامل مع الموعد ضمن مسار الطلب الحالي.' : 'The appointment is handled within the current request flow.',
        }
      : null,
    service.requires_manual_review
      ? {
          key: 'manual-review',
          title: isArabic ? 'تحتاج مراجعة' : 'Manual review',
          description: isArabic ? 'قد يراجع فريق خلصني البيانات قبل المتابعة.' : 'Khalsni may review the details before continuing.',
        }
      : null,
    service.provider_required
      ? {
          key: 'provider',
          title: isArabic ? 'قد تتضمن مزود خدمة' : 'Provider-supported',
          description: isArabic ? 'تبقى علاقة المزود محكومة بالإعدادات الحالية.' : 'Provider handling remains governed by current settings.',
        }
      : null,
    service.is_online === false
      ? {
          key: 'offline',
          title: isArabic ? 'ليست إلكترونية بالكامل' : 'Not fully online',
          description: isArabic ? 'قد تحتاج متابعة خارجية حسب إعدادات الخدمة.' : 'External follow-up may be required based on service settings.',
        }
      : null,
  ].filter(Boolean)

  return (
    <PublicPageShell className="pb-24 lg:pb-7">
      <section className="grid gap-5 rounded-[var(--radius-xl)] bg-white p-4 text-start shadow-soft ring-1 ring-[var(--khalsni-public-border)] sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <ImageFallback
          alt={serviceName}
          className="aspect-[16/10] min-h-56 rounded-[var(--radius-lg)] lg:min-h-[23rem]"
          icon={FileText}
          src={serviceImageUrl}
        />

        <div className="min-w-0 space-y-5 lg:px-4">
          <div>
            <Link
              className="kh-focusable inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1.5 text-sm font-extrabold text-[var(--khalsni-public-primary)] transition hover:bg-brand-100"
              to={service.category?.slug ? `/services/category/${service.category.slug}` : '/services'}
            >
              <Layers3 aria-hidden="true" className="h-4 w-4" />
              {categoryName}
            </Link>
            <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--khalsni-public-navy)] sm:text-4xl lg:text-5xl">{serviceName}</h1>
            {serviceDescription ? (
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">
                {serviceDescription}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DetailPill icon={Clock3} label={isArabic ? 'المدة' : 'Duration'} value={duration.label} />
            <DetailPill icon={WalletCards} label={isArabic ? 'السعر' : 'Price'} value={price.label} />
            <DetailPill icon={ShieldCheck} label={isArabic ? 'التصنيف' : 'Category'} value={categoryName} />
          </div>

          {duration.note || price.note ? (
            <div className="rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
              {[duration.note, price.note].filter(Boolean).join(' · ')}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <PublicLinkButton className="w-full sm:w-auto" to={requestPath}>
              {isArabic ? 'ابدأ الطلب' : 'Start request'}
            </PublicLinkButton>
            <PublicLinkButton className="w-full sm:w-auto" to="/services" variant="secondary">
              {isArabic ? 'كل الخدمات' : 'All services'}
            </PublicLinkButton>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="space-y-6">
          <PublicPanel>
            <SectionHeader
              eyebrow={isArabic ? 'نظرة عامة' : 'Overview'}
              icon={Info}
              title={isArabic ? 'ما الذي تحتاج معرفته قبل البدء؟' : 'What to know before starting'}
              description={serviceDescription}
            />
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <DetailPill icon={Clock3} label={isArabic ? 'مدة الإنجاز' : 'Duration'} value={duration.label} />
              <DetailPill icon={ReceiptText} label={isArabic ? 'السعر الظاهر' : 'Visible price'} value={price.label} />
              <DetailPill icon={Layers3} label={isArabic ? 'التصنيف' : 'Category'} value={categoryName} />
            </div>
          </PublicPanel>

          <PublicPanel>
            <SectionHeader
              eyebrow={isArabic ? 'المستندات المطلوبة' : 'Required documents'}
              icon={FileText}
              title={isArabic ? 'جهز ملفاتك قبل بدء الطلب' : 'Prepare files before starting'}
            />
            {requiredDocuments.length ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {requiredDocuments.map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-extrabold leading-7 text-[var(--khalsni-public-navy)]">{item.label}</p>
                      <span className={item.required ? 'rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'}>
                        {item.required ? (isArabic ? 'مطلوب' : 'Required') : isArabic ? 'اختياري' : 'Optional'}
                      </span>
                    </div>
                    {item.instructions ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{item.instructions}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-bg-secondary)] p-5 text-sm font-semibold text-[var(--khalsni-public-text-secondary)]">
                {isArabic ? 'لا توجد مستندات إلزامية محددة حالياً.' : 'No required documents are listed for this service.'}
              </div>
            )}
          </PublicPanel>

          {informationFields.length ? (
            <PublicPanel>
              <SectionHeader
                eyebrow={isArabic ? 'بيانات الطلب' : 'Request details'}
                icon={ListChecks}
                title={isArabic ? 'البيانات التي سيطلبها النموذج' : 'Information requested by the form'}
              />
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {informationFields.map((field, index) => {
                  const label = getInformationFieldLabel(field, language, index)
                  const help = getInformationFieldHelp(field, language)
                  const required = field?.required === true || field?.is_required === true
                  const type = field?.type || field?.field_type || ''
                  return (
                    <div key={field?.key || label || index} className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-extrabold leading-7 text-[var(--khalsni-public-navy)]">{label}</p>
                        {required ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'مطلوب' : 'Required'}</span> : null}
                      </div>
                      {type ? <p className="mt-2 text-xs font-bold uppercase text-[var(--khalsni-public-text-muted)]">{type}</p> : null}
                      {help ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{help}</p> : null}
                    </div>
                  )
                })}
              </div>
            </PublicPanel>
          ) : null}

          {steps.length ? (
            <PublicPanel>
              <SectionHeader
                eyebrow={isArabic ? 'خطوات التنفيذ' : 'Process'}
                icon={CalendarClock}
                title={isArabic ? 'مسار واضح من التقديم حتى الإنجاز' : 'Clear path from submission to completion'}
              />
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {steps.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex gap-4 rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] text-sm font-extrabold text-white">{index + 1}</span>
                    <p className="text-sm font-semibold leading-7 text-[var(--khalsni-public-text)]">{item}</p>
                  </div>
                ))}
              </div>
            </PublicPanel>
          ) : null}

          {(terms || notices.length) ? (
            <PublicPanel>
              <SectionHeader
                eyebrow={isArabic ? 'ملاحظات الخدمة' : 'Service notes'}
                icon={CheckCircle2}
                title={isArabic ? 'تنبيهات قبل إرسال الطلب' : 'Notes before submitting'}
              />
              {terms ? <p className="mt-6 whitespace-pre-line text-sm font-semibold leading-8 text-[var(--khalsni-public-text-secondary)]">{terms}</p> : null}
              {notices.length ? (
                <div className="mt-6 grid gap-3 md:grid-cols-2">
                  {notices.map((notice) => (
                    <div key={notice.key} className="rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4">
                      <p className="font-extrabold text-[var(--khalsni-public-navy)]">{notice.title}</p>
                      <p className="mt-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{notice.description}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </PublicPanel>
          ) : null}

          {prerequisiteServices.length ? (
            <PublicPanel>
              <SectionHeader
                eyebrow={isArabic ? 'متطلبات سابقة' : 'Prerequisites'}
                icon={ListChecks}
                title={isArabic ? 'خدمات يجب الانتباه لها قبل المتابعة' : 'Services to note before continuing'}
              />
              <div className="mt-6 grid gap-3">
                {prerequisiteServices.map((item) => (
                  <div key={item.id} className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-extrabold text-[var(--khalsni-public-navy)]">{getServiceNameFromRelation(item, 'source_service', language)}</p>
                      <span className={item.is_completed ? 'rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700' : 'rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700'}>
                        {item.is_completed ? (isArabic ? 'مكتملة' : 'Completed') : isArabic ? 'غير مكتملة' : 'Incomplete'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
                      {item.message_to_customer || (isArabic ? 'هذه الخدمة مطلوبة قبل متابعة الطلب.' : 'This service is required before the request can continue.')}
                    </p>
                  </div>
                ))}
              </div>
            </PublicPanel>
          ) : null}
        </main>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <PublicPanel>
            <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'ملخص الخدمة' : 'Service summary'}</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-8 text-[var(--khalsni-public-navy)]">{serviceName}</h2>
            <div className="mt-5 space-y-3">
              <DetailPill icon={Clock3} label={isArabic ? 'المدة' : 'Duration'} value={duration.label} />
              <DetailPill icon={WalletCards} label={isArabic ? 'السعر' : 'Price'} value={price.label} />
            </div>
            {visiblePricingItems.length > 1 ? (
              <div className="mt-4 space-y-2 rounded-[var(--radius-lg)] bg-[var(--khalsni-public-bg-secondary)] p-4">
                {visiblePricingItems.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-[var(--khalsni-public-text-secondary)]">{item.label}</span>
                    <span className="font-extrabold text-[var(--khalsni-public-navy)]">{item.value}</span>
                  </div>
                ))}
              </div>
            ) : null}
            {publicPriceNote ? <p className="mt-4 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{publicPriceNote}</p> : null}
            <PublicLinkButton className="mt-5 w-full" to={requestPath}>
              {isArabic ? 'ابدأ الطلب الآن' : 'Start request'}
            </PublicLinkButton>
            <PublicLinkButton className="mt-3 w-full" to="/track-order" variant="secondary">
              {isArabic ? 'تتبع طلب قائم' : 'Track existing request'}
            </PublicLinkButton>
          </PublicPanel>

          <div className="rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white p-5 shadow-soft">
            <CheckCircle2 className="h-8 w-8 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 font-extrabold text-[var(--khalsni-public-navy)]">{isArabic ? 'بياناتك محمية' : 'Your data is protected'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
              {isArabic ? 'روابط المستندات وصلاحيات الوصول تبقى محكومة بسياسات خلصني الحالية.' : 'Document links and access remain governed by current Khalsni policies.'}
            </p>
          </div>
        </aside>
      </div>

      {relatedServices.length ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'خدمات مرتبطة' : 'Related services'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-[var(--khalsni-public-navy)]">{isArabic ? 'قد تحتاج أيضاً' : 'You may also need'}</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-bold text-[var(--khalsni-public-text-secondary)] hover:text-[var(--khalsni-public-primary)]" to="/services">
              <ArrowIcon aria-hidden="true" className="h-4 w-4" />
              {isArabic ? 'كل الخدمات' : 'All services'}
            </Link>
          </div>
          <div className="-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-3">
            {relatedServices.map((item) => (
              <ServiceCard key={item.id} className="w-[19rem] shrink-0 sm:w-auto" service={{ ...item, category: item.category || service.category }} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--khalsni-public-border)] bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <PublicLinkButton className="w-full" to={requestPath}>
          {isArabic ? 'ابدأ الطلب' : 'Start request'}
        </PublicLinkButton>
      </div>
    </PublicPageShell>
  )
}

export default ServiceDetailsPage
