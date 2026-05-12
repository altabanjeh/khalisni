import { FolderKanban } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function OrdersManagementPage() {
  const { data: orders = [], loading } = useAsyncData(() => api.getAdminOrders(), [], [])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل الطلبات...</div>
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل', render: (row) => row.customer?.full_name || 'غير متاح' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'assigned_provider', label: 'المزود', render: (row) => row.assigned_provider?.full_name || 'غير معين' },
    { key: 'priority', label: 'الأولوية' },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/admin/orders/${row.id}`}>
          التفاصيل
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="قائمة تشغيلية لكل الطلبات الواردة مع الوصول المباشر إلى شاشة التفاصيل والإجراءات الإدارية."
        eyebrow="إدارة الطلبات"
        icon={FolderKanban}
        title="الطلبات"
      />

      <DataTable
        columns={columns}
        emptyDescription="ستظهر هنا جميع الطلبات الواردة للإدارة."
        emptyTitle="لا توجد طلبات"
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.customer?.full_name || 'غير متاح'}</p>
            <p className="text-sm text-slate-500">{row.service?.name_ar}</p>
            <Link className="btn-secondary w-full" to={`/admin/orders/${row.id}`}>
              التفاصيل
            </Link>
          </div>
        )}
        rows={orders}
      />
    </div>
  )
}

export default OrdersManagementPage
