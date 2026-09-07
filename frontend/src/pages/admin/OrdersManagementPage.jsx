import { ClipboardCheck, FolderKanban, Search, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'

const PAGE_SIZE = 20
const ACTION_NEEDED = ['UNDER_REVIEW', 'WAITING_CUSTOMER', 'NEW']
const IN_EXECUTION = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT', 'WAITING_PROVIDER']

function OrdersManagementPage() {
  const { language, isArabic } = useLanguage()
  const { data: orders = [], loading } = useAsyncData(() => api.getAdminOrders(), [], [])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  const list = useMemo(() => (Array.isArray(orders) ? orders : []), [orders])
  const notSet = isArabic ? 'غير محددة' : 'Not set'
  const unavailable = isArabic ? 'غير متاح' : 'Unavailable'
  const unassigned = isArabic ? 'غير معيّن' : 'Unassigned'

  const filters = [
    { key: 'all', label: isArabic ? 'الكل' : 'All' },
    { key: 'action', label: isArabic ? 'يحتاج إجراء' : 'Action needed' },
    { key: 'execution', label: isArabic ? 'قيد التنفيذ' : 'In execution' },
    { key: 'completed', label: isArabic ? 'مكتملة' : 'Completed' },
  ]

  const counts = useMemo(() => ({
    all: list.length,
    action: list.filter((o) => ACTION_NEEDED.includes(String(o.status).toUpperCase())).length,
    execution: list.filter((o) => IN_EXECUTION.includes(String(o.status).toUpperCase())).length,
    completed: list.filter((o) => ['COMPLETED', 'DELIVERED', 'CLOSED'].includes(String(o.status).toUpperCase())).length,
  }), [list])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return list
      .filter((order) => {
        const s = String(order.status).toUpperCase()
        if (statusFilter === 'action') return ACTION_NEEDED.includes(s)
        if (statusFilter === 'execution') return IN_EXECUTION.includes(s)
        if (statusFilter === 'completed') return ['COMPLETED', 'DELIVERED', 'CLOSED'].includes(s)
        return true
      })
      .filter((order) => {
        if (!q) return true
        return [order.order_number, order.customer?.full_name, order.service?.name_ar, order.service?.name_en, order.assigned_provider?.full_name, order.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      })
  }, [list, search, statusFilter])

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    { key: 'order_number', label: isArabic ? 'رقم الطلب' : 'Request', render: (row) => <span className="font-bold text-ink">#{row.order_number}</span> },
    { key: 'customer', label: isArabic ? 'العميل' : 'Customer', render: (row) => row.customer?.full_name || unavailable },
    { key: 'service', label: isArabic ? 'الخدمة' : 'Service', render: (row) => (row.service ? getServiceName(row.service, language) : notSet) },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'assigned_provider', label: isArabic ? 'المزوّد' : 'Provider', render: (row) => row.assigned_provider?.full_name || unassigned },
    { key: 'created_at', label: isArabic ? 'تاريخ الإنشاء' : 'Created', render: (row) => formatDate(row.created_at, language) },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/admin/orders/${row.id}`}>
          {isArabic ? 'فتح الطلب' : 'Open request'}
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'قائمة تشغيل موحّدة لمتابعة الطلبات، الوصول السريع للتفاصيل، ومعرفة ما يحتاج إجراءً.'
          : 'A unified operations queue to follow requests, jump to detail, and see what needs action.'}
        eyebrow={isArabic ? 'العمليات' : 'Operations'}
        icon={FolderKanban}
        title={isArabic ? 'الطلبات' : 'Requests'}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: ClipboardCheck, label: isArabic ? 'إجمالي الطلبات' : 'Total requests', value: counts.all },
          { icon: Search, label: isArabic ? 'يحتاج إجراء' : 'Action needed', value: counts.action, warn: true },
          { icon: ShieldCheck, label: isArabic ? 'قيد التنفيذ' : 'In execution', value: counts.execution },
          { icon: TriangleAlert, label: isArabic ? 'مكتملة' : 'Completed', value: counts.completed },
        ].map(({ icon: Icon, label, value, warn }) => (
          <div className={`glass-panel p-4 ${warn && value ? 'ring-1 ring-amber-200' : ''}`} key={label}>
            <div className="flex items-center gap-3">
              <span className={`icon-chip h-10 w-10 ${warn && value ? 'bg-amber-50 text-amber-700' : ''}`}><Icon className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-0.5 text-2xl font-black text-ink">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        emptyDescription={isArabic ? 'ستظهر هنا الطلبات عند توفرها أو بعد تعديل البحث والتصفية.' : 'Requests will appear here, or after adjusting the search and filters.'}
        emptyTitle={isArabic ? 'لا توجد طلبات مطابقة' : 'No matching requests'}
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">#{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>{row.customer?.full_name || unavailable}</p>
              <p>{row.service ? getServiceName(row.service, language) : notSet}</p>
              <p className="text-slate-500">{row.assigned_provider?.full_name || unassigned}</p>
            </div>
            <Link className="btn-secondary w-full" to={`/admin/orders/${row.id}`}>{isArabic ? 'فتح الطلب' : 'Open request'}</Link>
          </div>
        )}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
        toolbar={
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={isArabic ? 'بحث في الطلبات' : 'Search requests'}
                className="field ps-9 text-sm"
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                placeholder={isArabic ? 'ابحث برقم الطلب أو العميل أو الخدمة أو المزوّد' : 'Search by request number, customer, service or provider'}
                value={search}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  aria-pressed={statusFilter === item.key}
                  className={`kh-focusable inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${statusFilter === item.key ? 'border-transparent bg-brand-600 text-white' : 'border-border bg-card text-slate-600 hover:bg-brand-50'}`}
                  key={item.key}
                  onClick={() => { setStatusFilter(item.key); setPage(1) }}
                  type="button"
                >
                  {item.label}
                  <span className={statusFilter === item.key ? 'text-white/80' : 'text-slate-400'}>{counts[item.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />
    </div>
  )
}

export default OrdersManagementPage
