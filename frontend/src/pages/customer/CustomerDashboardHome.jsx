import { Bell, ClipboardList, FilePlus2, Home, UploadCloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function CustomerDashboardHome() {
  const { user } = useAuth()
  const { data: orders = [], loading } = useAsyncData(() => api.getCustomerOrders(), [], [])
  const { data: notifications = [] } = useAsyncData(() => api.getNotificationCenter(), [], [])

  if (loading) return <LoadingSpinner />

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
          فتح الطلب
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <section className="rounded-[2rem] bg-[#0A2A66] p-6 text-white shadow-panel sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold">بوابة العميل</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight">مرحبا {user?.full_name || ''}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">ملخص عملي لطلباتك الحالية، المستندات المطلوبة منك، وآخر التحديثات المرتبطة بحسابك.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-brand-800" to="/customer/orders/new">
              <FilePlus2 className="inline h-4 w-4" /> طلب جديد
            </Link>
            <Link className="public-secondary-button" to="/customer/orders">طلباتي</Link>
          </div>
        </div>
      </section>

      {cards.waitingCustomer ? (
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="icon-chip bg-white text-amber-600"><UploadCloud className="h-5 w-5" /></span>
              <div>
                <p className="font-bold text-amber-900">هناك طلبات تحتاج مستندات إضافية</p>
                <p className="mt-1 text-sm leading-7 text-amber-800">افتح الطلب من مساحة العمل لمعرفة النواقص ورفع الملفات المطلوبة.</p>
              </div>
            </div>
            <Link className="btn-secondary bg-white" to="/customer/orders">مراجعة الطلبات</Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ClipboardList} title="كل الطلبات" value={cards.total} />
        <StatCard icon={Home} title="نشطة" value={cards.active} />
        <StatCard icon={UploadCloud} title="بانتظارك" tone="warning" value={cards.waitingCustomer} />
        <StatCard icon={Bell} title="مكتملة" tone="success" value={cards.completed} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-brand-700">آخر الطلبات</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink">مساحة متابعة سريعة</h2>
            </div>
            <Link className="btn-secondary" to="/customer/orders">عرض الكل</Link>
          </div>
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
                  <Link className="btn-secondary w-full" to={`/customer/orders/${row.id}`}>فتح الطلب</Link>
                </div>
              )}
              rows={orders.slice(0, 5)}
            />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
            <p className="text-sm font-bold text-brand-700">إجراءات سريعة</p>
            <div className="mt-4 grid gap-3">
              <Link className="btn-primary justify-between" to="/customer/orders/new">طلب خدمة جديدة <FilePlus2 className="h-4 w-4" /></Link>
              <Link className="btn-secondary justify-between" to="/track-order">تتبع طلب عام <ClipboardList className="h-4 w-4" /></Link>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft">
            <p className="text-sm font-bold text-brand-700">آخر الإشعارات</p>
            <div className="mt-4 space-y-3">
              {notifications.slice(0, 4).length ? notifications.slice(0, 4).map((notification) => (
                <div key={notification.id} className="rounded-[var(--radius)] border border-border bg-slate-50 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-ink">{notification.title}</p>
                    {!notification.is_read ? <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                </div>
              )) : <p className="text-sm text-slate-500">لا توجد إشعارات حديثة.</p>}
            </div>
          </section>
        </aside>
      </div>

      <PageHeader
        description="يمكنك العودة لهذه الشاشة كمركز مختصر لمتابعة الطلبات والإجراءات."
        eyebrow="مركز المساعدة"
        icon={Home}
        title="هل تحتاج مساعدة؟"
        actions={<Link className="btn-secondary" to="/customer/manual">فتح الدليل</Link>}
      />
    </div>
  )
}

export default CustomerDashboardHome
