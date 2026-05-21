import clsx from 'clsx'
import { Menu, TriangleAlert, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  return (
    <div className="public-site-shell" dir={direction}>
      {importantAlert ? (
        <div className="container-shell pt-4 sm:pt-6">
          <div
            className="flex flex-col gap-4 rounded-[1.5rem] border px-4 py-4 text-sm shadow-soft sm:px-5"
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
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-4 py-2 font-semibold text-ink transition hover:bg-white sm:self-start"
              label={importantAlertButtonText}
              to={importantAlert.button_url}
            />
          </div>
        </div>
      ) : null}

      <header className="container-shell sticky top-0 z-30 py-3 sm:py-4">
        <div
          className="glass-panel relative px-4 py-4 backdrop-blur sm:px-6 sm:py-5"
          style={{ backgroundColor: 'var(--public-header-background-color)', color: 'var(--public-header-text-color)' }}
        >
          <div className="flex items-start justify-between gap-4 lg:items-center">
            <div className="min-w-0">
              <Link className="flex items-center gap-3 text-xl font-extrabold text-ink sm:text-2xl" to="/">
                {theme.logo_url ? <img alt="khalisni" className="h-10 rounded-2xl object-contain sm:h-12" src={theme.logo_url} /> : null}
                <span className="break-words">Khalisni / خلصني</span>
              </Link>
              <p className="mt-1 max-w-2xl truncate text-sm text-slate-600">{heroTitle}</p>
            </div>

            <button
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="btn-ghost p-2 lg:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <div
            className={clsx(
              'mt-4 flex-col gap-3 border-t border-border pt-4 lg:mt-0 lg:flex lg:border-t-0 lg:pt-0',
              mobileMenuOpen ? 'flex' : 'hidden',
              isArabic ? 'lg:items-end' : 'lg:items-start',
            )}
          >
            <nav className="flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:flex-wrap sm:items-center">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <LanguageSwitcher light />
              <Link className="btn-secondary w-full px-4 py-2 text-xs sm:w-auto" to="/login">
                {isArabic ? 'تسجيل الدخول' : 'Sign in'}
              </Link>
              <PublicLink
                className="public-primary-button w-full px-4 py-2 text-xs sm:w-auto"
                label={primaryButtonText}
                to={content.primary_button_url}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="container-shell pb-12 sm:pb-16">
        <Outlet />
      </main>

      <footer className="container-shell pb-8">
        <div
          className="glass-panel flex flex-col gap-4 px-4 py-5 text-sm sm:px-6 md:flex-row md:items-center md:justify-between"
          style={{ backgroundColor: 'var(--public-footer-background-color)', color: 'var(--public-footer-text-color)' }}
        >
          <div>
            <p>{footerText}</p>
            <p className="mt-2 text-white/80">
              {content.contact_phone} | {content.email} | {officeAddress}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
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
