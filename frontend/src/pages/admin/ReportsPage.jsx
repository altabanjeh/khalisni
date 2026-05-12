import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'

function ReportsPage() {
  const { data: daily, loading: dailyLoading } = useAsyncData(() => api.getDailyReport(), [], null)
  const { data: weekly, loading: weeklyLoading } = useAsyncData(() => api.getWeeklyReport(), [], null)

  if (dailyLoading || weeklyLoading || !daily || !weekly) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">تقرير اليوم</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{daily.created_orders}</p>
          <p className="mt-2 text-xs text-slate-500">طلبات منشأة في {daily.date}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">مكتمل اليوم</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{daily.completed_orders}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm text-slate-500">ملخص الإيراد</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{formatCurrency(weekly.revenue_summary)}</p>
        </div>
      </section>

      <DataTable
        columns={[
          { key: 'service__name_ar', label: 'الخدمة' },
          { key: 'total', label: 'عدد الطلبات' },
        ]}
        rows={daily.top_services || []}
        emptyTitle="لا توجد بيانات يومية"
        emptyDescription="ستظهر الخدمات الأعلى طلباً هنا."
      />

      <DataTable
        columns={[
          { key: 'assigned_provider__user__full_name', label: 'المزوّد' },
          { key: 'total', label: 'عدد الطلبات' },
        ]}
        rows={weekly.provider_performance || []}
        emptyTitle="لا توجد بيانات أداء"
        emptyDescription="ستظهر إحصاءات أداء المزوّدين هنا."
      />
    </div>
  )
}

export default ReportsPage
