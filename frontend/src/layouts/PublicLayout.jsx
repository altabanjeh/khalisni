import { TriangleAlert } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useLanguage } from '../context/LanguageContext'
import { PublicSiteProvider, usePublicSite } from '../context/PublicSiteContext'
import { getLocalizedField } from '../utils/i18n'
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
  const { language, direction, isArabic } = useLanguage()
  const { content, importantAlert, theme } = usePublicSite()
  const links = [
    { to: '/', label: isArabic ? 'الرئيسية' : 'Home' },
    { to: '/services', label: isArabic ? 'الخدمات' : 'Services' },
    { to: '/track-order', label: isArabic ? 'تتبع الطلب' : 'Track order' },
    { to: '/about', label: isArabic ? 'من نحن' : 'About' },
    { to: '/contact', label: isArabic ? 'تواصل معنا' : 'Contact' },
    { to: '/faq', label: isArabic ? 'الأسئلة الشائعة' : 'FAQ' },
  ]
  const heroTitle = getLocalizedField(content, { ar: 'hero_title_ar', en: 'hero_title_en' }, language)
  const importantAlertTitle = getLocalizedField(importantAlert, { ar: 'title_ar', en: 'title_en' }, language)
  const importantAlertDescription = getLocalizedField(importantAlert, { ar: 'description_ar', en: 'description_en' }, language)
  const importantAlertButtonText = getLocalizedField(importantAlert, { ar: 'button_text_ar', en: 'button_text_en' }, language)
  const primaryButtonText = getLocalizedField(content, { ar: 'primary_button_text', en: 'primary_button_text_en' }, language)
  const footerText = getLocalizedField(content, { ar: 'footer_text', en: 'footer_text_en' }, language)
  const officeAddress = getLocalizedField(content, { ar: 'office_address', en: 'office_address_en' }, language)

  return (
    <div className="public-site-shell" dir={direction}>
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
              <TriangleAlert className="h-5 w-5" />
              <div>
                <p className="font-bold">{importantAlertTitle}</p>
                <p className="mt-1 opacity-90">{importantAlertDescription}</p>
              </div>
            </div>
            <PublicLink
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-4 py-2 font-semibold text-ink transition hover:bg-white"
              label={importantAlertButtonText}
              to={importantAlert.button_url}
            />
          </div>
        </div>
      ) : null}

      <header className="container-shell sticky top-0 z-20 py-4">
        <div
          className="glass-panel flex flex-col gap-5 px-6 py-5 backdrop-blur lg:flex-row lg:items-center lg:justify-between"
          style={{ backgroundColor: 'var(--public-header-background-color)', color: 'var(--public-header-text-color)' }}
        >
          <div className="min-w-0">
            <Link className="flex items-center gap-3 text-2xl font-extrabold text-ink" to="/">
              {theme.logo_url ? <img alt="khalisni" className="h-12 rounded-2xl object-contain" src={theme.logo_url} /> : null}
              <span>Khalisni / خلصني</span>
            </Link>
            <p className="mt-1 truncate text-sm text-slate-600">{heroTitle}</p>
          </div>

          <div className={`flex flex-col gap-3 ${isArabic ? 'lg:items-end' : 'lg:items-start'}`}>
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    isActive
                      ? 'rounded-full bg-brand-50 px-3 py-2 text-brand-700'
                      : 'rounded-full px-3 py-2 text-slate-600 hover:bg-brand-50 hover:text-ink'
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-3">
              <LanguageSwitcher light />
              <Link className="btn-secondary px-4 py-2 text-xs" to="/login">
                {isArabic ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
              <PublicLink
                className="public-primary-button px-4 py-2 text-xs"
                label={primaryButtonText}
                to={content.primary_button_url}
              />
            </div>
          </div>
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
            <p>{footerText}</p>
            <p className="mt-2 text-white/80">
              {content.contact_phone} | {content.email} | {officeAddress}
            </p>
          </div>
          <div className="flex gap-4">
            <Link className="text-white/90 hover:text-white" to="/privacy">
              {isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}
            </Link>
            <Link className="text-white/90 hover:text-white" to="/faq">
              {isArabic ? 'الأسئلة الشائعة' : 'FAQ'}
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
