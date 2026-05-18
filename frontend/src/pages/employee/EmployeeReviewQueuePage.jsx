import { ClipboardCheck, Search, ShieldCheck, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

const statusOptions = [
  ['', 'كل الحالات'],
  ['NEW', 'جديد'],
  ['UNDER_REVIEW', 'قيد المراجعة'],
  ['WAITING_CUSTOMER', 'بانتظار العميل'],
  ['READY_FOR_DELIVERY', 'جاهز للتسليم'],
  ['WAITING_GOVERNMENT', 'بانتظار جهة خارجية'],
]

const providerStatusOptions = [
  ['', 'كل حالات التنفيذ'],
  ['ASSIGNED', 'تم التعيين'],
  ['IN_PROGRESS', 'قيد التنفيذ'],
  ['WAITING_GOVERNMENT', 'بانتظار جهة خارجية'],
  ['READY_FOR_DELIVERY', 'نتيجة بانتظار المراجعة'],
]

const priorityOptions = [
  ['', 'كل الأولويات'],
  ['LOW', 'منخفضة'],
  ['NORMAL', 'عادية'],
  ['HIGH', 'عالية'],
  ['URGENT', 'عاجلة'],
]

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

function EmployeeReviewQueuePage() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    service: '',
    date_from: '',
    date_to: '',
    priority: '',
    has_missing_documents: '',
    provider_status: '',
    assigned_employee: '',
  })
  const { data: orders = [], loading, error } = useAsyncData(() => api.getEmployeeOrders(filters), [filters], [])
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])

  const summary = useMemo(
    () => ({
      total: orders.length,
      underReview: orders.filter((order) => order.status === 'UNDER_REVIEW').length,
      missingDocuments: orders.filter((order) => order.missing_document_types?.length).length,
      urgent: orders.filter((order) => order.priority === 'URGENT').length,
    }),
    [orders],
  )

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل', render: (row) => row.customer?.full_name || 'غير متاح' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar || 'غير محددة' },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'priority', label: 'الأولوية', render: (row) => row.priority || 'عادية' },
    {
      key: 'missing_document_types',
      label: 'النواقص',
      render: (row) => (row.missing_document_types?.length ? row.missing_document_types.join('، ') : 'لا يوجد'),
    },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/orders/${row.id}`}>
          مراجعة الطلب
        </Link>
      ),
    },
  ]

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function resetFilters() {
    setFilters({
      search: '',
      status: '',
      service: '',
      date_from: '',
      date_to: '',
      priority: '',
      has_missing_documents: '',
      provider_status: '',
      assigned_employee: '',
    })
  }

  return (
    <div className="page-section">
      <PageHeader
        description="قائمة مراجعة موحدة تساعدك على فرز الطلبات الحالية حسب الحالة، الأولوية، النواقص، وحالة التنفيذ قبل فتح كل طلب."
        eyebrow="قائمة العمل"
        icon={ClipboardCheck}
        title="طلبات المراجعة"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardCheck} label="إجمالي الطلبات" value={summary.total} />
        <SummaryCard icon={Search} label="قيد المراجعة" value={summary.underReview} tone="amber" />
        <SummaryCard icon={ShieldCheck} label="تحتوي على نواقص" value={summary.missingDocuments} tone="violet" />
        <SummaryCard icon={TriangleAlert} label="عالية العجلة" value={summary.urgent} tone="emerald" />
      </div>

      <DataTable
        columns={columns}
        emptyDescription={error ? error.message : 'لا توجد طلبات مطابقة للفلاتر الحالية.'}
        emptyTitle="القائمة فارغة"
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
              <p className="text-slate-500">{row.missing_document_types?.length ? row.missing_document_types.join('، ') : 'لا توجد نواقص'}</p>
            </div>
            <Link className="btn-secondary w-full" to={`/employee/orders/${row.id}`}>
              مراجعة الطلب
            </Link>
          </div>
        )}
        rows={orders}
        toolbar={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="icon-chip h-10 w-10 rounded-xl">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">فلاتر المراجعة</p>
                  <p className="text-xs text-slate-500">خصص العرض بحسب النوع والحالة والأولوية والمسؤولية.</p>
                </div>
              </div>
              <button className="btn-secondary px-4 py-2 text-xs" onClick={resetFilters} type="button">
                إعادة ضبط الفلاتر
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">بحث</span>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="field pr-9"
                    onChange={(event) => updateFilter('search', event.target.value)}
                    placeholder="رقم الطلب أو اسم العميل"
                    value={filters.search}
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">الحالة</span>
                <select className="field" onChange={(event) => updateFilter('status', event.target.value)} value={filters.status}>
                  {statusOptions.map(([value, label]) => (
                    <option key={value || 'all'} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">الخدمة</span>
                <select className="field" onChange={(event) => updateFilter('service', event.target.value)} value={filters.service}>
                  <option value="">كل الخدمات</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name_ar}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">الأولوية</span>
                <select className="field" onChange={(event) => updateFilter('priority', event.target.value)} value={filters.priority}>
                  {priorityOptions.map(([value, label]) => (
                    <option key={value || 'all'} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">من تاريخ</span>
                <input className="field" onChange={(event) => updateFilter('date_from', event.target.value)} type="date" value={filters.date_from} />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">إلى تاريخ</span>
                <input className="field" onChange={(event) => updateFilter('date_to', event.target.value)} type="date" value={filters.date_to} />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">حالة التنفيذ</span>
                <select className="field" onChange={(event) => updateFilter('provider_status', event.target.value)} value={filters.provider_status}>
                  {providerStatusOptions.map(([value, label]) => (
                    <option key={value || 'all'} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">ملكية الطلب</span>
                <select className="field" onChange={(event) => updateFilter('assigned_employee', event.target.value)} value={filters.assigned_employee}>
                  <option value="">الكل</option>
                  <option value="me">مسندة إليّ</option>
                  <option value="unassigned">غير مسندة</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold text-slate-500">النواقص</span>
                <select className="field" onChange={(event) => updateFilter('has_missing_documents', event.target.value)} value={filters.has_missing_documents}>
                  <option value="">الكل</option>
                  <option value="true">يوجد نواقص</option>
                  <option value="false">بدون نواقص</option>
                </select>
              </label>
            </div>
          </div>
        }
      />
    </div>
  )
}

export default EmployeeReviewQueuePage
