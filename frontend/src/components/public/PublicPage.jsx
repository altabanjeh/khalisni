import { ArrowUpRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PublicPageShell({ children, className = '' }) {
  return (
    <div className={`bg-[var(--khalsni-public-bg)] py-5 text-[var(--khalsni-public-text)] sm:py-7 ${className}`}>
      <div className="kh-public-container space-y-6">{children}</div>
    </div>
  )
}

export function PublicHero({ eyebrow, title, description, icon: Icon, action }) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-5 text-right shadow-soft sm:p-7">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,82,247,0.08),transparent_46%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-4xl">
          {eyebrow ? (
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm font-extrabold text-brand-700">
              {Icon ? <Icon className="h-4 w-4 text-[var(--khalsni-public-primary)]" /> : null}
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 kh-text-h1">{title}</h1>
          {description ? <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  )
}

export function PublicPanel({ children, className = '' }) {
  return (
    <section className={`rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-surface)] p-5 text-[var(--khalsni-public-text)] shadow-soft sm:p-6 ${className}`}>
      {children}
    </section>
  )
}

export function PublicCard({ children, className = '' }) {
  return (
    <article className={`rounded-[var(--radius-lg)] border border-[var(--khalsni-public-border)] bg-white p-4 text-[var(--khalsni-public-text)] shadow-sm ${className}`}>
      {children}
    </article>
  )
}

export function PublicInput({ className = '', ...props }) {
  return (
    <input
      className={`h-11 w-full rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-semibold text-[#071634] outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20 ${className}`}
      {...props}
    />
  )
}

export function PublicTextarea({ className = '', ...props }) {
  return (
    <textarea
      className={`min-h-32 w-full rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 py-3 text-sm font-semibold text-[#071634] outline-none placeholder:text-slate-400 focus:border-[var(--khalsni-public-primary)] focus:ring-4 focus:ring-blue-500/20 ${className}`}
      {...props}
    />
  )
}

export function PublicButton({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-[var(--khalsni-public-primary)] text-white hover:bg-[var(--khalsni-public-primary-hover)]',
    secondary: 'border border-[var(--khalsni-public-border)] bg-white text-[var(--khalsni-public-text)] hover:bg-[var(--khalsni-public-bg-secondary)]',
  }

  return (
    <button className={`inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function PublicLinkButton({ children, className = '', variant = 'primary', to, ...props }) {
  const variants = {
    primary: 'bg-[var(--khalsni-public-primary)] text-white hover:bg-[var(--khalsni-public-primary-hover)]',
    secondary: 'border border-[var(--khalsni-public-border)] bg-white text-[var(--khalsni-public-text)] hover:bg-[var(--khalsni-public-bg-secondary)]',
  }

  return (
    <Link className={`inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-5 text-sm font-extrabold transition ${variants[variant]} ${className}`} to={to} {...props}>
      {children}
      {variant === 'primary' ? <ArrowUpRight className="h-4 w-4" /> : null}
    </Link>
  )
}

export function PublicSearchInput({ value, onChange, placeholder }) {
  return (
    <label className="relative block">
      <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--khalsni-public-primary)]" />
      <PublicInput className="pr-11" onChange={onChange} placeholder={placeholder} value={value} />
    </label>
  )
}

export function PublicLoading({ label = 'جاري التحميل...' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-[var(--khalsni-public-border)] bg-white p-8 text-center shadow-soft">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-[var(--khalsni-public-primary)]" />
      <p className="text-sm font-semibold text-slate-600">{label}</p>
    </div>
  )
}

export function PublicEmptyState({ title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[var(--khalsni-public-border)] bg-white px-6 py-12 text-center shadow-soft">
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full border border-brand-100 bg-brand-50 text-[var(--khalsni-public-primary)]">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <h3 className="text-xl font-extrabold text-ink">{title}</h3>
      <p className="max-w-xl text-sm font-semibold leading-7 text-slate-600">{description}</p>
      {action}
    </div>
  )
}
