import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { formatCurrency } from '../utils/format'
import { getLocalizedField } from '../utils/i18n'

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
      <div className="mt-6 flex items-center justify-between text-sm">
        <span>{isArabic ? `المدة: ${service.estimated_duration} يوم` : `Duration: ${service.estimated_duration} day${service.estimated_duration === 1 ? '' : 's'}`}</span>
        <span className="font-bold text-brand-700">{formatCurrency(service.total_fee || service.service_fee + service.government_fee, language)}</span>
      </div>
      <Link className="btn-secondary mt-5" to={`/services/${service.slug}`}>
        {isArabic ? 'عرض التفاصيل' : 'View details'}
      </Link>
    </article>
  )
}

export default ServiceCard
