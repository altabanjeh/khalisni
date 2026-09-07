import { ArrowUpRight, ImageIcon, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

const buttonBase =
  'kh-focusable inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 py-3 text-sm font-extrabold transition-[background-color,border-color,color,box-shadow,transform] duration-fast disabled:cursor-not-allowed disabled:opacity-60'

const buttonVariants = {
  primary: 'border border-transparent bg-[var(--khalsni-public-primary)] text-white hover:bg-[var(--khalsni-public-primary-hover)]',
  secondary:
    'border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] text-[var(--khalsni-public-text)] hover:border-[var(--khalsni-public-primary)] hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]',
  ghost: 'border border-transparent bg-transparent text-[var(--khalsni-public-text)] hover:bg-[var(--khalsni-public-primary-soft)] hover:text-[var(--khalsni-public-accent-text)]',
}

export function PublicContainer({ children, className = '', readable = false }) {
  return <div className={clsx(readable ? 'kh-public-readable' : 'kh-public-container', className)}>{children}</div>
}

export function PublicSection({ children, className = '', as: Element = 'section' }) {
  return <Element className={clsx('py-6 sm:py-8 lg:py-10', className)}>{children}</Element>
}

export function SectionHeader({ eyebrow, title, description, icon: Icon, action, className = '' }) {
  return (
    <div className={clsx('flex flex-col gap-4 text-start md:flex-row md:items-end md:justify-between', className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-3 py-1.5 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
            {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
            {eyebrow}
          </p>
        ) : null}
        {title ? <h2 className="mt-3 kh-text-h2 text-[var(--khalsni-public-navy)]">{title}</h2> : null}
        {description ? <p className="mt-3 text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function PublicPageShell({ children, className = '' }) {
  return (
    <div className={clsx('bg-[var(--khalsni-public-bg)] py-5 text-[var(--khalsni-public-text)] sm:py-7', className)}>
      <PublicContainer className="space-y-6">{children}</PublicContainer>
    </div>
  )
}

export function PublicHero({ eyebrow, title, description, icon: Icon, action }) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-5 text-start shadow-soft sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[var(--khalsni-public-primary)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--khalsni-public-primary-soft)] px-4 py-2 text-sm font-extrabold text-[var(--khalsni-public-accent-text)]">
              {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 kh-text-h1 text-[var(--khalsni-public-navy)]">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)] sm:text-base">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  )
}

export function PublicPanel({ children, className = '', ...props }) {
  return (
    <section className={clsx('rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-5 text-[var(--khalsni-public-text)] shadow-soft sm:p-6', className)} {...props}>
      {children}
    </section>
  )
}

export function PublicCard({ children, className = '', interactive = false, as: Element = 'article', ...props }) {
  return (
    <Element className={clsx('kh-public-card p-4', interactive && 'kh-interactive-card kh-focusable', className)} {...props}>
      {children}
    </Element>
  )
}

/**
 * Neutral Khalsni-branded placeholder. Shown whenever an image is missing or
 * fails to load so the app never renders a broken-image icon, an empty box, or
 * `undefined`. It uses the Khalsni visual language without standing in for any
 * specific service.
 */
export function BrandImagePlaceholder({ icon: Icon, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'flex h-full min-h-[inherit] w-full items-center justify-center bg-[var(--khalsni-public-primary-soft,#e8f1fb)]',
        className,
      )}
    >
      <span className="relative flex items-center justify-center">
        <img
          alt=""
          className="h-14 w-14 rounded-[22%] opacity-90 sm:h-16 sm:w-16"
          src="/brand/khalsni-app-icon.png"
        />
        {Icon ? (
          <span className="absolute -bottom-1 -end-1 grid h-6 w-6 place-items-center rounded-full bg-white text-[var(--khalsni-public-primary)] shadow-sm ring-1 ring-[var(--khalsni-public-border,#dbe4ee)]">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>
    </div>
  )
}

export function ImageFallback({ src, alt = '', className = '', icon: Icon = ImageIcon, imgClassName = '', children }) {
  const [hasError, setHasError] = useState(false)
  const canRenderImage = Boolean(src) && !hasError

  return (
    <div className={clsx('kh-public-image-fallback relative overflow-hidden', className)}>
      {canRenderImage ? (
        <img alt={alt} className={clsx('kh-public-image kh-card-image-zoom transition-transform duration-polish', imgClassName)} loading="lazy" onError={() => setHasError(true)} src={src} />
      ) : (
        children || <BrandImagePlaceholder icon={Icon} />
      )}
    </div>
  )
}

export function PublicInput({ className = '', ...props }) {
  return (
    <input
      className={clsx('kh-focusable h-11 w-full rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-4 text-sm font-semibold text-[var(--khalsni-public-text)] outline-none transition placeholder:text-[var(--khalsni-public-text-muted)] focus:border-[var(--khalsni-public-primary)]', className)}
      {...props}
    />
  )
}

export function PublicTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={clsx('kh-focusable min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-4 py-3 text-sm font-semibold text-[var(--khalsni-public-text)] outline-none transition placeholder:text-[var(--khalsni-public-text-muted)] focus:border-[var(--khalsni-public-primary)]', className)}
      {...props}
    />
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button className={clsx(buttonBase, buttonVariants.primary, className)} {...props}>
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button className={clsx(buttonBase, buttonVariants.secondary, className)} {...props}>
      {children}
    </button>
  )
}

