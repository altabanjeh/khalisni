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

/**
 * Reusable service card.
 *
 * variant:
 *  - "standard" (default) — image, category chip, title, description, a
 *    duration/price meta grid and a solid "View service" CTA. The catalog grid
 *    and search results use this.
 *  - "featured" — image-forward hero treatment with the title over a gradient
 *    scrim; used at the top of homepage discovery rails.
 *  - "compact" — image, chip, title and a single meta line; used inside dense
 *    "services by category" rows where vertical space is tight.
 *
 * Every variant keeps the same "View service" / "عرض الخدمة" affordance so the
 * decision-to-open action is always obvious and consistently labelled.
 */
function ServiceCard({ service, className = '', variant = 'standard' }) {
  const { language, isArabic } = useLanguage()
  const categoryName = getCategoryName(service?.category, language, isArabic ? 'خدمة' : 'Service')
  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language)
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const imageUrl = service?.image_url || service?.image || service?.category?.image_url || service?.category?.image
  const href = `/services/${service?.slug ?? service?.id ?? ''}`
  const viewLabel = isArabic ? 'عرض الخدمة' : 'View service'

  if (variant === 'featured') {
    return (
      <PublicCard className={clsx('group flex h-full min-h-[25rem] snap-start flex-col p-0', className)} interactive>
        <div className="relative">
          <ImageFallback
            alt={serviceName}
            className="aspect-[4/3] w-full"
            icon={FileText}
            src={imageUrl}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(4,7,12,0.82)] via-[rgba(4,7,12,0.25)] to-transparent"
          />
          <div className="absolute inset-x-0 bottom-0 p-4 text-start sm:p-5">
            <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[rgba(0,0,0,0.35)] px-3 py-1 text-xs font-extrabold text-white backdrop-blur-sm">
              <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="truncate">{categoryName}</span>
            </span>
            <h3 className="mt-3 line-clamp-2 text-lg font-black leading-7 text-white drop-shadow sm:text-xl">{serviceName}</h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
          {serviceDescription ? (
            <p className="line-clamp-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{serviceDescription}</p>
          ) : null}
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <MetaCell icon={Clock3} label={isArabic ? 'المدة' : 'Duration'} value={duration.label} />
            <MetaCell icon={WalletCards} label={isArabic ? 'السعر' : 'Price'} value={price.label} />
          </dl>
          <Link
            className="kh-focusable mt-5 inline-flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]"
            to={href}
          >
            <span>{viewLabel}</span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          </Link>
        </div>
      </PublicCard>
    )
  }

  if (variant === 'compact') {
    return (
      <PublicCard className={clsx('group flex h-full min-h-[17rem] snap-start flex-col p-0', className)} interactive>
        <ImageFallback
          alt={serviceName}
          className="aspect-[16/10] w-full border-b border-[var(--khalsni-public-border)]"
          icon={FileText}
          src={imageUrl}
        />
        <div className="flex flex-1 flex-col p-4 text-start">
          <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--khalsni-public-accent-text)]">
            <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{categoryName}</span>
          </span>
          <h3 className="mt-3 line-clamp-2 flex-1 text-base font-extrabold leading-6 text-[var(--khalsni-public-navy)]">{serviceName}</h3>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[var(--khalsni-public-text-muted)]">
            <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
            <span className="truncate">{duration.label}</span>
          </div>
          <Link
            className="kh-focusable mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]"
            to={href}
          >
            <span>{viewLabel}</span>
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          </Link>
        </div>
      </PublicCard>
    )
  }

  return (
    <PublicCard className={clsx('group flex h-full min-h-[23rem] snap-start flex-col p-0', className)} interactive>
      <ImageFallback
        alt={serviceName}
        className="aspect-[16/10] w-full border-b border-[var(--khalsni-public-border)]"
        icon={FileText}
        src={imageUrl}
      />

      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <span className="inline-flex max-w-full items-center gap-2 self-start rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1 text-xs font-extrabold text-[var(--khalsni-public-accent-text)]">
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
          <MetaCell icon={Clock3} label={isArabic ? 'المدة' : 'Duration'} value={duration.label} />
          <MetaCell icon={WalletCards} label={isArabic ? 'السعر' : 'Price'} value={price.label} />
        </dl>

        <Link
          className="kh-focusable mt-5 inline-flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]"
          to={href}
        >
          <span>{viewLabel}</span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        </Link>
      </div>
    </PublicCard>
  )
}

function MetaCell({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] bg-[var(--khalsni-public-bg-secondary)] p-3">
      <dt className="flex items-center gap-2 text-xs font-bold text-[var(--khalsni-public-text-muted)]">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
        {label}
      </dt>
      <dd className="mt-1 truncate font-extrabold text-[var(--khalsni-public-text)]">{value}</dd>
    </div>
  )
}

export default ServiceCard
