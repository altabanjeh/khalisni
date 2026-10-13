import { Bell, BellRing } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useExclusiveAction } from '../hooks/useExclusiveAction'
import { useLanguage } from '../context/LanguageContext'
import { useNotifications } from '../context/NotificationContext'
import { hasPermission } from '../utils/authz'
import { formatDateTime } from '../utils/format'
import EmptyState from './EmptyState'

function NotificationPanel({ user, onNavigate }) {
  const { t, isArabic } = useLanguage()
  const { notifications, markRead, markAllRead, loading, error } = useNotifications()
  const unreadCount = notifications.filter((item) => !item.is_read).length
  const notificationPath = hasPermission(user, 'accounts.manage_user_roles') ? '/admin/notifications' : null

  const { toast } = useToast()
  const { busy, exclusive } = useExclusiveAction()

  const handleMarkAllRead = exclusive('mark-all', async () => {
    try {
      await markAllRead()
    } catch {
      toast(t('notifications.markReadError', isArabic ? 'تعذر تعليم الإشعارات كمقروءة. حاول مرة أخرى.' : 'Could not mark notifications as read. Please try again.'), 'error')
    }
  })

  const handleOpen = exclusive('open', async (notification) => {
    if (!notification.is_read) {
      try {
        await markRead(notification.id)
      } catch {
        // Opening the notification matters more than its read flag: it stays
        // unread and is marked on a later attempt.
      }
    }
    onNavigate?.(notification)
  })

  if (loading && !notifications.length) return <div className="p-4 text-sm" role="status">{t('common.loading', 'جارٍ التحميل...')}</div>
  if (error && !notifications.length) return <div className="p-4 text-sm text-danger" role="alert">{t('notifications.loadError', 'تعذر تحميل الإشعارات.')}</div>
  if (!notifications.length) {
    return (
      <div className="w-full sm:max-w-sm">
        <EmptyState
          title={t('notifications.emptyTitle', 'لا توجد إشعارات حالياً')}
          description={t('notifications.emptyDescription', 'ستظهر هنا التنبيهات المرتبطة بالطلبات والوثائق.')}
          icon={Bell}
        />
      </div>
    )
  }

  return (
    <div className="w-full rounded-3xl border border-border bg-white p-4 shadow-panel sm:max-w-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-sm font-bold text-ink">{t('notifications.center', 'مركز الإشعارات')}</p>
          <p className="text-xs text-slate-500">{t('notifications.unreadCount', 'غير المقروءة: {count}', { count: unreadCount })}</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <button
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-60"
              disabled={Boolean(busy)}
              onClick={handleMarkAllRead}
              type="button"
            >
              {t('notifications.markAllRead', 'تعليم الكل كمقروء')}
            </button>
          ) : null}
          <span className="icon-chip h-10 w-10 rounded-xl">
            <BellRing className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {notifications.slice(0, 5).map((notification) => (
          <button
            key={notification.id}
            className="w-full rounded-2xl border border-border px-4 py-3 text-start transition hover:bg-brand-50 disabled:opacity-60"
            disabled={Boolean(busy)}
            onClick={() => handleOpen(notification)}
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
          {t('notifications.viewAll', 'عرض جميع الإشعارات')}
        </Link>
      ) : null}
    </div>
  )
}

export default NotificationPanel
