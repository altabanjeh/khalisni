import { ArrowRight, CheckCircle2, Clock3, FileText, Info, Layers3, ReceiptText, ShieldCheck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ServiceCard from '../../components/ServiceCard'
import {
  PublicCard,
  PublicEmptyState,
  PublicHero,
  PublicLinkButton,
  PublicLoading,
  PublicPageShell,
  PublicPanel,
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

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <PublicCard className="min-h-32">
      <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-50 text-[var(--khalsni-public-primary)]">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>
      <p className="mt-4 text-lg font-extrabold leading-7 text-ink">{value}</p>
      {note ? <p className="mt-2 text-xs font-semibold leading-6 text-slate-500">{note}</p> : null}
    </PublicCard>
  )
}

function ServiceDetailsPage() {
  const { language, isArabic } = useLanguage()
  const { slug } = useParams()
  const { data: service, loading, error } = useAsyncData(() => api.getService(slug), [slug], null)

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
        <PublicEmptyState
          icon={Layers3}
          title={isArabic ? 'تعذر تحميل الخدمة' : 'Could not load service'}
          description={isArabic ? 'تحقق من رابط الخدمة أو عد إلى دليل الخدمات المنشورة.' : 'Check the service link or return to the published services directory.'}
          action={<PublicLinkButton to="/services">{isArabic ? 'فتح دليل الخدمات' : 'Open services'}</PublicLinkButton>}
        />
      </PublicPageShell>
    )
  }

  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language)
  const categoryName = getCategoryName(service.category, language)
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const pricing = service.pricing || {}
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
  const configuredSteps = isArabic ? service.steps || service.steps_ar : service.steps_en
  const steps = configuredSteps?.length
    ? configuredSteps
    : isArabic
      ? ['تأكيد بيانات الطلب', 'رفع المستندات المطلوبة', 'مراجعة الطلب وتنفيذه', 'تسليم النتيجة النهائية']
      : ['Confirm request details', 'Upload required documents', 'Review and process the request', 'Deliver the final result']

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={categoryName || (isArabic ? 'الخدمات' : 'Services')}
        icon={Layers3}
        title={serviceName}
        description={serviceDescription || (isArabic ? 'تفاصيل الخدمة والمتطلبات المتاحة قبل بدء الطلب.' : 'Available service details and requirements before starting.')}
        action={<PublicLinkButton to={`/create-order?service=${service.id}`}>{isArabic ? 'ابدأ الطلب' : 'Start Request'}</PublicLinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-6">
          <PublicPanel>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-50 text-[var(--khalsni-public-primary)]">
                <Info className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'نظرة عامة' : 'Overview'}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'معلومات الخدمة قبل البدء' : 'Service information before starting'}</h2>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold leading-8 text-slate-600">
              {serviceDescription || (isArabic ? 'لا يوجد وصف منشور لهذه الخدمة حالياً.' : 'No public description is currently published for this service.')}
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <StatCard icon={Clock3} label={isArabic ? 'مدة الإنجاز' : 'Duration'} value={duration.label} note={duration.note} />
              <StatCard icon={ReceiptText} label={isArabic ? 'السعر' : 'Price'} value={price.label} note={price.note} />
              <StatCard icon={ShieldCheck} label={isArabic ? 'التصنيف' : 'Category'} value={categoryName || (isArabic ? 'غير محدد' : 'Not set')} />
            </div>
            {pricing.government_fee != null || pricing.company_fee != null ? (
              <div className="mt-5 rounded-[var(--radius-lg)] border border-brand-100 bg-brand-50 p-4 text-sm font-semibold leading-7 text-slate-700">
                {[
                  pricing.government_fee != null ? `${isArabic ? 'رسوم حكومية' : 'Government fee'}: ${formatCurrency(pricing.government_fee, language)}` : null,
                  pricing.company_fee != null ? `${isArabic ? 'رسوم خدمة' : 'Service fee'}: ${formatCurrency(pricing.company_fee, language)}` : null,
                ].filter(Boolean).join(' | ')}
              </div>
            ) : null}
          </PublicPanel>

          <PublicPanel>
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-brand-50 text-[var(--khalsni-public-primary)]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'المستندات المطلوبة' : 'Required documents'}</p>
                <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'جهز ملفاتك قبل بدء الطلب' : 'Prepare files before starting'}</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {requiredDocuments.length ? requiredDocuments.map((item) => (
                <PublicCard key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-extrabold text-ink">{item.label}</p>
                    <span className={item.required ? 'rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700' : 'rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600'}>
                      {item.required ? (isArabic ? 'مطلوب' : 'Required') : isArabic ? 'اختياري' : 'Optional'}
                    </span>
                  </div>
                  {item.instructions ? <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.instructions}</p> : null}
                </PublicCard>
              )) : (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-slate-50 p-5 text-sm font-semibold text-slate-600">
                  {isArabic ? 'لا توجد مستندات إلزامية محددة حالياً.' : 'No required documents are listed for this service.'}
                </div>
              )}
            </div>
          </PublicPanel>

          <PublicPanel>
            <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'خطوات التنفيذ' : 'Process steps'}</p>
            <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'مسار واضح من التقديم حتى الإنجاز' : 'Clear path from submission to completion'}</h2>
            <div className="mt-6 space-y-3">
              {steps.map((item, index) => (
                <div key={`${item}-${index}`} className="flex gap-4 rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-slate-50 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--khalsni-public-primary)] text-sm font-extrabold text-white">{index + 1}</span>
                  <p className="text-sm font-semibold leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </PublicPanel>

          {prerequisiteServices.length ? (
            <PublicPanel>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'متطلبات سابقة' : 'Prerequisites'}</p>
              <div className="mt-5 grid gap-4">
                {prerequisiteServices.map((item) => (
                  <PublicCard key={item.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-ink">{getServiceNameFromRelation(item, 'source_service', language)}</p>
                      <span className={item.is_completed ? 'rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700' : 'rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700'}>
                        {item.is_completed ? (isArabic ? 'مكتملة' : 'Completed') : isArabic ? 'غير مكتملة' : 'Incomplete'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.message_to_customer || (isArabic ? 'هذه الخدمة مطلوبة قبل متابعة الطلب.' : 'This service is required before the request can continue.')}</p>
                  </PublicCard>
                ))}
              </div>
            </PublicPanel>
          ) : null}
        </main>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <PublicPanel>
            <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'ملخص الخدمة' : 'Service summary'}</p>
            <h2 className="mt-2 text-2xl font-extrabold leading-8 text-ink">
              {isArabic ? 'ابدأ طلبك بثقة' : 'Start with confidence'}
            </h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">{isArabic ? 'مدة الإنجاز' : 'Duration'}</p>
                <p className="mt-2 font-extrabold text-ink">{isArabic ? 'موضحة في نظرة عامة' : 'Shown in overview'}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-500">{isArabic ? 'السعر' : 'Price'}</p>
                <p className="mt-2 font-extrabold text-ink">{isArabic ? 'موضح في نظرة عامة' : 'Shown in overview'}</p>
              </div>
            </div>
            <PublicLinkButton className="mt-5 w-full" to={`/create-order?service=${service.id}`}>
              {isArabic ? 'ابدأ الطلب الآن' : 'Start request'}
            </PublicLinkButton>
            <PublicLinkButton className="mt-3 w-full" to="/track-order" variant="secondary">
              {isArabic ? 'تتبع طلب قائم' : 'Track existing request'}
            </PublicLinkButton>
          </PublicPanel>

          <PublicCard>
            <CheckCircle2 className="h-8 w-8 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 font-extrabold text-ink">{isArabic ? 'بياناتك محمية' : 'Your data is protected'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
              {isArabic ? 'روابط المستندات وصلاحيات الوصول تبقى محكومة بسياسات خلصني الحالية.' : 'Document links and access remain governed by current Khalsni policies.'}
            </p>
          </PublicCard>
        </aside>
      </div>

      {relatedServices.length ? (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--khalsni-public-primary)]">{isArabic ? 'خدمات مرتبطة' : 'Related services'}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">{isArabic ? 'قد تحتاج أيضاً' : 'You may also need'}</h2>
            </div>
            <Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[var(--khalsni-public-primary)]" to="/services">
              <ArrowRight className="h-4 w-4" />
              {isArabic ? 'كل الخدمات' : 'All services'}
            </Link>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {relatedServices.map((item) => (
              <ServiceCard key={item.id} service={{ ...item, category: item.category || service.category }} />
            ))}
          </div>
        </section>
      ) : null}
    </PublicPageShell>
  )
}

export default ServiceDetailsPage
