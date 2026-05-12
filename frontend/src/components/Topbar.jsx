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
    <header className="glass-panel relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <button className="btn-ghost p-2 lg:hidden" onClick={onMenuClick} type="button">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-semibold text-brand-600">Khalisni / خلصني</p>
          <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <button
            className="btn-secondary px-4 py-2 text-xs"
            onClick={() => setNotificationsOpen((current) => !current)}
            type="button"
          >
            <Bell className="h-4 w-4" />
            الإشعارات
          </button>
          {notificationsOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.75rem)] z-30">
              <NotificationPanel onNavigate={handleNotificationNavigate} user={user} />
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2 text-sm">
          <span className="icon-chip h-9 w-9 rounded-xl">
            <UserRound className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold text-ink">{user?.full_name || 'زائر'}</p>
            <p className="text-xs text-slate-500">{user?.role || 'guest'}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>

        <Link className="btn-secondary px-4 py-2 text-xs" to="/">
          <Monitor className="h-4 w-4" />
          الموقع العام
        </Link>

        {user ? (
          <button className="btn-primary px-4 py-2 text-xs" onClick={handleLogout} type="button">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        ) : null}
      </div>
    </header>
  )
}

export default Topbar

