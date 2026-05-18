import { ClipboardList, FolderCheck, Search, TimerReset } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-3">
        <span className="icon-chip">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
        </div>
      </div>
    </div>
  )
}

function AssignedOrdersPage() {
  const { data: orders = [], loading } = useAsyncData(() => api.getProviderOrders(), [], [])
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (!normalizedQuery) return true
      return [order.order_number, order.service?.name_ar, order.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [orders, query])

  const summary = useMemo(
    () => ({
      total: orders.length,
      active: orders.filter((order) => ['ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT'].includes(order.status)).length,
      readyForDelivery: orders.filter((order) => order.status === 'READY_FOR_DELIVERY').length,
      completed: orders.filter((order) => order.status === 'COMPLETED').length,
    }),
    [orders],
  )

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar || 'غير محددة' },
    { key: 'customer', label: 'مدينة العميل', render: (row) => row.city || 'غير محددة' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: 'الموعد المتوقع', render: (row) => formatDate(row.expected_delivery_date) },
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
        description="قائمة عملية للطلبات المخصصة لك مع وصول سريع إلى التنفيذ، المستندات، ومراحل التسليم النهائية."
        eyebrow="المزوّد"
        icon={ClipboardList}
        title="الطلبات المعينة"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="كل الطلبات" value={summary.total} />
        <SummaryCard icon={TimerReset} label="قيد التنفيذ" value={summary.active} />
        <SummaryCard icon={FolderCheck} label="جاهزة للتسليم" value={summary.readyForDelivery} />
        <SummaryCard icon={ClipboardList} label="طلبات مكتملة" value={summary.completed} />
      </div>

      <DataTable
        columns={columns}
        emptyDescription="ستظهر هنا الطلبات التي تم تخصيصها لك عند توفرها أو بعد تعديل البحث."
        emptyTitle="لا توجد طلبات مطابقة"
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service?.name_ar || 'غير محددة'}</p>
            <p className="text-sm text-slate-500">{formatDate(row.expected_delivery_date)}</p>
            <Link className="btn-secondary w-full" to={`/provider/orders/${row.id}`}>
              فتح الطلب
            </Link>
          </div>
        )}
        rows={filtered}
        toolbar={
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="field pr-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث برقم الطلب أو الخدمة أو المدينة"
                value={query}
              />
            </div>
            <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-500">
              {filtered.length} طلب ظاهر
            </div>
          </div>
        }
      />
    </div>
  )
}

export default AssignedOrdersPage
