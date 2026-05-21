import { Bell, BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/services'
import { useAsyncData } from '../hooks/useAsyncData'
import { hasPermission } from '../utils/authz'
import { formatDateTime } from '../utils/format'
import EmptyState from './EmptyState'

function NotificationPanel({ user, onNavigate }) {
  const { data: notifications = [] } = useAsyncData(() => api.getNotificationCenter(), [], [])
  const unreadCount = notifications.filter((item) => !item.is_read).length
  const notificationPath = hasPermission(user, 'accounts.manage_user_roles') ? '/admin/notifications' : null

  if (!notifications.length) {
    return (
      <div className="w-full sm:max-w-sm">
        <EmptyState
          title="لا توجد إشعارات حالياً"
          description="ستظهر هنا التنبيهات المرتبطة بالطلبات والوثائق."
          icon={Bell}
        />
      </div>
    )
  }

  return (
    <div className="w-full rounded-3xl border border-border bg-white p-4 shadow-panel sm:max-w-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-sm font-bold text-ink">مركز الإشعارات</p>
          <p className="text-xs text-slate-500">غير المقروءة: {unreadCount}</p>
        </div>
        <span className="icon-chip h-10 w-10 rounded-xl">
          <BellRing className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {notifications.slice(0, 5).map((notification) => (
          <button
            key={notification.id}
            className="w-full rounded-2xl border border-border px-4 py-3 text-right transition hover:bg-brand-50"
            onClick={() => onNavigate?.(notification)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{notification.title}</p>
                <p className="mt-1 text-xs text-slate-500">{notification.message || notification.order_number}</p>
              </div>
              {!notification.is_read ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
            </div>
            <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.created_at)}</p>
          </button>
        ))}
      </div>

      {notificationPath ? (
        <Link className="btn-secondary mt-4 w-full" onClick={onNavigate} to={notificationPath}>
          عرض جميع الإشعارات
        </Link>
      ) : null}
    </div>
  )
}

export default NotificationPanel
