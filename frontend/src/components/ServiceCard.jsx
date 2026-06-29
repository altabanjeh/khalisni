import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { formatCurrency } from '../utils/format'
import { getLocalizedField } from '../utils/i18n'

function getDeliveryLabel(service, language, isArabic) {
  if (service?.delivery_time) {
    return isArabic
      ? service.delivery_time.label_ar || service.delivery_time.label || ''
      : service.delivery_time.label_en || service.delivery_time.label || ''
  }

  if (service?.estimated_duration == null) {
    return isArabic ? 'المدة تحدد لاحقاً' : 'Delivery time shared later'
  }

  return isArabic
    ? `المدة: ${service.estimated_duration} يوم`
    : `Duration: ${service.estimated_duration} day${Number(service.estimated_duration) === 1 ? '' : 's'}`
}

function getPublicPrice(service) {
  if (service?.pricing?.total_price != null) return service.pricing.total_price
  if (service?.total_fee != null) return service.total_fee
  if (service?.service_fee != null || service?.government_fee != null) {
    return Number(service.service_fee || 0) + Number(service.government_fee || 0)
  }
  return null
}

function getPriceLabel(service, language, isArabic) {
  const publicPrice = getPublicPrice(service)
  if (publicPrice != null) return formatCurrency(publicPrice, language)

  return (
    (isArabic ? service?.pricing?.public_note_ar : service?.pricing?.public_note_en)
    || (isArabic ? 'السعر يحدد بعد المراجعة' : 'Price shared after review')
  )
}

function ServiceCard({ service }) {
  const { language, isArabic } = useLanguage()

  const categoryName = getLocalizedField(service?.category, { ar: 'name_ar', en: 'name_en' }, language, isArabic ? 'خدمة' : 'Service')
  const serviceName = getLocalizedField(service, { ar: 'name_ar', en: 'name_en' }, language)
  const serviceDescription = getLocalizedField(service, { ar: 'description_ar', en: 'description_en' }, language)

  return (
    <article className="glass-panel flex h-full flex-col p-5">
      <div className="mb-4 inline-flex w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
        {categoryName}
      </div>
      <h3 className="text-xl font-bold text-ink">{serviceName}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{serviceDescription}</p>
      <div className="mt-6 space-y-2 text-sm">
        <span className="block text-slate-500">{getDeliveryLabel(service, language, isArabic)}</span>
        <span className="block font-bold text-brand-700">{getPriceLabel(service, language, isArabic)}</span>
      </div>
      <Link className="btn-secondary mt-5" to={`/services/${service.slug}`}>
        {isArabic ? 'عرض التفاصيل' : 'View details'}
      </Link>
    </article>
  )
}

export default ServiceCard
