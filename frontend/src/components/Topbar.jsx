import { Bell, ChevronDown, LogOut, Menu, Monitor, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationPanel from './NotificationPanel'

function Topbar({ title, onMenuClick }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function handleNotificationNavigate() {
    setNotificationsOpen(false)
  }

  return (
    <header className="glass-panel relative flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <button
          aria-label="فتح القائمة الجانبية"
          className="btn-ghost p-2 xl:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-600">Khalisni / خلصني</p>
          <h2 className="break-words text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <div className="relative w-full sm:w-auto">
          <button
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            className="btn-secondary w-full px-4 py-2 text-xs sm:w-auto"
            onClick={() => setNotificationsOpen((current) => !current)}
            type="button"
          >
            <Bell className="h-4 w-4" />
            الإشعارات
          </button>
          {notificationsOpen ? (
            <div className="fixed inset-x-4 top-24 z-30 sm:absolute sm:left-0 sm:right-auto sm:top-[calc(100%+0.75rem)]">
              <NotificationPanel onNavigate={handleNotificationNavigate} user={user} />
            </div>
          ) : null}
        </div>

        <div className="flex w-full items-center gap-3 rounded-3xl border border-brand-100 bg-brand-50/80 px-4 py-2.5 text-sm sm:min-w-[220px] sm:w-auto">
          <span className="icon-chip h-10 w-10 rounded-2xl bg-white">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{user?.full_name || 'زائر'}</p>
            <p className="truncate text-xs text-slate-500">{user?.role || 'guest'}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>

        <Link className="btn-secondary w-full px-4 py-2 text-xs sm:w-auto" to="/">
          <Monitor className="h-4 w-4" />
          الموقع العام
        </Link>

        {user ? (
          <button className="btn-primary w-full px-4 py-2 text-xs sm:w-auto" onClick={handleLogout} type="button">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        ) : null}
      </div>
    </header>
  )
}

export default Topbar
