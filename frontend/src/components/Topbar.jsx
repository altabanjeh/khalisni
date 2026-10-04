import { Bell, BookOpenText, ChevronDown, LogOut, Menu, Monitor, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import HelpGuidePanel from './HelpGuidePanel'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationPanel from './NotificationPanel'
import { KhalsniAppIcon } from './brand/KhalsniLogo'

function Topbar({ title, onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, isArabic } = useLanguage()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function handleNotificationNavigate(notification) {
    setNotificationsOpen(false)
    const orderId = notification?.order_id || notification?.order
    if (!orderId) return
    const role = String(user?.role || '').toLowerCase()
    if (role === 'customer') {
      const missing = notification.template_key === 'missing_documents_requested'
      navigate(`/customer/orders/${orderId}${missing ? '/missing-docs' : ''}`)
    } else if (role === 'provider') {
      navigate(`/provider/orders/${orderId}`)
    } else if (role === 'employee' || role === 'support') {
      navigate(`/employee/orders/${orderId}`)
    } else {
      navigate(`/admin/orders/${orderId}`)
    }
  }

  useEffect(() => {
    function handleOpenHelp() {
      setHelpOpen(true)
    }

    window.addEventListener('khalisni:open-help', handleOpenHelp)
    return () => window.removeEventListener('khalisni:open-help', handleOpenHelp)
  }, [])

  return (
    <header className="sticky top-2 z-20 flex items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-card/95 p-3 shadow-soft backdrop-blur-xl sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label={t('topbar.openSidebar', 'فتح القائمة الجانبية')}
          className="btn-ghost min-h-10 min-w-10 p-2 xl:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <KhalsniAppIcon size="sm" to="/" className="hidden sm:inline-flex xl:hidden" />
        <div className="min-w-0">
          <h2 className="break-words text-lg font-extrabold text-ink sm:text-xl">{title}</h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:flex-wrap sm:justify-end">
        <div className="relative">
          <button
            aria-label={t('topbar.notifications', 'الإشعارات')}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            className="btn-secondary min-h-10 min-w-10 px-2 py-2 text-xs sm:px-4"
            onClick={() => setNotificationsOpen((current) => !current)}
            type="button"
          >
            <Bell className="h-4 w-4" />
            <span className="hidden 2xl:inline">{t('topbar.notifications', 'الإشعارات')}</span>
          </button>
          {notificationsOpen ? (
            <div className="fixed inset-x-4 top-24 z-30 2xl:absolute 2xl:left-0 2xl:right-auto 2xl:top-[calc(100%+0.75rem)]">
              <NotificationPanel onNavigate={handleNotificationNavigate} user={user} />
            </div>
          ) : null}
        </div>

        <button
          aria-expanded={mobileActionsOpen}
          aria-label={t('topbar.moreActions', isArabic ? 'المزيد من الخيارات' : 'More options')}
          className="btn-secondary min-h-10 min-w-10 px-2 2xl:hidden"
          onClick={() => setMobileActionsOpen((current) => !current)}
          type="button"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className={`${mobileActionsOpen ? 'flex' : 'hidden'} absolute inset-x-3 top-[calc(100%+0.5rem)] z-30 flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-xl 2xl:static 2xl:flex 2xl:flex-row 2xl:flex-wrap 2xl:items-center 2xl:justify-end 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none`}>

        <button className="btn-secondary w-full px-4 py-2 text-xs 2xl:w-auto" onClick={() => setHelpOpen(true)} type="button">
          <BookOpenText className="h-4 w-4" />
          {t('topbar.manual', 'الدليل')}
        </button>

        <LanguageSwitcher className="w-full justify-center 2xl:w-auto" />

        <div className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm 2xl:min-w-[220px] 2xl:w-auto">
          <span className="icon-chip h-10 w-10 rounded-2xl bg-white">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{user?.full_name || t('topbar.guest', 'زائر')}</p>
            {/* D-A11Y-1: slate-600 (not 500) to clear 4.5:1 on the brand-50 chip. */}
            <p className="truncate text-xs font-semibold text-slate-600">{user?.role || 'guest'}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>

        <Link className="btn-secondary w-full px-4 py-2 text-xs 2xl:w-auto" to="/">
          <Monitor className="h-4 w-4" />
          {t('topbar.publicSite', 'الموقع العام')}
        </Link>

        {user ? (
          <button className="btn-primary w-full px-4 py-2 text-xs 2xl:w-auto" onClick={handleLogout} type="button">
            <LogOut className="h-4 w-4" />
            {t('topbar.logout', 'تسجيل الخروج')}
          </button>
        ) : null}
        </div>
      </div>

      <HelpGuidePanel onClose={() => setHelpOpen(false)} open={helpOpen} />
    </header>
  )
}

export default Topbar
