import clsx from 'clsx'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../context/LanguageContext'

/**
 * Official Khalsni brand components.
 *
 * The two source assets are supplied by the business and stored, unaltered, under
 * `frontend/public/brand/`:
 *   - khalsni-wordmark.png     Arabic wordmark "خلصني" on the Khalsni blue field
 *   - khalsni-app-icon.png     rounded-square checkmark application icon
 *
 * Never inline, redraw, recolour, or restyle these files. Use these components so
 * every surface points at the same canonical assets.
 */

export const KHALSNI_WORDMARK_SRC = '/brand/khalsni-wordmark.png'
export const KHALSNI_APP_ICON_SRC = '/brand/khalsni-app-icon.png'

const WORDMARK_SIZES = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
}

const ICON_SIZES = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

function useBrandLabel() {
  const { isArabic } = useLanguage()
  return isArabic ? 'خلصني' : 'Khalsni'
}

/**
 * Primary Khalsni wordmark. Renders the supplied Arabic wordmark image with a
 * safe blue background so it stays legible on light and dark surfaces alike.
 * Falls back to `overrideSrc` (admin-managed logo) when one is provided.
 */
export function KhalsniLogo({ size = 'md', className = '', imgClassName = '', to, overrideSrc, title }) {
  const label = useBrandLabel()
  const src = overrideSrc || KHALSNI_WORDMARK_SRC

  const image = (
    <img
      alt={title || label}
      className={clsx(
        WORDMARK_SIZES[size] || WORDMARK_SIZES.md,
        'w-auto max-w-full rounded-[var(--radius-sm,0.5rem)] object-contain',
        imgClassName,
      )}
      loading="eager"
      src={src}
      width="695"
      height="427"
    />
  )

  if (to) {
    return (
      <Link aria-label={label} className={clsx('inline-flex shrink-0 items-center', className)} to={to}>
        {image}
      </Link>
    )
  }

  return <span className={clsx('inline-flex shrink-0 items-center', className)}>{image}</span>
}

/**
 * Compact Khalsni application icon (the checkmark mark). Use where horizontal
 * space is constrained: collapsed sidebars, mobile bars, favicons, avatars.
 */
export function KhalsniAppIcon({ size = 'md', className = '', imgClassName = '', to, title }) {
  const label = useBrandLabel()

  const image = (
    <img
      alt={title || label}
      className={clsx(
        ICON_SIZES[size] || ICON_SIZES.md,
        'shrink-0 rounded-[22%] object-contain',
        imgClassName,
      )}
      loading="eager"
      src={KHALSNI_APP_ICON_SRC}
      width="512"
      height="512"
    />
  )

  if (to) {
    return (
      <Link aria-label={label} className={clsx('inline-flex shrink-0 items-center', className)} to={to}>
        {image}
      </Link>
    )
  }

  return <span className={clsx('inline-flex shrink-0 items-center', className)}>{image}</span>
}

/**
 * Icon + wordmark lockup for wide headers (expanded sidebar, auth screens).
 */
export function KhalsniLockup({ className = '', iconSize = 'sm', wordmarkSize = 'sm', to }) {
  const label = useBrandLabel()
  const content = (
    <>
      <KhalsniAppIcon size={iconSize} />
      <KhalsniLogo size={wordmarkSize} />
    </>
  )

  if (to) {
    return (
      <Link aria-label={label} className={clsx('inline-flex items-center gap-2.5', className)} to={to}>
        {content}
      </Link>
    )
  }

  return <span className={clsx('inline-flex items-center gap-2.5', className)}>{content}</span>
}

export default KhalsniLogo
