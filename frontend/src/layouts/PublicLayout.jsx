import { LogIn, Mail, MapPin, Menu, MessageCircle, Phone, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { PublicSiteProvider, usePublicSite } from '../context/PublicSiteContext'
import { getDefaultDashboardPath } from '../utils/authz'
import { getLocalizedField } from '../utils/i18n'

function KhalsniLogo({ logoUrl }) {
  if (logoUrl) {
    return <img alt="Khalsni" className="h-10 w-auto object-contain" src={logoUrl} />
  }

  return (
    <span className="flex items-center gap-2 text-[var(--khalsni-public-text)]">
      <span className="text-right leading-none">
        <span className="block text-[1.16rem] font-extrabold">خلصني</span>
        <span className="block text-[0.56rem] font-bold tracking-wide text-slate-500">Khalsni</span>
      </span>
      <span className="relative grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--khalsni-public-primary)]">
        <span className="h-3 w-[1.125rem] rotate-[-35deg] border-b-[3px] border-r-[3px] border-[var(--khalsni-public-primary)]" />
      </span>
    </span>
  )
}

function PublicLayoutContent() {
  const { direction, isArabic } = useLanguage()
  const { user } = useAuth()
  const { content, theme } = usePublicSite()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const portalPath = user ? getDefaultDashboardPath(user) : ''
  const officeAddress = getLocalizedField(content, { ar: 'office_address', en: 'office_address_en' }, isArabic ? 'ar' : 'en')
  const footerText = getLocalizedField(content, { ar: 'footer_text', en: 'footer_text_en' }, isArabic ? 'ar' : 'en')

  const links = [
    { to: '/', label: 'الرئيسية', end: true },
    { to: '/services', label: 'الخدمات' },
    { to: '/track-order', label: 'تتبع الطلب' },
    { to: '/faq', label: 'المساعدة' },
    { to: '/about', label: 'من نحن' },
    { to: '/contact', label: 'تواصل معنا' },
  ]

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
    <div className="min-h-screen bg-[var(--khalsni-public-bg)] text-[var(--khalsni-public-text)]" dir={direction}>
      <header className="sticky top-0 z-50 border-b border-[var(--khalsni-public-border)] bg-white/95 backdrop-blur-xl">
        <div className="kh-public-container">
          <div className="flex min-h-[3.55rem] items-center justify-between gap-2">
            <Link className="shrink-0" to="/" aria-label="Khalsni home">
              <KhalsniLogo logoUrl={theme.logo_url} />
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 text-[0.72rem] font-extrabold min-[700px]:flex lg:text-[0.78rem]">
              {links.map((link) => (
                <NavLink
                  end={link.end}
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `relative whitespace-nowrap px-1.5 py-5 text-slate-600 transition hover:text-[var(--khalsni-public-primary)] lg:px-4 ${
                      isActive
                        ? 'text-[var(--khalsni-public-primary)] after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[var(--khalsni-public-primary)]'
                        : ''
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="hidden shrink-0 items-center gap-2 min-[700px]:flex">
              {user ? (
                <Link className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-3 text-[0.7rem] font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]" to={portalPath}>
                  <UserRound className="h-4 w-4" />
                  بوابتي
                </Link>
              ) : (
                <>
                  <Link className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-3 text-[0.7rem] font-extrabold text-white transition hover:bg-[var(--khalsni-public-primary-hover)]" to="/login">
                    <LogIn className="h-4 w-4" />
                    تسجيل الدخول
                  </Link>
                  <Link className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-3 text-[0.7rem] font-extrabold text-[var(--khalsni-public-text)] transition hover:bg-[var(--khalsni-public-bg-secondary)]" to="/register">
                    إنشاء حساب
                  </Link>
                </>
              )}
            </div>

            <button
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'إغلاق قائمة التنقل' : 'فتح قائمة التنقل'}
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white text-[var(--khalsni-public-text)] min-[700px]:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              type="button"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-[var(--khalsni-public-border)] bg-white min-[700px]:hidden">
            <div className="kh-public-container py-4">
              <nav className="grid gap-1 text-right text-sm font-bold">
                {links.map((link) => (
                  <NavLink
                    end={link.end}
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `rounded-[var(--radius-md)] px-4 py-3 ${isActive ? 'bg-[var(--khalsni-public-primary)] text-white' : 'text-slate-700 hover:bg-[var(--khalsni-public-bg-secondary)] hover:text-[var(--khalsni-public-primary)]'}`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
              <div className="mt-4 grid gap-3">
                {user ? (
                  <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 text-sm font-bold text-white" to={portalPath}>
                    <UserRound className="h-4 w-4" />
                    بوابتي
                  </Link>
                ) : (
                  <>
                    <Link className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--khalsni-public-primary)] px-4 text-sm font-bold text-white" to="/login">
                      <LogIn className="h-4 w-4" />
                      تسجيل الدخول
                    </Link>
                    <Link className="inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--khalsni-public-border)] bg-white px-4 text-sm font-bold text-[var(--khalsni-public-text)]" to="/register">
                      إنشاء حساب
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <main className="bg-[var(--khalsni-public-bg)]">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--khalsni-public-border)] bg-[var(--khalsni-public-bg-secondary)]">
        <div className="kh-public-container py-7">
          <div className="grid gap-8 text-right md:grid-cols-[1.2fr_0.75fr_0.75fr_1fr]">
            <div>
              <KhalsniLogo logoUrl={theme.logo_url} />
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                {footerText || 'منصة إلكترونية ذكية لإنجاز المعاملات الحكومية والإدارية بسهولة وأمان من مكان واحد.'}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                {['f', 'x', 'ig', 'in', '▶'].map((item) => (
                  <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--khalsni-public-border)] bg-white text-[0.65rem] font-bold text-slate-500" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-ink">خدماتنا</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/services?search=العقارات">العقارات والأراضي</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/services?search=الشركات">الشركات والأعمال</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/services?search=الضرائب">الضرائب والرسوم</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/services?search=الدولية">الخدمات الدولية</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/contact">طلب خاص</Link>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-ink">روابط سريعة</h2>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/">الرئيسية</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/services">الخدمات</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/track-order">تتبع الطلب</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/faq">المساعدة</Link>
                <Link className="hover:text-[var(--khalsni-public-primary)]" to="/privacy">سياسة الخصوصية</Link>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-ink">تواصل معنا</h2>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <a className="flex items-center justify-end gap-2 hover:text-[var(--khalsni-public-primary)]" href={`tel:${content.contact_phone || '+962790000000'}`}>
                  <span>{content.contact_phone || '+962 7 9000 0000'}</span>
                  <Phone className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
                </a>
                <a className="flex items-center justify-end gap-2 hover:text-[var(--khalsni-public-primary)]" href={`mailto:${content.email || 'info@khalisni.com'}`}>
                  <span>{content.email || 'info@khalisni.com'}</span>
                  <Mail className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
                </a>
                <p className="flex items-center justify-end gap-2">
                  <span>{officeAddress || 'عمان - الأردن'}</span>
                  <MapPin className="h-4 w-4 text-[var(--khalsni-public-primary)]" />
                </p>
              </div>
            </div>
          </div>
          <p className="mt-7 border-t border-[var(--khalsni-public-border)] pt-5 text-center text-xs text-slate-500">
            جميع الحقوق محفوظة © 2026 خلصني
          </p>
        </div>
      </footer>

      <Link
        aria-label="تواصل مع الدعم"
        className="fixed bottom-5 left-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[var(--khalsni-public-primary)] text-white shadow-lg transition hover:bg-[var(--khalsni-public-primary-hover)]"
        to="/contact"
      >
        <MessageCircle className="h-7 w-7" />
      </Link>
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
