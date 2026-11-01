import { Bell, BookOpenText, ChevronDown, LogOut, Menu, Monitor, UserRound } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { useNotifications } from '../context/NotificationContext'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { getRoleLabel } from '../utils/format'
import HelpGuidePanel from './HelpGuidePanel'
import LanguageSwitcher from './LanguageSwitcher'
import NotificationPanel from './NotificationPanel'
import { KhalsniAppIcon } from './brand/KhalsniLogo'

function Topbar({ title, onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { t, isArabic, language } = useLanguage()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const notificationsWrapperRef = useRef(null)
  const notificationsPanelRef = useRef(null)
  const notificationsPanelId = useId()
  const notificationsTitleId = useId()
  const notificationsBadgeId = useId()
  const { notifications: bellNotifications = [], unreadCount: serverUnreadCount } = useNotifications()
  // Unread badge on the bell, from the server count (DEF-C05).
  const unreadCount = serverUnreadCount ?? bellNotifications.filter((item) => !item.is_read).length
  const unreadBadge = unreadCount > 99 ? '99+' : String(unreadCount)
  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])
  const closeHelp = useCallback(() => setHelpOpen(false), [])

  // Non-modal popover dialog: focus moves in on open, Escape closes, focus
  // returns to the bell; a click outside also closes it.
  useDialogFocus(notificationsOpen, notificationsPanelRef, { onClose: closeNotifications })

  useEffect(() => {
    if (!notificationsOpen) return undefined
    function handlePointerDown(event) {
      if (!notificationsWrapperRef.current?.contains(event.target)) setNotificationsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [notificationsOpen])

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
    <header className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-border bg-card/95 p-3 shadow-soft backdrop-blur-xl sm:p-4">
      <div className="flex min-w-[12rem] flex-1 items-center gap-3">
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
          <h2 className="text-lg font-extrabold text-ink sm:text-xl">{title}</h2>
        </div>
      </div>

      <div className="flex max-w-full items-center gap-2 sm:flex-wrap sm:justify-end 2xl:w-full 2xl:flex-nowrap">
        <div className="relative" ref={notificationsWrapperRef}>
          <button
            aria-controls={notificationsOpen ? notificationsPanelId : undefined}
            aria-label={t('topbar.notifications', 'الإشعارات')}
            aria-expanded={notificationsOpen}
            aria-describedby={unreadCount > 0 ? notificationsBadgeId : undefined}
            aria-haspopup="dialog"
            className="btn-secondary relative min-h-10 min-w-10 px-2 py-2 text-xs"
            onClick={() => setNotificationsOpen((current) => !current)}
            type="button"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span
                className="absolute -end-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[0.65rem] font-black leading-none text-white ring-2 ring-white"
                data-testid="bell-unread-badge"
                id={notificationsBadgeId}
              >
                <span aria-hidden="true">{unreadBadge}</span>
                <span className="sr-only">{isArabic ? `${unreadCount} إشعارات غير مقروءة` : `${unreadCount} unread notifications`}</span>
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div
              aria-labelledby={notificationsTitleId}
              className="fixed inset-x-4 top-24 z-30 focus:outline-none 2xl:absolute 2xl:left-0 2xl:right-auto 2xl:top-[calc(100%+0.75rem)]"
              id={notificationsPanelId}
              ref={notificationsPanelRef}
              role="dialog"
              tabIndex={-1}
            >
              <NotificationPanel onNavigate={handleNotificationNavigate} titleId={notificationsTitleId} user={user} />
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

        <div className={`${mobileActionsOpen ? 'flex' : 'hidden'} absolute inset-x-3 top-[calc(100%+0.5rem)] z-30 flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card p-3 shadow-xl 2xl:static 2xl:flex 2xl:flex-row 2xl:flex-nowrap 2xl:items-center 2xl:justify-end 2xl:border-0 2xl:bg-transparent 2xl:p-0 2xl:shadow-none`}>

        <button aria-haspopup="dialog" className="btn-secondary w-full px-4 py-2 text-xs 2xl:w-auto" onClick={() => setHelpOpen(true)} type="button">
          <BookOpenText className="h-4 w-4" />
          {t('topbar.manual', 'الدليل')}
        </button>

        <LanguageSwitcher className="w-full justify-center 2xl:w-auto" />

        <div className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm 2xl:w-auto">
          <span className="icon-chip h-10 w-10 rounded-2xl bg-white">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{user?.full_name || t('topbar.guest', 'زائر')}</p>
            {/* D-A11Y-1: slate-600 (not 500) to clear 4.5:1 on the brand-50 chip. */}
            <p className="truncate text-xs font-semibold text-slate-600">{getRoleLabel(user?.role || 'guest', language)}</p>
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

      <HelpGuidePanel onClose={closeHelp} open={helpOpen} />
    </header>
  )
}

export default Topbar
