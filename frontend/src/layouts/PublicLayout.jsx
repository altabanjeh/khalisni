import { AlertTriangle } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { PublicSiteProvider, usePublicSite } from '../context/PublicSiteContext'
import { isExternalUrl } from '../utils/publicSiteDefaults'

function PublicLink({ className, label, to }) {
  if (!to || !label) return null
  if (isExternalUrl(to)) {
    return (
      <a className={className} href={to} rel="noreferrer" target="_blank">
        {label}
      </a>
    )
  }

  return (
    <Link className={className} to={to}>
      {label}
    </Link>
  )
}

function PublicLayoutContent() {
  const { content, importantAlert, theme } = usePublicSite()
  const links = [
    { to: '/', label: 'الرئيسية' },
    { to: '/services', label: 'الخدمات' },
    { to: '/track-order', label: 'تتبع الطلب' },
    { to: '/about', label: 'من نحن' },
    { to: '/contact', label: 'تواصل معنا' },
    { to: '/faq', label: 'الأسئلة الشائعة' },
  ]

  return (
    <div className="min-h-screen">
      {importantAlert ? (
        <div className="container-shell pt-6">
          <div
            className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border px-5 py-4 text-sm shadow-soft"
            style={{
              backgroundColor: importantAlert.background_color || '#fff7d6',
              color: importantAlert.text_color || '#7c2d12',
            }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-bold">{importantAlert.title_ar || importantAlert.title_en}</p>
                <p className="mt-1 opacity-90">{importantAlert.description_ar || importantAlert.description_en}</p>
              </div>
            </div>
            <PublicLink
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-4 py-2 font-semibold text-ink transition hover:bg-white"
              label={importantAlert.button_text_ar || importantAlert.button_text_en}
              to={importantAlert.button_url}
            />
          </div>
        </div>
      ) : null}

      <header className="container-shell py-6">
        <div
          className="glass-panel flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center lg:justify-between"
          style={{ backgroundColor: 'var(--public-header-background-color)', color: 'var(--public-header-text-color)' }}
        >
          <div>
            <Link className="flex items-center gap-3 text-2xl font-extrabold text-ink" to="/">
              {theme.logo_url ? <img alt="khalisni" className="h-12 rounded-2xl object-contain" src={theme.logo_url} /> : null}
              <span>Khalisni / خلصني</span>
            </Link>
            <p className="mt-1 text-sm text-slate-600">{content.hero_title_ar || content.hero_title_en}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (isActive ? 'text-brand-700' : 'text-slate-600 hover:text-ink')}
              >
                {link.label}
              </NavLink>
            ))}
            <Link className="btn-secondary px-4 py-2 text-xs" to="/login">
              تسجيل الدخول
            </Link>
            <PublicLink className="public-primary-button px-4 py-2 text-xs" label={content.primary_button_text} to={content.primary_button_url} />
          </nav>
        </div>
      </header>

      <main className="container-shell pb-16">
        <Outlet />
      </main>

      <footer className="container-shell pb-8">
        <div
          className="glass-panel flex flex-col gap-4 px-6 py-5 text-sm md:flex-row md:items-center md:justify-between"
          style={{ backgroundColor: 'var(--public-footer-background-color)', color: 'var(--public-footer-text-color)' }}
        >
          <div>
            <p>{content.footer_text}</p>
            <p className="mt-2 text-white/80">
              {content.contact_phone} | {content.email} | {content.office_address}
            </p>
          </div>
          <div className="flex gap-4">
            <Link className="text-white/90 hover:text-white" to="/privacy">
              سياسة الخصوصية
            </Link>
            <Link className="text-white/90 hover:text-white" to="/faq">
              الأسئلة الشائعة
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function PublicLayout() {
  return (
    <PublicSiteProvider>
      <PublicLayoutContent />
    </PublicSiteProvider>
  )
}

export default PublicLayout
