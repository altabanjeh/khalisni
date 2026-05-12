import { ClipboardList, Search } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function MyOrdersPage() {
  const [query, setQuery] = useState('')
  const { data: orders = [], loading } = useAsyncData(() => api.getCustomerOrders(), [], [])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل الطلبات...</div>
  }

  const filteredOrders = orders.filter((order) => {
    const haystack = `${order.order_number} ${order.service?.name_ar || ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    { key: 'expected_delivery_date', label: 'التسليم المتوقع', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/customer/orders/${row.id}`}>
          عرض
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="جميع طلباتك في مكان واحد مع البحث السريع وإمكانية الانتقال المباشر إلى شاشة التفاصيل."
        eyebrow="العميل"
        icon={ClipboardList}
        title="طلباتي"
      />

      <DataTable
        columns={columns}
        emptyDescription="بإمكانك طلب خدمة جديدة من شاشة الطلب الجديد."
        emptyTitle="لا توجد طلبات بعد"
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service?.name_ar}</p>
            <p className="text-sm text-slate-500">التسليم المتوقع: {formatDate(row.expected_delivery_date)}</p>
            <Link className="btn-secondary w-full" to={`/customer/orders/${row.id}`}>
              عرض
            </Link>
          </div>
        )}
        rows={filteredOrders}
        toolbar={
          <div className="flex items-center gap-3">
            <span className="icon-chip h-10 w-10 rounded-xl">
              <Search className="h-4 w-4" />
            </span>
            <input
              className="field"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث برقم الطلب أو اسم الخدمة"
              value={query}
            />
          </div>
        }
      />
    </div>
  )
}

export default MyOrdersPage
