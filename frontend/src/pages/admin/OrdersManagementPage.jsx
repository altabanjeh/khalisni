import { ClipboardCheck, FolderKanban, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 20

function SummaryCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
  }

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-3">
        <span className={`icon-chip ${tones[tone] || tones.brand}`}>
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

function OrdersManagementPage() {
  const { data: orders = [], loading } = useAsyncData(() => api.getAdminOrders(), [], [])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((order) => {
      if (!q) return true

      return [
        order.order_number,
        order.customer?.full_name,
        order.service?.name_ar,
        order.assigned_provider?.full_name,
        order.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [orders, search])

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(
    () => ({
      total: orders.length,
      underReview: orders.filter((order) => order.status === 'UNDER_REVIEW').length,
      awaitingProvider: orders.filter((order) => ['NEW', 'WAITING_CUSTOMER'].includes(order.status)).length,
      inExecution: orders.filter((order) => ['ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT'].includes(order.status)).length,
    }),
    [orders],
  )

  function handleSearch(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل', render: (row) => row.customer?.full_name || 'غير متاح' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar || 'غير محددة' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'assigned_provider', label: 'المزوّد', render: (row) => row.assigned_provider?.full_name || 'غير معين' },
    { key: 'priority', label: 'الأولوية', render: (row) => row.priority || 'عادية' },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/admin/orders/${row.id}`}>
          فتح الطلب
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="لوحة تشغيل موحدة لمتابعة الطلبات الحالية، الوصول السريع للتفاصيل، ومراجعة حالة التنفيذ والمزوّد من مكان واحد."
        eyebrow="إدارة الطلبات"
        icon={FolderKanban}
        title="الطلبات الحالية"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardCheck} label="إجمالي الطلبات" value={summary.total} />
        <SummaryCard icon={Search} label="قيد المراجعة" value={summary.underReview} tone="amber" />
        <SummaryCard icon={ShieldCheck} label="بانتظار التوجيه" value={summary.awaitingProvider} tone="violet" />
        <SummaryCard icon={TriangleAlert} label="قيد التنفيذ" value={summary.inExecution} tone="emerald" />
      </div>

      <DataTable
        columns={columns}
        emptyDescription="ستظهر هنا الطلبات الواردة للإدارة عند توفرها أو بعد تعديل الفلاتر."
        emptyTitle="لا توجد طلبات مطابقة"
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>{row.customer?.full_name || 'غير متاح'}</p>
              <p>{row.service?.name_ar || 'غير محددة'}</p>
              <p className="text-slate-500">{row.assigned_provider?.full_name || 'غير معين'}</p>
            </div>
            <Link className="btn-secondary w-full" to={`/admin/orders/${row.id}`}>
              فتح الطلب
            </Link>
          </div>
        )}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
        toolbar={
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="field pr-9 text-sm"
                onChange={handleSearch}
                placeholder="ابحث برقم الطلب أو اسم العميل أو الخدمة أو المزوّد"
                value={search}
              />
            </div>
            <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-500">
              {total} طلب {search.trim() ? 'مطابق للبحث' : 'في القائمة'}
            </div>
          </div>
        }
      />
    </div>
  )
}

export default OrdersManagementPage
