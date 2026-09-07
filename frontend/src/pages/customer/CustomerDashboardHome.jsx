import { ArrowUpRight, Bell, ClipboardList, Compass, FilePlus2, LifeBuoy } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import RequestCard from '../../components/RequestCard'
import { EmptyState } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const TERMINAL = new Set(['COMPLETED', 'DELIVERED', 'CLOSED', 'CANCELLED', 'REJECTED', 'VERIFIED'])

function SectionTitle({ children, count, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-extrabold text-ink sm:text-xl">{children}</h2>
        {count != null ? (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{count}</span>
        ) : null}
      </div>
      {action}
    </div>
  )
}

function CustomerDashboardHome() {
  const { user } = useAuth()
  const { isArabic } = useLanguage()
  const { data: orders = [], loading, error } = useAsyncData(() => api.getCustomerOrders(), [], [])
  const { data: notifications = [] } = useAsyncData(() => api.getNotificationCenter(), [], [])

  const buckets = useMemo(() => {
    const list = Array.isArray(orders) ? orders : []
    const actionRequired = list.filter(
      (o) => String(o.status).toUpperCase() === 'WAITING_CUSTOMER' || (o.missing_document_types?.length ?? 0) > 0,
    )
    const active = list.filter(
      (o) => !TERMINAL.has(String(o.status).toUpperCase()) && !actionRequired.includes(o),
    )
    const sortByUpdated = (a, b) =>
      new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    return {
      actionRequired: [...actionRequired].sort(sortByUpdated),
      active: [...active].sort(sortByUpdated),
      recent: [...list].sort(sortByUpdated).slice(0, 4),
    }
  }, [orders])

  if (loading) return <LoadingSpinner />

  const firstName = (user?.full_name || '').split(' ')[0]

  return (
    <div className="space-y-6">
      {/* Customer header */}
      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">
              {isArabic ? 'بوابة العميل' : 'Customer portal'}
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
              {isArabic ? `أهلاً ${firstName || ''}`.trim() : `Welcome${firstName ? `, ${firstName}` : ''}`}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-600">
              {isArabic
                ? 'كل ما يخص طلباتك في مكان واحد — ابدأ بما هو مطلوب منك الآن.'
                : 'Everything about your requests in one place — start with what needs you now.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="btn-primary" to="/customer/orders/new">
              <FilePlus2 className="h-4 w-4" />
              {isArabic ? 'طلب خدمة جديدة' : 'New request'}
            </Link>
            <Link className="btn-secondary" to="/services">
              <Compass className="h-4 w-4" />
              {isArabic ? 'تصفح الخدمات' : 'Browse services'}
            </Link>
          </div>
        </div>
      </section>

      {error ? (
        <EmptyState
          icon={ClipboardList}
          title={isArabic ? 'تعذر تحميل طلباتك' : 'Could not load your requests'}
          description={isArabic ? 'حدث خطأ أثناء الاتصال. حدّث الصفحة للمحاولة مرة أخرى.' : 'Something went wrong. Refresh the page to try again.'}
        />
      ) : null}

      {/* Action required — only when there is something */}
      {buckets.actionRequired.length ? (
        <section>
          <SectionTitle count={buckets.actionRequired.length}>
            {isArabic ? 'مطلوب إجراء منك' : 'Action required'}
          </SectionTitle>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buckets.actionRequired.map((order) => (
              <RequestCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Active requests */}
      <section>
        <SectionTitle
          count={buckets.active.length || undefined}
          action={
            <Link className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-600 hover:text-brand-700" to="/customer/orders">
              {isArabic ? 'كل الطلبات' : 'All requests'}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          }
        >
          {isArabic ? 'طلبات قيد التنفيذ' : 'Active requests'}
        </SectionTitle>
        {buckets.active.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {buckets.active.map((order) => (
              <RequestCard key={order.id} order={order} />
            ))}
          </div>
        ) : !buckets.actionRequired.length ? (
          <EmptyState
            icon={FilePlus2}
            title={isArabic ? 'لا توجد طلبات نشطة' : 'No active requests'}
            description={
              isArabic
                ? 'ابدأ طلبك الأول من كتالوج الخدمات وسيظهر هنا مع حالته وخطوته التالية.'
                : 'Start your first request from the service catalog and it will appear here with its status and next step.'
            }
            action={
              <Link className="btn-primary" to="/services">
                {isArabic ? 'تصفح الخدمات' : 'Browse services'}
              </Link>
            }
          />
        ) : (
          <p className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-4 py-3 text-sm font-semibold text-slate-600">
            {isArabic ? 'لا توجد طلبات نشطة أخرى.' : 'No other active requests.'}
          </p>
        )}
      </section>

      {/* Recent activity + notifications + support */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
          <SectionTitle
            action={
              <Link className="text-sm font-extrabold text-brand-600 hover:text-brand-700" to="/customer/orders">
                {isArabic ? 'عرض الكل' : 'View all'}
              </Link>
            }
          >
            {isArabic ? 'آخر التحديثات' : 'Recently updated'}
          </SectionTitle>
          {buckets.recent.length ? (
            <ul className="divide-y divide-border">
              {buckets.recent.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{order.service?.name_ar || order.service?.name_en || (isArabic ? 'خدمة' : 'Service')}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">#{order.order_number}</p>
                  </div>
                  <Link className="btn-ghost shrink-0 px-3 py-1.5 text-xs" to={`/customer/orders/${order.id}`}>
                    {isArabic ? 'فتح' : 'Open'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-semibold text-slate-500">{isArabic ? 'لا يوجد نشاط بعد.' : 'No activity yet.'}</p>
          )}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-extrabold text-ink">{isArabic ? 'آخر الإشعارات' : 'Latest notifications'}</h2>
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 4).length ? (
                notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className="rounded-[var(--radius-md)] border border-border bg-brand-50/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-ink">{notification.title}</p>
                      {!notification.is_read ? <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" /> : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{notification.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold text-slate-500">{isArabic ? 'لا توجد إشعارات حديثة.' : 'No recent notifications.'}</p>
              )}
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex items-center gap-2">
              <LifeBuoy className="h-4 w-4 text-brand-600" />
              <h2 className="text-sm font-extrabold text-ink">{isArabic ? 'تحتاج مساعدة؟' : 'Need help?'}</h2>
            </div>
            <p className="text-sm font-semibold leading-7 text-slate-600">
              {isArabic
                ? 'راجع دليل الاستخدام أو تابع طلباً قائماً من صفحة التتبع.'
                : 'Open the user guide or follow an existing request from the tracking page.'}
            </p>
            <div className="mt-4 grid gap-2">
              <Link className="btn-secondary justify-between" to="/customer/manual">
                {isArabic ? 'فتح الدليل' : 'Open the guide'}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
              <Link className="btn-ghost justify-between" to="/track-order">
                {isArabic ? 'تتبع طلب' : 'Track a request'}
                <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default CustomerDashboardHome
