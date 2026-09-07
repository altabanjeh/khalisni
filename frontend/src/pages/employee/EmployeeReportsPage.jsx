import { LineChart } from 'lucide-react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'

function EmployeeReportsPage() {
  const { language, isArabic } = useLanguage()
  const { data, loading, error } = useAsyncData(() => api.getEmployeeReports(), [], null)

  const totals = data?.totals || {}
  const completedRows = (data?.completed_orders_by_day || []).map((row, index) => ({ id: row.day || index, ...row }))

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'حجم المراجعات، الطلبات المتأخرة، طلبات النواقص، والإغلاقات خلال الفترة الحالية.'
          : 'Review volume, delayed requests, missing-document requests and closures for the current period.'}
        eyebrow={isArabic ? 'تقارير الموظف' : 'Employee reports'}
        icon={LineChart}
        title={isArabic ? 'تقرير المراجعة' : 'Review report'}
      />

      {error ? (
        <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{error.message}</div>
      ) : (
        <>
          <div className="card-grid">
            <StatCard title={isArabic ? 'طلبات تمت مراجعتها' : 'Requests reviewed'} value={totals.orders_reviewed || 0} />
            <StatCard title={isArabic ? 'طلبات قيد المتابعة' : 'Pending reviews'} value={totals.pending_reviews || 0} />
            <StatCard title={isArabic ? 'مراجعات متأخرة' : 'Delayed reviews'} tone="warning" value={totals.delayed_reviews || 0} />
            <StatCard title={isArabic ? 'طلبات مستندات ناقصة' : 'Missing-document requests'} value={totals.missing_document_requests || 0} />
            <StatCard title={isArabic ? 'إعادات إلى المزوّد' : 'Returns to provider'} value={totals.provider_returns || 0} />
            <StatCard title={isArabic ? 'طلبات مكتملة' : 'Completed requests'} tone="success" value={totals.completed_orders || 0} />
          </div>

          <DataTable
            columns={[
              { key: 'day', label: isArabic ? 'اليوم' : 'Day', render: (row) => formatDate(row.day, language) },
              { key: 'total', label: isArabic ? 'الطلبات المكتملة' : 'Completed requests' },
            ]}
            emptyDescription={isArabic ? 'ستظهر هنا الأيام التي أُغلقت فيها الطلبات بواسطة الموظف.' : 'Days where the employee closed requests will appear here.'}
            emptyTitle={isArabic ? 'لا توجد بيانات إغلاق للفترة الحالية' : 'No closure data for the current period'}
            loading={loading}
            rows={completedRows}
          />
        </>
      )}
    </div>
  )
}

export default EmployeeReportsPage
