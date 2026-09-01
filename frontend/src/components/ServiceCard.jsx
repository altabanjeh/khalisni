import clsx from 'clsx'
import { ArrowUpRight, Clock3, FileText, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { ImageFallback, PublicCard } from './public/PublicPage'
import {
  getCategoryName,
  getServiceDescription,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../utils/servicePresentation'

function ServiceCard({ service, className = '' }) {
  const { language, isArabic } = useLanguage()
  const categoryName = getCategoryName(service?.category, language, isArabic ? 'خدمة' : 'Service')
  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language)
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const imageUrl = service?.image_url || service?.image || service?.category?.image_url || service?.category?.image

  return (
    <PublicCard className={clsx('group flex h-full min-h-[23rem] snap-start flex-col p-0', className)} interactive>
      <ImageFallback
        alt={serviceName}
        className="aspect-[16/10] w-full border-b border-[var(--khalsni-public-border)]"
        icon={FileText}
        src={imageUrl}
      />

      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--khalsni-public-primary)]">
          <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="truncate">{categoryName}</span>
        </span>

        <div className="mt-4 flex-1">
          <h3 className="line-clamp-2 text-lg font-extrabold leading-7 text-[var(--khalsni-public-navy)] sm:text-xl sm:leading-8">{serviceName}</h3>
          {serviceDescription ? (
            <p className="mt-2 line-clamp-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{serviceDescription}</p>
          ) : null}
        </div>

        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--khalsni-public-bg-secondary)] p-3">
            <dt className="flex items-center gap-2 text-xs font-bold text-[var(--khalsni-public-text-muted)]">
              <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-primary)]" />
              {isArabic ? 'المدة' : 'Duration'}
            </dt>
            <dd className="mt-1 truncate font-extrabold text-[var(--khalsni-public-text)]">{duration.label}</dd>
          </div>
          <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--khalsni-public-bg-secondary)] p-3">
            <dt className="flex items-center gap-2 text-xs font-bold text-[var(--khalsni-public-text-muted)]">
              <WalletCards aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-primary)]" />
              {isArabic ? 'السعر' : 'Price'}
            </dt>
            <dd className="mt-1 truncate font-extrabold text-[var(--khalsni-public-text)]">{price.label}</dd>
          </div>
        </dl>

        <Link
          className="kh-focusable mt-5 inline-flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]"
          to={`/services/${service.slug}`}
        >
          <span>{isArabic ? 'عرض الخدمة' : 'View service'}</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    </PublicCard>
  )
}

export default ServiceCard
