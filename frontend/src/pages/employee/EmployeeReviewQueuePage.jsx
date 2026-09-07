import { ClipboardCheck, Search, ShieldCheck, SlidersHorizontal, TriangleAlert } from 'lucide-react'
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

const EMPTY_FILTERS = {
  search: '', status: '', service: '', date_from: '', date_to: '',
  priority: '', has_missing_documents: '', provider_status: '', assigned_employee: '',
}

function SummaryCard({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = { brand: 'bg-brand-50 text-brand-700', amber: 'bg-amber-50 text-amber-700', emerald: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700' }
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-3">
        <span className={`icon-chip h-10 w-10 ${tones[tone] || tones.brand}`}><Icon className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-0.5 text-2xl font-black text-ink">{value}</p>
        </div>
      </div>
    </div>
  )
}

function EmployeeReviewQueuePage() {
  const { language, isArabic } = useLanguage()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const { data: orders = [], loading, error } = useAsyncData(() => api.getEmployeeOrders(filters), [filters], [])
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])

  const statusOptions = [
    ['', isArabic ? 'كل الحالات' : 'All statuses'],
    ['NEW', isArabic ? 'جديد' : 'New'],
    ['UNDER_REVIEW', isArabic ? 'قيد المراجعة' : 'Under review'],
    ['WAITING_CUSTOMER', isArabic ? 'بانتظار العميل' : 'Waiting for customer'],
    ['READY_FOR_DELIVERY', isArabic ? 'جاهز للتسليم' : 'Ready for delivery'],
    ['WAITING_GOVERNMENT', isArabic ? 'بانتظار جهة خارجية' : 'Waiting for external body'],
  ]
  const providerStatusOptions = [
    ['', isArabic ? 'كل حالات التنفيذ' : 'All execution states'],
    ['ASSIGNED', isArabic ? 'تم التعيين' : 'Assigned'],
    ['IN_PROGRESS', isArabic ? 'قيد التنفيذ' : 'In progress'],
    ['WAITING_GOVERNMENT', isArabic ? 'بانتظار جهة خارجية' : 'Waiting for external body'],
    ['READY_FOR_DELIVERY', isArabic ? 'نتيجة بانتظار المراجعة' : 'Result awaiting review'],
  ]
  const priorityOptions = [
    ['', isArabic ? 'كل الأولويات' : 'All priorities'],
    ['LOW', isArabic ? 'منخفضة' : 'Low'],
    ['NORMAL', isArabic ? 'عادية' : 'Normal'],
    ['HIGH', isArabic ? 'عالية' : 'High'],
    ['URGENT', isArabic ? 'عاجلة' : 'Urgent'],
  ]
  const notSet = isArabic ? 'غير محددة' : 'Not set'
  const none = isArabic ? 'لا يوجد' : 'None'

  const summary = useMemo(() => {
    const list = Array.isArray(orders) ? orders : []
    return {
      total: list.length,
      underReview: list.filter((o) => o.status === 'UNDER_REVIEW').length,
      missingDocuments: list.filter((o) => o.missing_document_types?.length).length,
      urgent: list.filter((o) => o.priority === 'URGENT').length,
    }
  }, [orders])

  const columns = [
    { key: 'order_number', label: isArabic ? 'رقم الطلب' : 'Request', render: (row) => <span className="font-bold text-ink">#{row.order_number}</span> },
    { key: 'customer', label: isArabic ? 'العميل' : 'Customer', render: (row) => row.customer?.full_name || (isArabic ? 'غير متاح' : 'Unavailable') },
    { key: 'service', label: isArabic ? 'الخدمة' : 'Service', render: (row) => (row.service ? getServiceName(row.service, language) : notSet) },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'priority', label: isArabic ? 'الأولوية' : 'Priority', render: (row) => row.priority || (isArabic ? 'عادية' : 'Normal') },
    { key: 'missing_document_types', label: isArabic ? 'النواقص' : 'Missing', render: (row) => (row.missing_document_types?.length ? row.missing_document_types.join(isArabic ? '، ' : ', ') : none) },
    { key: 'created_at', label: isArabic ? 'تاريخ الإنشاء' : 'Created', render: (row) => formatDate(row.created_at, language) },
    {
      key: 'action',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (row) => <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/orders/${row.id}`}>{isArabic ? 'مراجعة الطلب' : 'Review request'}</Link>,
    },
  ]

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'قائمة مراجعة موحّدة لفرز الطلبات حسب الحالة والأولوية والنواقص وحالة التنفيذ قبل فتح كل طلب.'
          : 'A unified review queue to triage requests by status, priority, missing items and execution state before opening each one.'}
        eyebrow={isArabic ? 'قائمة العمل' : 'Work queue'}
        icon={ClipboardCheck}
        title={isArabic ? 'طلبات المراجعة' : 'Review queue'}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={ClipboardCheck} label={isArabic ? 'إجمالي الطلبات' : 'Total requests'} value={summary.total} />
        <SummaryCard icon={Search} label={isArabic ? 'قيد المراجعة' : 'Under review'} value={summary.underReview} tone="amber" />
        <SummaryCard icon={ShieldCheck} label={isArabic ? 'تحتوي نواقص' : 'Has missing items'} value={summary.missingDocuments} tone="violet" />
        <SummaryCard icon={TriangleAlert} label={isArabic ? 'عاجلة' : 'Urgent'} value={summary.urgent} tone="emerald" />
      </div>

      <DataTable
        columns={columns}
        emptyDescription={error ? error.message : isArabic ? 'لا توجد طلبات مطابقة للفلاتر الحالية.' : 'No requests match the current filters.'}
        emptyTitle={isArabic ? 'القائمة فارغة' : 'The queue is empty'}
        loading={loading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">#{row.order_number}</p>
              <StatusBadge status={row.status} />
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>{row.customer?.full_name || (isArabic ? 'غير متاح' : 'Unavailable')}</p>
              <p>{row.service ? getServiceName(row.service, language) : notSet}</p>
              <p className="text-slate-500">{row.missing_document_types?.length ? row.missing_document_types.join(isArabic ? '، ' : ', ') : (isArabic ? 'لا توجد نواقص' : 'No missing items')}</p>
            </div>
            <Link className="btn-secondary w-full" to={`/employee/orders/${row.id}`}>{isArabic ? 'مراجعة الطلب' : 'Review request'}</Link>
          </div>
        )}
        rows={orders}
        toolbar={
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="icon-chip h-10 w-10 rounded-xl"><SlidersHorizontal className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-black text-ink">{isArabic ? 'فلاتر المراجعة' : 'Queue filters'}</p>
                  <p className="text-xs font-semibold text-slate-500">{isArabic ? 'خصّص العرض حسب الحالة والأولوية والمسؤولية.' : 'Refine by status, priority and ownership.'}</p>
                </div>
              </div>
              <button className="btn-secondary px-4 py-2 text-xs" onClick={() => setFilters(EMPTY_FILTERS)} type="button">
                {isArabic ? 'إعادة ضبط' : 'Reset'}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'بحث' : 'Search'}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input className="field ps-9" onChange={(e) => updateFilter('search', e.target.value)} placeholder={isArabic ? 'رقم الطلب أو اسم العميل' : 'Request number or customer'} value={filters.search} />
                </div>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'الحالة' : 'Status'}</span>
                <select className="field" onChange={(e) => updateFilter('status', e.target.value)} value={filters.status}>
                  {statusOptions.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'الخدمة' : 'Service'}</span>
                <select className="field" onChange={(e) => updateFilter('service', e.target.value)} value={filters.service}>
                  <option value="">{isArabic ? 'كل الخدمات' : 'All services'}</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{getServiceName(s, language)}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'الأولوية' : 'Priority'}</span>
                <select className="field" onChange={(e) => updateFilter('priority', e.target.value)} value={filters.priority}>
                  {priorityOptions.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'من تاريخ' : 'From date'}</span>
                <input aria-label={isArabic ? 'من تاريخ' : 'From date'} className="field" onChange={(e) => updateFilter('date_from', e.target.value)} type="date" value={filters.date_from} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'إلى تاريخ' : 'To date'}</span>
                <input aria-label={isArabic ? 'إلى تاريخ' : 'To date'} className="field" onChange={(e) => updateFilter('date_to', e.target.value)} type="date" value={filters.date_to} />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'حالة التنفيذ' : 'Execution state'}</span>
                <select className="field" onChange={(e) => updateFilter('provider_status', e.target.value)} value={filters.provider_status}>
                  {providerStatusOptions.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'ملكية الطلب' : 'Ownership'}</span>
                <select className="field" onChange={(e) => updateFilter('assigned_employee', e.target.value)} value={filters.assigned_employee}>
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  <option value="me">{isArabic ? 'مسندة إليّ' : 'Assigned to me'}</option>
                  <option value="unassigned">{isArabic ? 'غير مسندة' : 'Unassigned'}</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-slate-500">{isArabic ? 'النواقص' : 'Missing items'}</span>
                <select className="field" onChange={(e) => updateFilter('has_missing_documents', e.target.value)} value={filters.has_missing_documents}>
                  <option value="">{isArabic ? 'الكل' : 'All'}</option>
                  <option value="true">{isArabic ? 'يوجد نواقص' : 'Has missing'}</option>
                  <option value="false">{isArabic ? 'بدون نواقص' : 'None missing'}</option>
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
