import { ArrowUpRight, Clock3, WalletCards } from 'lucide-react'
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
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.85rem] border border-border bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,53,84,0.12)]">
      <div className="border-b border-border bg-[linear-gradient(135deg,rgba(11,116,215,0.10),rgba(255,255,255,0.92))] px-5 py-4">
        <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-700 shadow-soft">
          {categoryName}
        </span>
        <h3 className="mt-4 text-xl font-extrabold text-ink">{serviceName}</h3>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <p className="line-clamp-4 flex-1 text-sm leading-7 text-slate-600">{serviceDescription}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-slate-50/80 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Clock3 className="h-4 w-4 text-brand-600" />
              {isArabic ? 'المدة المتوقعة' : 'Expected time'}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{getDeliveryLabel(service, language, isArabic)}</p>
          </div>
          <div className="rounded-2xl border border-border bg-slate-50/80 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <WalletCards className="h-4 w-4 text-brand-600" />
              {isArabic ? 'السعر' : 'Price'}
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{getPriceLabel(service, language, isArabic)}</p>
          </div>
        </div>

        <Link className="mt-5 inline-flex items-center justify-between rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800" to={`/services/${service.slug}`}>
          <span>{isArabic ? 'فتح تفاصيل الخدمة' : 'Open service details'}</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

export default ServiceCard
