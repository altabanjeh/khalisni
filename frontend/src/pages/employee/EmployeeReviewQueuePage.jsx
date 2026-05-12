import { ClipboardCheck, Search } from 'lucide-react'
import { useState } from 'react'
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
  ['READY_FOR_DELIVERY', 'بانتظار التحقق الداخلي'],
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

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل قائمة المراجعة...</div>
  }

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{error.message}</div>
  }

  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'customer', label: 'العميل', render: (row) => row.customer?.full_name },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'priority', label: 'الأولوية' },
    {
      key: 'missing_document_types',
      label: 'النواقص',
      render: (row) => (row.missing_document_types?.length ? row.missing_document_types.join(', ') : 'لا يوجد'),
    },
    { key: 'created_at', label: 'تاريخ الإنشاء', render: (row) => formatDate(row.created_at) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/orders/${row.id}`}>
          مراجعة
        </Link>
      ),
    },
  ]

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="page-section">
      <PageHeader
        description="استخدم الفلاتر لتحديد الطلبات حسب الحالة، الخدمة، التاريخ، الأولوية، حالة المزود، أو الطلبات التي ما زالت تحتوي على نواقص."
        eyebrow="قائمة العمل"
        icon={ClipboardCheck}
        title="طلبات المراجعة"
      />

      <DataTable
        columns={columns}
        emptyDescription="لا توجد طلبات مطابقة للفلاتر الحالية."
        emptyTitle="القائمة فارغة"
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm text-slate-600">{row.customer?.full_name}</p>
            <p className="text-sm text-slate-500">{row.service?.name_ar}</p>
            <Link className="btn-secondary w-full" to={`/employee/orders/${row.id}`}>
              مراجعة
            </Link>
          </div>
        )}
        rows={orders}
        toolbar={
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-xs font-semibold text-slate-500">بحث</span>
              <div className="flex items-center gap-3">
                <span className="icon-chip h-10 w-10 rounded-xl">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  className="field"
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
              <span className="text-xs font-semibold text-slate-500">حالة المزود</span>
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
        }
      />
    </div>
  )
}

export default EmployeeReviewQueuePage
