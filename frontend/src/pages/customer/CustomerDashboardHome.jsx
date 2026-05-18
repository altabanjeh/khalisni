import { Bell, ClipboardList, FilePlus2, Home, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function CustomerDashboardHome() {
  const { data: orders = [], loading } = useAsyncData(() => api.getCustomerOrders(), [], [])
  const { data: notifications = [] } = useAsyncData(() => api.getNotificationCenter(), [], [])

  if (loading) {
    return <LoadingSpinner />
  }

  const cards = {
    total: orders.length,
    active: orders.filter((item) => ['NEW', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT'].includes(item.status)).length,
    completed: orders.filter((item) => item.status === 'COMPLETED').length,
    waitingCustomer: orders.filter((item) => item.status === 'WAITING_CUSTOMER').length,
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: 'التسليم المتوقع', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/customer/orders/${row.id}`}>
          عرض التفاصيل
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        actions={
          <Link className="btn-primary" to="/customer/orders/new">
            <FilePlus2 className="h-4 w-4" />
            طلب جديد
          </Link>
        }
        description="ملخص سريع لطلباتك الحالية، المستندات المطلوبة منك، وآخر الإشعارات المرتبطة بحسابك."
        eyebrow="بوابة العميل"
        icon={Home}
        title="لوحة العميل"
      />

      {cards.waitingCustomer ? (
        <div className="glass-panel border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <span className="icon-chip bg-white text-amber-600">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-amber-900">هناك طلبات تحتاج مستندات إضافية</p>
              <p className="mt-1 text-sm text-amber-800">راجع شاشة طلباتي وافتح الطلب الذي يحمل حالة مستندات ناقصة.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="card-grid">
        <StatCard icon={ClipboardList} title="إجمالي الطلبات" value={cards.total} />
        <StatCard icon={Home} title="طلبات نشطة" value={cards.active} />
        <StatCard icon={UploadCloud} title="بانتظار مستندات" tone="warning" value={cards.waitingCustomer} />
        <StatCard icon={Bell} title="طلبات مكتملة" tone="success" value={cards.completed} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">آخر الطلبات</h2>
          <div className="mt-5">
            <DataTable
              columns={columns}
              emptyDescription="ابدأ بطلب أول خدمة لعرضها هنا."
              emptyTitle="لا توجد طلبات"
              mobileCard={(row) => (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-ink">{row.order_number}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-sm text-slate-600">{row.service?.name_ar}</p>
                  <Link className="btn-secondary w-full" to={`/customer/orders/${row.id}`}>
                    عرض التفاصيل
                  </Link>
                </div>
              )}
              rows={orders.slice(0, 5)}
            />
          </div>
        </div>

        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">آخر الإشعارات</h2>
          <div className="mt-5 space-y-3">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="rounded-3xl border border-border px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{notification.title}</p>
                  {!notification.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
                </div>
                <p className="mt-2 text-sm text-slate-600">{notification.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDashboardHome
