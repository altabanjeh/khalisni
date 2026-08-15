import { ArrowUpRight, Clock3, FileText, ShieldCheck, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import {
  getCategoryName,
  getServiceDescription,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../utils/servicePresentation'

function ServiceCard({ service }) {
  const { language, isArabic } = useLanguage()
  const categoryName = getCategoryName(service?.category, language, isArabic ? 'خدمة' : 'Service')
  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language)
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] shadow-[0_12px_28px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-[var(--khalsni-public-primary)]/70">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-white/5 px-5 py-5">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[var(--khalsni-public-primary)]/40 bg-[var(--khalsni-public-primary)]/20 text-[var(--khalsni-public-primary)]">
          <FileText className="h-5 w-5" />
        </span>
        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-white/75">
          {categoryName}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-5 py-5 text-right">
        <div className="flex-1">
          <h3 className="text-xl font-extrabold leading-8 text-white">{serviceName}</h3>
          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-7 text-white/50">{serviceDescription}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-white/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/50">
              <Clock3 className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
              {isArabic ? 'المدة المتوقعة' : 'Expected time'}
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{duration.label}</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white/50">
              <WalletCards className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
              {isArabic ? 'السعر' : 'Price'}
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{price.label}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-md border border-[var(--khalsni-public-primary)]/20 bg-[var(--khalsni-public-primary)]/10 px-4 py-3 text-xs font-bold text-white/75">
          <ShieldCheck className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
          {isArabic ? 'يعتمد على متطلبات الخدمة الحالية' : 'Uses current service requirements'}
        </div>

        <Link className="mt-5 inline-flex h-11 items-center justify-between rounded-md bg-[var(--khalsni-public-primary)] px-4 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)] focus:outline-none focus:ring-4 focus:ring-blue-500/20" to={`/services/${service.slug}`}>
          <span>{isArabic ? 'عرض الخدمة' : 'View service'}</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

export default ServiceCard
