import { ClipboardList, FolderCheck, Search, TimerReset } from 'lucide-react'
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

const ACTIVE = ['ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT', 'WAITING_PROVIDER']

function AssignedOrdersPage() {
  const { language, isArabic } = useLanguage()
  const { data: orders = [], loading } = useAsyncData(() => api.getProviderOrders(), [], [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => (Array.isArray(orders) ? orders : []), [orders])
  const counts = useMemo(() => ({
    all: list.length,
    active: list.filter((o) => ACTIVE.includes(String(o.status).toUpperCase())).length,
    ready: list.filter((o) => String(o.status).toUpperCase() === 'READY_FOR_DELIVERY').length,
    done: list.filter((o) => String(o.status).toUpperCase() === 'COMPLETED').length,
  }), [list])

  const filters = [
    { key: 'all', label: isArabic ? 'الكل' : 'All' },
    { key: 'active', label: isArabic ? 'قيد التنفيذ' : 'Active' },
    { key: 'ready', label: isArabic ? 'جاهزة للتسليم' : 'Ready' },
    { key: 'done', label: isArabic ? 'مكتملة' : 'Completed' },
  ]

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list
      .filter((order) => {
        const s = String(order.status).toUpperCase()
        if (filter === 'active') return ACTIVE.includes(s)
        if (filter === 'ready') return s === 'READY_FOR_DELIVERY'
        if (filter === 'done') return s === 'COMPLETED'
        return true
      })
      .filter((order) => !q || [order.order_number, order.service?.name_ar, order.service?.name_en, order.city].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
  }, [list, query, filter])

  const columns = [
    { key: 'order_number', label: isArabic ? 'رقم الطلب' : 'Request', render: (row) => <span className="font-bold text-ink">#{row.order_number}</span> },
    { key: 'service', label: isArabic ? 'الخدمة' : 'Service', render: (row) => (row.service ? getServiceName(row.service, language) : (isArabic ? 'غير محددة' : 'Not set')) },
    { key: 'city', label: isArabic ? 'مدينة العميل' : 'Customer city', render: (row) => row.city || (isArabic ? 'غير محددة' : 'Not set') },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: isArabic ? 'التسليم المتوقع' : 'Expected delivery', render: (row) => formatDate(row.expected_delivery_date, language) },
    {
      key: 'action',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/provider/orders/${row.id}`}>
          {isArabic ? 'فتح الطلب' : 'Open request'}
        </Link>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic ? 'قائمة العمل الخاصة بك: الطلبات المسندة إليك مع بحث وتصفية سريعة.' : 'Your work queue: requests assigned to you with quick search and filters.'}
        eyebrow={isArabic ? 'المزوّد' : 'Provider'}
        icon={ClipboardList}
        title={isArabic ? 'الطلبات المعيّنة' : 'Assigned requests'}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: ClipboardList, label: isArabic ? 'كل الطلبات' : 'All requests', value: counts.all },
          { icon: TimerReset, label: isArabic ? 'قيد التنفيذ' : 'Active', value: counts.active },
          { icon: FolderCheck, label: isArabic ? 'جاهزة للتسليم' : 'Ready for delivery', value: counts.ready },
          { icon: ClipboardList, label: isArabic ? 'مكتملة' : 'Completed', value: counts.done },
        ].map(({ icon: Icon, label, value }) => (
          <div className="glass-panel p-4" key={label}>
            <div className="flex items-center gap-3">
              <span className="icon-chip h-10 w-10"><Icon className="h-5 w-5" /></span>
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
        emptyDescription={isArabic ? 'ستظهر هنا الطلبات المسندة إليك، أو بعد تعديل البحث والتصفية.' : 'Assigned requests will appear here, or after adjusting the search and filters.'}
        emptyTitle={isArabic ? 'لا توجد طلبات مطابقة' : 'No matching requests'}
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">#{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.service ? getServiceName(row.service, language) : (isArabic ? 'غير محددة' : 'Not set')}</p>
            <p className="text-sm text-slate-500">{formatDate(row.expected_delivery_date, language)}</p>
            <Link className="btn-secondary w-full" to={`/provider/orders/${row.id}`}>{isArabic ? 'فتح الطلب' : 'Open request'}</Link>
          </div>
        )}
        rows={filtered}
        toolbar={
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label={isArabic ? 'بحث في الطلبات' : 'Search requests'}
                className="field ps-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder={isArabic ? 'ابحث برقم الطلب أو الخدمة أو المدينة' : 'Search by request number, service or city'}
                value={query}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  aria-pressed={filter === item.key}
                  className={`kh-focusable inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${filter === item.key ? 'border-transparent bg-brand-600 text-white' : 'border-border bg-card text-slate-600 hover:bg-brand-50'}`}
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  type="button"
                >
                  {item.label}
                  <span className={filter === item.key ? 'text-white/80' : 'text-slate-400'}>{counts[item.key] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />
    </div>
  )
}

export default AssignedOrdersPage
