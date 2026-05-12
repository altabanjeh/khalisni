import { ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function AssignedOrdersPage() {
  const { data: orders = [], loading } = useAsyncData(() => api.getProviderOrders(), [], [])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل الطلبات المعينة...</div>
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'customer', label: 'مدينة العميل', render: (row) => row.city },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: 'الموعد', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'إجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/provider/orders/${row.id}`}>
          عرض
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="القائمة التشغيلية للطلبات التي تم تعيينها لك مع الموعد المتوقع وحالة كل طلب."
        eyebrow="المزود"
        icon={ClipboardList}
        title="الطلبات المعينة"
      />

      <DataTable
        columns={columns}
        emptyDescription="ستظهر الطلبات التي تم تخصيصها لك هنا."
        emptyTitle="لا توجد طلبات معينة"
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service?.name_ar}</p>
            <p className="text-sm text-slate-500">{formatDate(row.expected_delivery_date)}</p>
            <Link className="btn-secondary w-full" to={`/provider/orders/${row.id}`}>
              عرض
            </Link>
          </div>
        )}
        rows={orders}
      />
    </div>
  )
}

export default AssignedOrdersPage
