import clsx from 'clsx'
import { ArrowUpRight, Clock3, FileText, Layers, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { PublicCard } from './public/PublicPage'
import { getCover } from '../utils/cover'
import {
  getCategoryName,
  getServiceDescription,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../utils/servicePresentation'

/**
 * Image-first service card.
 *
 *  - "standard" (default) — full cover, category overline, strong title,
 *    duration/price meta chips, solid "View service" CTA. Catalog grid + search.
 *  - "featured" — tall cover with the title set over a gradient scrim; homepage
 *    discovery rails.
 *  - "compact" — cover + title + one meta line; dense "services by category".
 *
 * When a service has no real image it gets a deterministic branded gradient
 * cover with a large glyph, so a wall of cards still reads as image-first.
 * The "View service" / "عرض الخدمة" affordance is identical across variants.
 */
function ServiceCard({ service, className = '', variant = 'standard' }) {
  const { language, isArabic } = useLanguage()
  const categoryName = getCategoryName(service?.category, language, isArabic ? 'خدمة' : 'Service')
  const serviceName = getServiceName(service, language)
  const serviceDescription = getServiceDescription(service, language)
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const docCount = service?.required_documents_count ?? service?.required_documents?.length ?? null
  const href = `/services/${service?.slug ?? service?.id ?? ''}`
  const viewLabel = isArabic ? 'عرض الخدمة' : 'View service'
  const cover = getCover(service, service?.category?.slug || '', { as: 'service' })
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = cover.hasImage && !imageFailed

  const Cover = ({ ratio, children }) => (
    <div className={clsx('kh-cover w-full', ratio)} style={showImage ? undefined : cover.style}>
      {showImage ? (
        <img
          alt={serviceName}
          className="kh-card-image-zoom absolute inset-0 h-full w-full object-cover transition-transform duration-500"
          decoding="async"
          loading="lazy"
          onError={() => setImageFailed(true)}
          src={cover.imageUrl}
        />
      ) : (
        <>
          <span aria-hidden="true" className="kh-cover-pattern" />
          <Layers aria-hidden="true" className="kh-cover-glyph kh-card-image-zoom transition-transform duration-500" />
        </>
      )}
      <div className="kh-cover-content flex h-full flex-col justify-between p-4">{children}</div>
    </div>
  )

  const CategoryChip = (
    <span className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-white/95 px-2.5 py-1 text-[0.72rem] font-extrabold text-[var(--khalsni-public-navy)] shadow-sm ring-1 ring-black/5 backdrop-blur">
      <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--khalsni-public-accent-text)]" />
      <span className="truncate">{categoryName}</span>
    </span>
  )

  const MetaRow = ({ compact = false }) => (
    <div className={clsx('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold text-[var(--khalsni-public-text-secondary)]', compact && 'text-[0.7rem]')}>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
        <span className="truncate">{duration.label}</span>
      </span>
      {!compact ? (
        <span className="inline-flex items-center gap-1.5">
          <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
          <span className="truncate">{price.label}</span>
        </span>
      ) : null}
      {!compact && docCount != null ? (
        <span className="inline-flex items-center gap-1.5">
          <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
          <span>{docCount} {isArabic ? 'مستند' : 'docs'}</span>
        </span>
      ) : null}
    </div>
  )

  const CtaSolid = (
    <span className="kh-cover-cta mt-5 inline-flex min-h-11 items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--khalsni-public-primary)] bg-[var(--khalsni-public-primary-soft)] px-4 py-2.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)] transition">
      <span>{viewLabel}</span>
      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
    </span>
  )

  if (variant === 'featured') {
    return (
      <PublicCard as={Link} className={clsx('kh-interactive-card group flex h-full min-h-[24rem] snap-start flex-col overflow-hidden p-0 focus:outline-none', className)} to={href}>
        <Cover ratio="aspect-[5/4]">
          {CategoryChip}
          <div>
            <h3 className="line-clamp-2 text-lg font-black leading-6 text-white drop-shadow-md sm:text-xl sm:leading-7">{serviceName}</h3>
          </div>
        </Cover>
        <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
          {serviceDescription ? (
            <p className="line-clamp-2 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{serviceDescription}</p>
          ) : null}
          <div className="mt-3">
            <MetaRow />
          </div>
          {CtaSolid}
        </div>
      </PublicCard>
    )
  }

  if (variant === 'compact') {
    return (
      <PublicCard as={Link} className={clsx('kh-interactive-card group flex h-full min-h-[16rem] snap-start flex-col overflow-hidden p-0 focus:outline-none', className)} to={href}>
        <Cover ratio="aspect-[16/10]">
          {CategoryChip}
          <span />
        </Cover>
        <div className="flex flex-1 flex-col p-4 text-start">
          <h3 className="line-clamp-2 flex-1 text-[0.95rem] font-extrabold leading-5 text-[var(--khalsni-public-navy)]">{serviceName}</h3>
          <div className="mt-3">
            <MetaRow compact />
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
            {viewLabel}
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
          </span>
        </div>
      </PublicCard>
    )
  }

  return (
    <PublicCard as={Link} className={clsx('kh-interactive-card group flex h-full min-h-[22rem] snap-start flex-col overflow-hidden p-0 focus:outline-none', className)} to={href}>
      <Cover ratio="aspect-[16/10]">
        {CategoryChip}
        <span />
      </Cover>
      <div className="flex flex-1 flex-col p-4 text-start sm:p-5">
        <h3 className="line-clamp-2 text-lg font-extrabold leading-6 text-[var(--khalsni-public-navy)] sm:text-xl sm:leading-7">{serviceName}</h3>
        {serviceDescription ? (
          <p className="mt-2 line-clamp-2 flex-1 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{serviceDescription}</p>
        ) : (
          <span className="flex-1" />
        )}
        <div className="mt-4">
          <MetaRow />
        </div>
        {CtaSolid}
      </div>
    </PublicCard>
  )
}

export default ServiceCard
