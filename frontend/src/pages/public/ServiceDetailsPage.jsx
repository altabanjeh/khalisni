import { Link, useParams } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import ServiceCard from '../../components/ServiceCard'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'

function getRequiredDocumentLabel(item) {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return ''
  return item.name_ar || item.name_en || item.document_type || ''
}

function ServiceDetailsPage() {
  const { slug } = useParams()
  const { data: service, loading } = useAsyncData(() => api.getService(slug), [slug], null)

  if (loading || !service) return <LoadingSpinner />

  const requiredDocuments = (service.required_documents || [])
    .map((item, index) => ({
      id: item?.id || item?.document_type || `required-document-${index}`,
      label: getRequiredDocumentLabel(item),
    }))
    .filter((item) => item.label)

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-panel p-6">
          <p className="text-sm font-bold text-brand-700">{service.category?.name_ar}</p>
          <h1 className="mt-2 text-3xl font-extrabold text-ink">{service.name_ar}</h1>
          <p className="mt-5 text-sm leading-8 text-slate-600">{service.description_ar}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">المدة المتوقعة</p>
              <p className="mt-2 font-bold text-ink">{service.estimated_duration} يوم</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">رسوم الخدمة</p>
              <p className="mt-2 font-bold text-ink">{formatCurrency(service.service_fee)}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-4">
              <p className="text-xs text-slate-500">الرسوم الحكومية</p>
              <p className="mt-2 font-bold text-ink">{formatCurrency(service.government_fee)}</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">اطلب هذه الخدمة</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            ارفع الوثائق المطلوبة وسيتولى فريق خلصني متابعة المعاملة من البداية حتى التسليم.
          </p>
          <Link className="btn-primary mt-6 w-full" to={`/create-order?service=${service.id}`}>
            طلب الخدمة
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">الوثائق المطلوبة</h2>
          <ul className="mt-5 space-y-3">
            {requiredDocuments.map((item) => (
              <li key={item.id} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">خطوات التنفيذ</h2>
          <ul className="mt-5 space-y-3">
            {(service.steps || []).map((item, index) => (
              <li key={`${item}-${index}`} className="rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {service.related_services?.length ? (
        <section className="space-y-4">
          <h2 className="section-title">خدمات ذات صلة</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {service.related_services.map((item) => (
              <ServiceCard
                key={item.id}
                service={{
                  ...item,
                  category: item.category || service.category,
                  description_ar: item.description_ar || 'خدمة مرتبطة من نفس التصنيف.',
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
