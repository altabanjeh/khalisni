import { BriefcaseBusiness, CircleAlert, Clock3, FileCheck2, LineChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'

function QueuePreview({ rows = [], title, emptyText }) {
  const { language, isArabic } = useLanguage()
  const columns = [
    { key: 'order_number', label: isArabic ? 'رقم الطلب' : 'Request', render: (row) => <span className="font-bold text-ink">#{row.order_number}</span> },
    { key: 'service', label: isArabic ? 'الخدمة' : 'Service', render: (row) => (row.service ? getServiceName(row.service, language) : '—') },
    { key: 'customer', label: isArabic ? 'العميل' : 'Customer', render: (row) => row.customer?.full_name || '—' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: isArabic ? 'الموعد' : 'Due', render: (row) => formatDate(row.expected_delivery_date, language) },
    {
      key: 'action',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/orders/${row.id}`}>
          {isArabic ? 'فتح الطلب' : 'Open request'}
        </Link>
      ),
    },
  ]

  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-ink sm:text-lg">{title}</h2>
        <Link className="text-sm font-extrabold text-brand-600 hover:text-brand-700" to="/employee/orders">
          {isArabic ? 'القائمة الكاملة' : 'Full queue'}
        </Link>
      </div>
      <DataTable columns={columns} emptyDescription={emptyText} emptyTitle={isArabic ? 'لا توجد عناصر حالياً' : 'Nothing here right now'} rows={rows} />
    </section>
  )
}

function EmployeeDashboardHome() {
  const { isArabic } = useLanguage()
  const { data, loading, error } = useAsyncData(() => api.getEmployeeDashboard(), [], null)

  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{error.message}</div>
  if (loading || !data) return <LoadingSpinner />

  const summary = data.summary || {}
  const queues = data.queues || {}

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Link className="btn-primary" to="/employee/orders">{isArabic ? 'قائمة المراجعة' : 'Review queue'}</Link>
            <Link className="btn-secondary" to="/employee/reports">
              <LineChart className="h-4 w-4" />
              {isArabic ? 'تقارير الموظف' : 'Employee reports'}
            </Link>
          </div>
        }
        description={isArabic
          ? 'الطلبات التي تحتاج مراجعة، ما عاد به العميل أو المزوّد، والمهام القريبة من موعد التسليم.'
          : 'Requests that need review, what customers or providers returned, and tasks near their deadline.'}
        eyebrow={isArabic ? 'بوابة الموظف' : 'Employee portal'}
        icon={BriefcaseBusiness}
        title={isArabic ? 'لوحة عمل الموظف' : 'Employee workspace'}
      />

      <div className="card-grid">
        <StatCard icon={BriefcaseBusiness} title={isArabic ? 'بانتظار المراجعة' : 'Waiting for review'} tone="primary" value={summary.waiting_review || 0} />
        <StatCard icon={CircleAlert} title={isArabic ? 'عاد العميل بالمستندات' : 'Customer returned docs'} tone="warning" value={summary.missing_documents_returned || 0} />
        <StatCard icon={FileCheck2} title={isArabic ? 'بانتظار التحقق الداخلي' : 'Waiting internal verification'} tone="success" value={summary.waiting_internal_verification || 0} />
        <StatCard icon={FileCheck2} title={isArabic ? 'عاد من المزوّد' : 'Returned from provider'} tone="primary" value={summary.returned_from_provider || 0} />
        <StatCard icon={Clock3} title={isArabic ? 'قريب من الموعد' : 'Near deadline'} tone="warning" value={summary.near_deadline || 0} />
        <StatCard icon={Clock3} title={isArabic ? 'متأخر' : 'Delayed'} tone="danger" value={summary.delayed || 0} />
        <StatCard icon={BriefcaseBusiness} title={isArabic ? 'حمولة عملي' : 'My workload'} tone="primary" value={summary.assigned_workload || 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <QueuePreview rows={queues.waiting_review || []} title={isArabic ? 'بانتظار المراجعة' : 'Waiting for review'} emptyText={isArabic ? 'ستظهر هنا الطلبات الجديدة أو قيد المراجعة.' : 'New or in-review requests will appear here.'} />
        <QueuePreview rows={queues.missing_documents_returned || []} title={isArabic ? 'مستندات عاد بها العميل' : 'Documents returned by customer'} emptyText={isArabic ? 'ستظهر هنا الطلبات التي أكمل العميل نواقصها.' : 'Requests where the customer completed missing items will appear here.'} />
        <QueuePreview rows={queues.waiting_internal_verification || []} title={isArabic ? 'بانتظار التحقق الداخلي' : 'Waiting internal verification'} emptyText={isArabic ? 'ستظهر هنا النتائج النهائية التي تحتاج مراجعة داخلية.' : 'Final results that need internal review will appear here.'} />
        <QueuePreview rows={queues.returned_from_provider || []} title={isArabic ? 'نتائج مقدّمة من المزوّد' : 'Results submitted by provider'} emptyText={isArabic ? 'ستظهر هنا الطلبات التي رفع المزوّد نتيجتها النهائية.' : 'Requests where the provider uploaded their final result will appear here.'} />
      </div>
    </div>
  )
}

export default EmployeeDashboardHome
