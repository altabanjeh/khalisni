import { ArrowUpRight, Boxes, Clock3, MessageSquarePlus, SendHorizontal, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { getCover } from '../utils/cover'
import { categoryPath } from '../utils/categoryWorlds'
import {
  getCategoryDescription,
  getCategoryName,
  getServiceDuration,
  getServiceName,
  getServicePublicPrice,
} from '../utils/servicePresentation'

function WorldServiceSlide({ service, language, isArabic }) {
  const name = getServiceName(service, language, isArabic ? 'خدمة' : 'Service')
  const duration = getServiceDuration(service, language)
  const price = getServicePublicPrice(service, language)
  const slug = service?.slug || service?.id || service?.service_id
  return (
    // grow + basis: a world with one or two services fills its row instead of
    // leaving an empty card area; with more, the slider scrolls at the basis width.
    <li className="flex shrink-0 grow basis-[13rem] snap-start" data-testid="world-service">
      <Link
        className="kh-focusable kh-interactive-card group flex w-full flex-col justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-4 text-start transition hover:border-[var(--khalsni-public-primary)]"
        to={slug ? `/services/${encodeURIComponent(slug)}` : '/services'}
      >
        <span className="line-clamp-2 text-[0.95rem] font-extrabold leading-6 text-[var(--khalsni-public-navy)]">{name}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.72rem] font-bold text-[var(--khalsni-public-text-secondary)]">
          <span className="inline-flex min-w-0 items-center gap-1">
            <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--khalsni-public-accent-text)]" />
            <span className="truncate">{duration.label}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <WalletCards aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-[var(--khalsni-public-accent-text)]" />
            <span className="truncate">{price.label}</span>
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
          {isArabic ? 'عرض الخدمة' : 'View service'}
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 rtl:-scale-x-100" />
        </span>
      </Link>
    </li>
  )
}

function SpecialRequestButton({ onClick, children }) {
  return (
    <a
      className="kh-focusable inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-5 text-sm font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]"
      href="#special-request"
      onClick={(event) => {
        event.preventDefault()
        onClick()
      }}
    >
      {children}
      <SendHorizontal aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
    </a>
  )
}

export function CategoryWorld({ world, onSpecialRequest, wide = false }) {
  const { language, isArabic } = useLanguage()
  const { category, services, isSpecialRequest } = world
  const name = getCategoryName(category, language, isArabic ? 'تصنيف خدمات' : 'Service category')
  const description = getCategoryDescription(category, language, '')
  const cover = getCover(category, category?.slug || '', { as: 'category' })
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = cover.hasImage && !imageFailed
  const headingId = `world-${world.id}-heading`
  const count = services.length

  return (
    <article
      aria-labelledby={headingId}
      className={`flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-xl)] bg-white shadow-soft ring-1 ring-[var(--khalsni-public-border)] ${wide ? 'lg:col-span-2' : ''}`}
      data-category-slug={category?.slug || ''}
      data-testid="category-world"
    >
      <div className="kh-cover relative h-36 w-full sm:h-40" style={showImage ? undefined : cover.style}>
        {showImage ? (
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            decoding="async"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={cover.imageUrl}
          />
        ) : (
          <>
            <span aria-hidden="true" className="kh-cover-pattern" />
            <Boxes aria-hidden="true" className="kh-cover-glyph" />
          </>
        )}
        {/* light scrim so the title stays readable on any image */}
        <span aria-hidden="true" className="absolute inset-0 z-[1] bg-gradient-to-t from-[rgba(4,12,30,0.62)] via-[rgba(4,12,30,0.18)] to-transparent" />
        <div className="kh-cover-content flex h-full flex-col justify-end gap-1.5 p-4 text-start sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="min-w-0 text-xl font-black leading-7 text-white drop-shadow-md sm:text-2xl" id={headingId}>
              {name}
            </h3>
            {!isSpecialRequest && count ? (
              <span className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[0.72rem] font-extrabold text-[var(--khalsni-public-navy)] shadow-sm">
                {count} {isArabic ? 'خدمة' : count === 1 ? 'service' : 'services'}
              </span>
            ) : null}
          </div>
          {description ? <p className="line-clamp-1 text-sm font-semibold text-white/90 drop-shadow">{description}</p> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        {isSpecialRequest ? (
          <div className="flex flex-1 flex-col items-start justify-between gap-3 text-start sm:flex-row sm:items-center" data-testid="world-special-request">
            <p className="text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
              {isArabic
                ? 'لم تجد خدمتك في الأقسام؟ صف ما تحتاجه وسيتابع الفريق طلبك.'
                : 'Not in the sections above? Describe what you need and the team will follow up.'}
            </p>
            <SpecialRequestButton onClick={() => onSpecialRequest('')}>
              {isArabic ? 'أرسل طلباً خاصاً' : 'Send a special request'}
            </SpecialRequestButton>
          </div>
        ) : count ? (
          <>
            <ul
              aria-label={isArabic ? `خدمات ${name}` : `${name} services`}
              className="kh-rail-scroll -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1"
              tabIndex={0}
            >
              {services.slice(0, 10).map((service) => (
                <WorldServiceSlide isArabic={isArabic} key={service.id || service.slug} language={language} service={service} />
              ))}
            </ul>
            <Link
              className="kh-focusable inline-flex min-h-10 items-center gap-1.5 self-start text-sm font-extrabold text-[var(--khalsni-public-accent-text)] hover:text-[var(--khalsni-public-primary-hover)]"
              to={categoryPath(category)}
            >
              {isArabic ? `كل خدمات ${name}` : `All ${name} services`}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-bg-secondary)] p-4 text-start sm:flex-row sm:items-center" data-testid="world-empty">
            <p className="flex items-start gap-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
              <MessageSquarePlus aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[var(--khalsni-public-accent-text)]" />
              {isArabic
                ? 'نضيف خدمات هذا القسم قريباً. أرسل طلباً خاصاً وسنتابع احتياجك.'
                : 'Services for this section are being added. Send a special request and we will follow up.'}
            </p>
            <SpecialRequestButton onClick={() => onSpecialRequest(name)}>
              {isArabic ? 'طلب خاص' : 'Special request'}
            </SpecialRequestButton>
          </div>
        )}
      </div>
    </article>
  )
}

function CategoryWorlds({ worlds, loading, onSpecialRequest, title, description, eyebrow, action, emptyText }) {
  return (
    <section aria-labelledby="home-categories-heading" className="kh-public-container py-8 sm:py-11" id="home-categories">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl text-start">
          {eyebrow ? <span className="kh-eyebrow mb-3">{eyebrow}</span> : null}
          <h2 className="text-[1.75rem] font-black leading-tight tracking-tight text-[var(--khalsni-public-navy)] sm:text-4xl" id="home-categories-heading">
            {title}
          </h2>
          {description ? <p className="mt-2.5 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{description}</p> : null}
        </div>
        {action}
      </div>
      {loading && !worlds.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-72 animate-pulse rounded-[var(--radius-xl)] bg-[var(--khalsni-public-surface)] shadow-soft" key={index} />
          ))}
        </div>
      ) : worlds.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {worlds.map((world, index) => (
            <CategoryWorld
              key={world.id}
              onSpecialRequest={onSpecialRequest}
              // an odd last world spans the row instead of leaving an empty half
              wide={index === worlds.length - 1 && worlds.length % 2 === 1}
              world={world}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-8 text-center text-sm font-bold text-[var(--khalsni-public-text-secondary)]">
          {emptyText}
        </div>
      )}
    </section>
  )
}

export default CategoryWorlds
