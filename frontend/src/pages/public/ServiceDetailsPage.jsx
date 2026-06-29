import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import ServiceCard from '../../components/ServiceCard'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'
import { getLocalizedField } from '../../utils/i18n'

function getRequiredDocumentLabel(item, language) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  return getLocalizedField(item, { ar: 'name_ar', en: 'name_en' }, language, item.document_type || '')
}

function getServiceName(item, key, language) {
  return getLocalizedField(item?.[key], { ar: 'name_ar', en: 'name_en' }, language)
}

function ServiceDetailsPage() {
  const { language, isArabic } = useLanguage()
  const { slug } = useParams()
  const { data: service, loading } = useAsyncData(() => api.getService(slug), [slug], null)

  if (loading || !service) return <LoadingSpinner />

  const serviceName = getLocalizedField(service, { ar: 'name_ar', en: 'name_en' }, language)
  const serviceDescription = getLocalizedField(service, { ar: 'description_ar', en: 'description_en' }, language)
  const categoryName = getLocalizedField(service.category, { ar: 'name_ar', en: 'name_en' }, language)
  const requiredDocuments = (service.required_documents || [])
    .map((item, index) => ({
      id: item?.id || item?.definition_id || item?.document_type || `required-document-${index}`,
      label: getRequiredDocumentLabel(item, language),
      instructions: getLocalizedField(item, { ar: 'instructions_ar', en: 'instructions_en' }, language, ''),
    }))
    .filter((item) => item.label)
  const prerequisiteServices = service.prerequisite_services || []
  const recommendedServices = service.recommended_services || []
  const steps = isArabic
    ? service.steps || []
    : service.steps_en || [
        'Confirm the request and basic details',
        'Upload the required documents',
        'Review and process the request',
        'Deliver the final result',
      ]

  const pricing = service.pricing || {}
  const deliveryTime = service.delivery_time || {}
  const visiblePriceNote = isArabic ? pricing.public_note_ar : pricing.public_note_en
  const deliveryLabel = isArabic ? deliveryTime.label_ar || deliveryTime.label : deliveryTime.label_en || deliveryTime.label

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-6">
          <p className="text-sm font-bold text-brand-700">{categoryName}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">{serviceName}</h1>
          <p className="mt-5 text-sm leading-8 text-slate-600">{serviceDescription}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">{isArabic ? 'مدة التنفيذ' : 'Delivery time'}</p>
              <p className="mt-2 font-bold text-ink">{deliveryLabel || (isArabic ? 'يحدد لاحقاً' : 'Shared later')}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">{isArabic ? 'السعر الظاهر' : 'Visible price'}</p>
              <p className="mt-2 font-bold text-ink">
                {pricing.total_price != null
                  ? formatCurrency(pricing.total_price, language)
                  : isArabic
                    ? 'يحدد بعد المراجعة'
                    : 'Shared after review'}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">{isArabic ? 'تفاصيل الرسوم' : 'Fee details'}</p>
              <p className="mt-2 font-bold text-ink">
                {pricing.government_fee != null || pricing.company_fee != null
                  ? [
                      pricing.government_fee != null ? `${isArabic ? 'حكومي' : 'Gov'}: ${formatCurrency(pricing.government_fee, language)}` : null,
                      pricing.company_fee != null ? `${isArabic ? 'خدمة' : 'Service'}: ${formatCurrency(pricing.company_fee, language)}` : null,
                    ]
                      .filter(Boolean)
                      .join(' | ')
                  : isArabic
                    ? 'تفاصيل الرسوم مخفية'
                    : 'Fees hidden'}
              </p>
            </div>
          </div>
          {visiblePriceNote ? <p className="mt-4 text-sm text-slate-500">{visiblePriceNote}</p> : null}
          {(isArabic ? deliveryTime.note_ar : deliveryTime.note_en) ? (
            <p className="mt-2 text-sm text-slate-500">{isArabic ? deliveryTime.note_ar : deliveryTime.note_en}</p>
          ) : null}
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? 'اطلب هذه الخدمة' : 'Request this service'}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {isArabic
              ? 'ارفع الوثائق المطلوبة وسيتولى فريق خلصني متابعة المعاملة من البداية حتى التسليم.'
              : 'Upload the required documents and the Khalisni team will handle the request from start to delivery.'}
          </p>
          <Link className="btn-primary mt-6 w-full" to={`/create-order?service=${service.id}`}>
            {isArabic ? 'طلب الخدمة' : 'Request service'}
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? 'الوثائق المطلوبة' : 'Required documents'}</h2>
          <ul className="mt-5 space-y-3">
            {requiredDocuments.map((item) => (
              <li key={item.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                <p className="font-semibold text-ink">{item.label}</p>
                {item.instructions ? <p className="mt-1 text-slate-500">{item.instructions}</p> : null}
              </li>
            ))}
            {!requiredDocuments.length ? (
              <li className="rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-sm text-slate-500">
                {isArabic ? 'لا توجد وثائق إلزامية محددة حالياً.' : 'No required documents are listed for this service.'}
              </li>
            ) : null}
          </ul>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? 'خطوات التنفيذ' : 'Process steps'}</h2>
          <ul className="mt-5 space-y-3">
            {steps.map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {prerequisiteServices.length ? (
        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? 'الخدمات المطلوبة قبل الطلب' : 'Required services before ordering'}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {isArabic
              ? 'هذه الخدمات مرتبطة بهذه المعاملة كمتطلبات سابقة. إذا كانت مكتملة لديك فسيتم تمييزها تلقائياً.'
              : 'These services are linked to this request as prerequisites. Completed items will be marked automatically.'}
          </p>
          <div className="mt-5 grid gap-4">
            {prerequisiteServices.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-bold text-ink">{getServiceName(item, 'source_service', language)}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.is_completed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.is_completed ? (isArabic ? 'مكتملة' : 'Completed') : isArabic ? 'غير مكتملة' : 'Incomplete'}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {item.message_to_customer
                    || (isArabic
                      ? 'هذه الخدمة مطلوبة قبل متابعة الطلب.'
                      : 'This service is required before the request can continue.')}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recommendedServices.length ? (
        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? 'خدمات مقترحة بعد الإكمال' : 'Recommended services after completion'}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {recommendedServices.map((item) => (
              <div key={item.id} className="rounded-3xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{getServiceName(item, 'target_service', language)}</p>
                    <p className="mt-2 text-xs font-semibold text-brand-700">{item.relation_type_label}</p>
                  </div>
                  {item.target_service?.slug ? (
                    <Link className="text-sm font-semibold text-brand-700" to={`/services/${item.target_service.slug}`}>
                      {isArabic ? 'عرض' : 'View'}
                    </Link>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {item.message_to_customer
                    || (isArabic
                      ? 'خدمة مرتبطة موصى بها بعد الإكمال.'
                      : 'A related service recommended after completion.')}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {service.related_services?.length ? (
        <section className="space-y-4">
          <h2 className="section-title">{isArabic ? 'خدمات ذات صلة' : 'Related services'}</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {service.related_services.map((item) => (
              <ServiceCard
                key={item.id}
                service={{
                  ...item,
                  category: item.category || service.category,
                  description_ar: item.description_ar || 'خدمة مرتبطة من نفس التصنيف.',
                  description_en: item.description_en || 'A related service from the same category.',
                }}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default ServiceDetailsPage
