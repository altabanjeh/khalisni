import { BriefcaseBusiness, CircleAlert, Clock3, FileCheck2, LineChart } from 'lucide-react'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function QueuePreview({ rows = [], title, emptyText }) {
  const columns = [
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'service', label: 'الخدمة', render: (row) => row.service?.name_ar },
    { key: 'customer', label: 'العميل', render: (row) => row.customer?.full_name },
    { key: 'status', label: 'الحالة', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'expected_delivery_date', label: 'الموعد', render: (row) => formatDate(row.expected_delivery_date) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <Link className="btn-secondary px-4 py-2 text-xs" to={`/employee/orders/${row.id}`}>
          فتح الطلب
        </Link>
      ),
    },
  ]

  return (
    <section className="glass-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">{title}</h2>
        <Link className="text-sm font-semibold text-brand-700" to="/employee/orders">
          فتح القائمة الكاملة
        </Link>
      </div>
      <DataTable
        columns={columns}
        emptyDescription={emptyText}
        emptyTitle="لا توجد عناصر حالياً"
        rows={rows}
      />
    </section>
  )
}

function EmployeeDashboardHome() {
  const { data, loading, error } = useAsyncData(() => api.getEmployeeDashboard(), [], null)

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{error.message}</div>
  }

  if (loading || !data) {
    return <LoadingSpinner />
  }

  const summary = data.summary || {}
  const queues = data.queues || {}

  return (
    <div className="page-section">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-3">
            <Link className="btn-primary" to="/employee/orders">
              فتح قائمة المراجعة
            </Link>
            <Link className="btn-secondary" to="/employee/reports">
              <LineChart className="h-4 w-4" />
              تقارير الموظف
            </Link>
          </div>
        }
        description="يعرض هذا الملخص الطلبات التي تحتاج مراجعة، الطلبات المعادة من العميل أو المزود، والمهام القريبة من موعد التسليم."
        eyebrow="بوابة الموظف"
        icon={BriefcaseBusiness}
        title="لوحة عمل الموظف"
      />

      <div className="card-grid">
        <StatCard icon={BriefcaseBusiness} title="بانتظار المراجعة" tone="primary" value={summary.waiting_review || 0} />
        <StatCard icon={CircleAlert} title="عاد العميل بالمستندات" tone="warning" value={summary.missing_documents_returned || 0} />
        <StatCard icon={FileCheck2} title="بانتظار التحقق الداخلي" tone="success" value={summary.waiting_internal_verification || 0} />
        <StatCard icon={FileCheck2} title="عاد من المزود" tone="primary" value={summary.returned_from_provider || 0} />
        <StatCard icon={Clock3} title="قريب من الموعد" tone="warning" value={summary.near_deadline || 0} />
        <StatCard icon={Clock3} title="متأخر" tone="danger" value={summary.delayed || 0} />
        <StatCard icon={BriefcaseBusiness} title="حمولة عملي الحالية" tone="primary" value={summary.assigned_workload || 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <QueuePreview rows={queues.waiting_review || []} title="طلبات بانتظار المراجعة" emptyText="ستظهر هنا الطلبات الجديدة أو قيد المراجعة." />
        <QueuePreview rows={queues.missing_documents_returned || []} title="مستندات عاد بها العميل" emptyText="ستظهر هنا الطلبات التي أكمل العميل نواقصها." />
        <QueuePreview rows={queues.waiting_internal_verification || []} title="بانتظار التحقق الداخلي" emptyText="ستظهر هنا النتائج النهائية التي تحتاج مراجعة داخلية." />
        <QueuePreview rows={queues.returned_from_provider || []} title="نتائج مقدمة من المزود" emptyText="ستظهر هنا الطلبات التي رفع المزود نتيجتها النهائية." />
      </div>
    </div>
  )
}

export default EmployeeDashboardHome