export function PublicButton({ children, className = '', variant = 'primary', ...props }) {
  return (
    <button className={clsx(buttonBase, buttonVariants[variant] || buttonVariants.primary, className)} {...props}>
      {children}
    </button>
  )
}

export function PublicLinkButton({ children, className = '', variant = 'primary', to, ...props }) {
  return (
    <Link className={clsx(buttonBase, buttonVariants[variant] || buttonVariants.primary, className)} to={to} {...props}>
      {children}
      {variant === 'primary' ? <ArrowUpRight aria-hidden="true" className="h-4 w-4 rtl:-scale-x-100" /> : null}
    </Link>
  )
}

export function SearchField({ value, onChange, placeholder, className = '', inputClassName = '', ...props }) {
  return (
    <label className={clsx('relative block', className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--khalsni-public-primary)]" />
      <PublicInput className={clsx('ps-11', inputClassName)} onChange={onChange} placeholder={placeholder} value={value} {...props} />
    </label>
  )
}

export function PublicSearchInput(props) {
  return <SearchField {...props} />
}

export function HorizontalCardRow({ children, className = '' }) {
  return (
    <div className={clsx('-mx-3 flex snap-x gap-4 overflow-x-auto px-3 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-3 xl:grid-cols-4', className)}>
      {children}
    </div>
  )
}

export function LoadingSkeleton({ className = '' }) {
  return <div aria-hidden="true" className={clsx('skeleton min-h-28 w-full rounded-[var(--radius-lg)]', className)} />
}

export function PublicLoading({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-8 text-center shadow-soft">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--khalsni-public-border)] border-t-[var(--khalsni-public-primary)]" />
      <p className="text-sm font-semibold text-[var(--khalsni-public-text-secondary)]">{label}</p>
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon, action, illustration, className = '' }) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] px-6 py-12 text-center shadow-soft', className)}>
      {illustration ? (
        <img alt="" className="h-32 w-auto max-w-[13rem] opacity-90" decoding="async" loading="lazy" src={illustration} />
      ) : Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--khalsni-public-primary-soft)] text-[var(--khalsni-public-primary)]">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="text-xl font-extrabold text-[var(--khalsni-public-navy)]">{title}</h3>
      <p className="max-w-xl text-sm font-semibold leading-7 text-[var(--khalsni-public-text-secondary)]">{description}</p>
      {action}
    </div>
  )
}

export function PublicEmptyState(props) {
  return <EmptyState {...props} />
}

export function TrustItem({ icon: Icon, title, description, className = '' }) {
  return (
    <div className={clsx('flex items-start gap-3 text-start', className)}>
      {Icon ? (
        <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary-soft)] text-[var(--khalsni-public-primary)]">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      ) : null}
      <div>
        <h3 className="text-sm font-extrabold text-[var(--khalsni-public-navy)]">{title}</h3>
        {description ? <p className="mt-1 text-sm font-semibold leading-6 text-[var(--khalsni-public-text-secondary)]">{description}</p> : null}
      </div>
    </div>
  )
}
