import { LineChart } from 'lucide-react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function EmployeeReportsPage() {
  const { data, loading, error } = useAsyncData(() => api.getEmployeeReports(), [], null)

  const totals = data?.totals || {}
  const completedRows = (data?.completed_orders_by_day || []).map((row, index) => ({
    id: row.day || index,
    ...row,
  }))

  return (
    <div className="page-section">
      <PageHeader
        description="يعرض هذا التقرير حجم المراجعات، الطلبات المتأخرة، طلبات النواقص، والإغلاقات التي تمت ضمن الفترة الحالية."
        eyebrow="تقارير الموظف"
        icon={LineChart}
        title="تقرير المراجعة"
      />

      {error ? (
        <div className="glass-panel p-6 text-sm text-danger">{error.message}</div>
      ) : (
        <>
          <div className="card-grid">
            <StatCard title="طلبات تمت مراجعتها" value={totals.orders_reviewed || 0} />
            <StatCard title="طلبات قيد المتابعة" value={totals.pending_reviews || 0} />
            <StatCard title="مراجعات متأخرة" tone="warning" value={totals.delayed_reviews || 0} />
            <StatCard title="طلبات مستندات ناقصة" value={totals.missing_document_requests || 0} />
            <StatCard title="إعادات إلى المزود" value={totals.provider_returns || 0} />
            <StatCard title="طلبات مكتملة" tone="success" value={totals.completed_orders || 0} />
          </div>

          <DataTable
            columns={[
              { key: 'day', label: 'اليوم', render: (row) => formatDate(row.day) },
              { key: 'total', label: 'الطلبات المكتملة' },
            ]}
            emptyDescription="ستظهر هنا الأيام التي أُغلقت فيها الطلبات بواسطة الموظف."
            emptyTitle="لا توجد بيانات إغلاق للفترة الحالية"
            loading={loading}
            rows={completedRows}
          />
        </>
      )}
    </div>
  )
}

export default EmployeeReportsPage
