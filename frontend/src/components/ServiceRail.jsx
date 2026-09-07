import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useLanguage } from '../context/LanguageContext'

/**
 * Netflix-inspired horizontal collection rail for service / category discovery.
 *
 * - RTL aware: the scroll direction and the previous/next arrows follow the
 *   active document direction.
 * - Touch, trackpad and mouse-wheel friendly (native overflow scrolling with
 *   scroll snapping).
 * - Keyboard accessible: the scroll region is focusable and Arrow / Home / End
 *   move it; the arrow buttons are real <button>s with labels.
 * - Self-contained: the row never widens the page — it scrolls inside its own
 *   `overflow-x-auto` container.
 *
 * Consumers wrap each child in <ServiceRailItem> to get consistent snap widths.
 */
export function ServiceRail({ title, description, action, children, itemCount = 0, id, eyebrow }) {
  const railRef = useRef(null)
  const { isArabic } = useLanguage()
  const PreviousIcon = isArabic ? ArrowRight : ArrowLeft
  const NextIcon = isArabic ? ArrowLeft : ArrowRight
  const labels = isArabic
    ? { previous: 'السابق', next: 'التالي', region: 'قائمة أفقية قابلة للتمرير' }
    : { previous: 'Previous', next: 'Next', region: 'Scrollable collection' }

  const scrollByStep = useCallback(
    (dir) => {
      const rail = railRef.current
      if (!rail) return
      const step = Math.max(rail.clientWidth * 0.9, 280)
      rail.scrollBy({ left: dir * step * (isArabic ? -1 : 1), behavior: 'smooth' })
    },
    [isArabic],
  )

  const handleKeyDown = useCallback(
    (event) => {
      const rail = railRef.current
      if (!rail) return
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        scrollByStep(isArabic ? -1 : 1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        scrollByStep(isArabic ? 1 : -1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        rail.scrollTo({ left: isArabic ? rail.scrollWidth : 0, behavior: 'smooth' })
      } else if (event.key === 'End') {
        event.preventDefault()
        rail.scrollTo({ left: isArabic ? 0 : rail.scrollWidth, behavior: 'smooth' })
      }
    },
    [isArabic, scrollByStep],
  )

  const showArrows = itemCount > 3
  const headingId = id ? `${id}-heading` : undefined

  return (
    <section aria-labelledby={headingId} className="kh-public-container py-8 sm:py-11">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl text-start">
          {eyebrow ? <span className="kh-eyebrow mb-3">{eyebrow}</span> : null}
          <h2
            className="text-[1.75rem] font-black leading-tight tracking-tight text-[var(--khalsni-public-navy)] sm:text-4xl"
            id={headingId}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2.5 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {showArrows ? (
            <div className="hidden items-center gap-2 md:flex">
              <button
                aria-label={labels.previous}
                className="kh-focusable grid h-11 w-11 place-items-center rounded-full border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] text-[var(--khalsni-public-navy)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)] hover:shadow-md"
                onClick={() => scrollByStep(-1)}
                type="button"
              >
                <PreviousIcon aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label={labels.next}
                className="kh-focusable grid h-11 w-11 place-items-center rounded-full border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] text-[var(--khalsni-public-navy)] shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)] hover:shadow-md"
                onClick={() => scrollByStep(1)}
                type="button"
              >
                <NextIcon aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <div
        aria-label={labels.region}
        className="kh-focusable kh-rail-scroll kh-rail-fade -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-1 scroll-smooth sm:-mx-6 sm:px-6 lg:gap-5"
        onKeyDown={handleKeyDown}
        ref={railRef}
        role="group"
        tabIndex={0}
      >
        {children}
      </div>
    </section>
  )
}

export function ServiceRailItem({ children, size = 'standard' }) {
  const width =
    size === 'featured'
      ? 'w-[78vw] xs:w-[70vw] sm:w-[21rem] lg:w-[22rem]'
      : size === 'compact'
        ? 'w-[62vw] xs:w-[55vw] sm:w-[15rem] lg:w-[16rem]'
        : 'w-[74vw] xs:w-[64vw] sm:w-[19rem] lg:w-[20rem]'
  return <div className={`shrink-0 snap-start ${width}`}>{children}</div>
}

export default ServiceRail
