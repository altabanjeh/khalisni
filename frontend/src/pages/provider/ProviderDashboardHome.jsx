import { Building2, Clock3, FolderCheck, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function ProviderDashboardHome() {
  const { data, loading } = useAsyncData(() => api.getProviderDashboard(), [], null)
  const { data: orders = [] } = useAsyncData(() => api.getProviderOrders(), [], [])

  if (loading || !data) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل لوحة المزود...</div>
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: 'الموعد', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/provider/orders/${row.id}`}>
          فتح الطلب
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        actions={
          <Link className="btn-primary" to="/provider/orders">
            عرض الطلبات المعينة
          </Link>
        }
        description="يعرض هذا الملخص حجم العمل الحالي للمزود والطلبات الأقرب إلى موعد التسليم."
        eyebrow="بوابة المزود"
        icon={Building2}
        title="لوحة المزود"
      />

      <div className="card-grid">
        <StatCard icon={FolderCheck} title="طلبات معينة" value={data.assigned_orders} />
        <StatCard icon={Clock3} title="قيد التنفيذ" tone="primary" value={data.in_progress} />
        <StatCard icon={Building2} title="مكتملة" tone="success" value={data.completed} />
        <StatCard icon={ShieldAlert} title="متأخرة" tone="warning" value={data.delayed} />
      </div>

      <DataTable
        columns={columns}
        emptyDescription="ستظهر هنا الطلبات التي تم تخصيصها لك."
        emptyTitle="لا توجد طلبات معينة"
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service?.name_ar}</p>
            <Link className="btn-secondary w-full" to={`/provider/orders/${row.id}`}>
              فتح الطلب
            </Link>
          </div>
        )}
        rows={orders.slice(0, 5)}
      />
    </div>
  )
}

export default ProviderDashboardHome
