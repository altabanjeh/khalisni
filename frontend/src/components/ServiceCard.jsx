import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/format'

function ServiceCard({ service }) {
  return (
    <article className="glass-panel flex h-full flex-col p-5">
      <div className="mb-4 inline-flex w-fit rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
        {service.category?.name_ar || 'خدمة'}
      </div>
      <h3 className="text-xl font-bold text-ink">{service.name_ar}</h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">{service.description_ar}</p>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span>المدة: {service.estimated_duration} يوم</span>
        <span className="font-bold text-brand-700">{formatCurrency(service.total_fee || service.service_fee + service.government_fee)}</span>
      </div>
      <Link className="btn-secondary mt-5" to={`/services/${service.slug}`}>
        عرض التفاصيل
      </Link>
    </article>
  )
}

export default ServiceCard
