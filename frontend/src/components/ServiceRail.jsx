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
export function ServiceRail({ title, description, action, children, itemCount = 0, id }) {
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
    <section aria-labelledby={headingId} className="kh-public-container py-7 sm:py-9">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl text-start">
          <h2
            className="text-2xl font-black text-[var(--khalsni-public-navy)] sm:text-3xl"
            id={headingId}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">
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
                className="kh-focusable grid h-10 w-10 place-items-center rounded-full border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] text-[var(--khalsni-public-navy)] shadow-sm transition hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)]"
                onClick={() => scrollByStep(-1)}
                type="button"
              >
                <PreviousIcon aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                aria-label={labels.next}
                className="kh-focusable grid h-10 w-10 place-items-center rounded-full border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] text-[var(--khalsni-public-navy)] shadow-sm transition hover:border-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-accent-text)]"
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
        className="kh-focusable -mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-3 scroll-smooth sm:mx-0 sm:px-0"
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
      ? 'w-[86vw] sm:w-[22rem] lg:w-[21rem]'
      : size === 'compact'
        ? 'w-[70vw] sm:w-[15rem] lg:w-[16rem]'
        : 'w-[82vw] sm:w-[19rem] lg:w-[20rem]'
  return <div className={`shrink-0 snap-start ${width}`}>{children}</div>
}

export default ServiceRail
