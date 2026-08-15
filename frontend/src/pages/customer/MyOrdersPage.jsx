import { ClipboardList, Search, ShieldCheck, TimerReset, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

const PAGE_SIZE = 15

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="icon-chip"><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
        </div>
      </div>
    </div>
  )
}

function getResponsibility(order) {
  const status = String(order.status || '').toUpperCase()
  if (status === 'WAITING_CUSTOMER' || order.missing_document_types?.length) {
    return { label: 'إجراء مطلوب منك', className: 'bg-amber-50 text-amber-800 border-amber-200' }
  }
  if (['COMPLETED', 'DELIVERED', 'CLOSED'].includes(status)) {
    return { label: 'مكتمل', className: 'bg-green-50 text-green-700 border-green-200' }
  }
  return { label: 'خلصني تتابع الطلب', className: 'bg-brand-50 text-brand-700 border-brand-100' }
}

function MyOrdersPage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const { data: orders = [], loading } = useAsyncData(() => api.getCustomerOrders(), [], [])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (!normalizedQuery) return true
      return `${order.order_number} ${order.service?.name_ar || ''}`.toLowerCase().includes(normalizedQuery)
    })
  }, [orders, query])

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const summary = useMemo(
    () => ({
      total: orders.length,
      active: orders.filter((order) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)).length,
      pendingDocs: orders.filter((order) => order.status === 'WAITING_CUSTOMER').length,
      completed: orders.filter((order) => order.status === 'COMPLETED').length,
    }),
    [orders],
  )

  function handleSearch(event) {
    setQuery(event.target.value)
    setPage(1)
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar || 'غير محددة' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'responsibility',
      label: 'المسؤول الآن',
      render: (row) => {
        const responsibility = getResponsibility(row)
        return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${responsibility.className}`}>{responsibility.label}</span>
      },
    },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    { key: 'expected_delivery_date', label: 'التسليم المتوقع', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/customer/orders/${row.id}`}>
          فتح مساحة الطلب
        </Link>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="قائمة أوضح لكل طلباتك مع بحث سريع، حالة مرئية، وبطاقات مريحة على الهاتف."
        eyebrow="العميل"
        icon={ClipboardList}
        title="طلباتي"
        actions={<Link className="btn-primary" to="/customer/orders/new">طلب جديد</Link>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardList} label="كل الطلبات" value={summary.total} />
        <SummaryCard icon={TimerReset} label="طلبات نشطة" value={summary.active} />
        <SummaryCard icon={ShieldCheck} label="بانتظار مستندات" value={summary.pendingDocs} />
        <SummaryCard icon={Wallet} label="طلبات مكتملة" value={summary.completed} />
      </div>

      <section className="rounded-[2rem] border border-border bg-white p-5 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field pr-9"
              onChange={handleSearch}
              placeholder="ابحث برقم الطلب أو اسم الخدمة"
              value={query}
            />
          </div>
          <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
            {total} طلب {query.trim() ? 'مطابق للبحث' : 'في السجل'}
          </div>
        </div>
      </section>

      <DataTable
        columns={columns}
        emptyDescription="يمكنك إنشاء طلب جديد من شاشة الخدمات أو تعديل البحث الحالي."
        emptyTitle="لا توجد طلبات مطابقة"
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service?.name_ar || 'غير محددة'}</p>
            <div className="grid gap-2 text-sm text-slate-500">
              <span>تاريخ الطلب: {formatDate(row.created_at)}</span>
              <span>التسليم المتوقع: {formatDate(row.expected_delivery_date)}</span>
            </div>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold ${getResponsibility(row).className}`}>
              {getResponsibility(row).label}
            </span>
            <Link className="btn-primary w-full" to={`/customer/orders/${row.id}`}>
              فتح مساحة الطلب
            </Link>
          </div>
        )}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
      />
    </div>
  )
}

export default MyOrdersPage
