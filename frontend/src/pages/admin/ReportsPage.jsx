import { LineChart } from 'lucide-react'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'

function ReportsPage() {
  const { language, isArabic } = useLanguage()
  const { data: daily, loading: dailyLoading } = useAsyncData(() => api.getDailyReport(), [], null)
  const { data: weekly, loading: weeklyLoading } = useAsyncData(() => api.getWeeklyReport(), [], null)

  if (dailyLoading || weeklyLoading || !daily || !weekly) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'اقرأ الطلب اليومي، أداء المزوّدين، إنتاجية التصنيفات، وحركة الإيراد قبل اتخاذ القرارات.'
          : 'Read daily demand, provider performance, category throughput and revenue movement before making decisions.'}
        eyebrow={isArabic ? 'تقارير الإدارة' : 'Admin reports'}
        icon={LineChart}
        title={isArabic ? 'تقارير الإنتاج والعمليات' : 'Production & operations reports'}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="glass-panel p-5">
          <p className="text-sm font-bold text-slate-500">{isArabic ? 'تقرير اليوم' : 'Today'}</p>
          <p className="mt-3 text-3xl font-black text-ink">{daily.created_orders}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{isArabic ? `طلبات منشأة في ${daily.date}` : `Requests created on ${daily.date}`}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm font-bold text-slate-500">{isArabic ? 'مكتمل اليوم' : 'Completed today'}</p>
          <p className="mt-3 text-3xl font-black text-ink">{daily.completed_orders}</p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-sm font-bold text-slate-500">{isArabic ? 'ملخص الإيراد' : 'Revenue summary'}</p>
          <p className="mt-3 text-3xl font-black text-ink">{formatCurrency(weekly.revenue_summary, language)}</p>
        </div>
      </section>

      <DataTable
        columns={[
          { key: 'service__name_ar', label: isArabic ? 'الخدمة' : 'Service' },
          { key: 'total', label: isArabic ? 'عدد الطلبات' : 'Requests' },
        ]}
        emptyDescription={isArabic ? 'ستظهر الخدمات الأعلى طلباً هنا.' : 'The most-requested services will appear here.'}
        emptyTitle={isArabic ? 'لا توجد بيانات يومية' : 'No daily data'}
        rows={daily.top_services || []}
      />

      <DataTable
        columns={[
          { key: 'assigned_provider__user__full_name', label: isArabic ? 'المزوّد' : 'Provider' },
          { key: 'total', label: isArabic ? 'عدد الطلبات' : 'Requests' },
        ]}
        emptyDescription={isArabic ? 'ستظهر إحصاءات أداء المزوّدين هنا.' : 'Provider performance stats will appear here.'}
        emptyTitle={isArabic ? 'لا توجد بيانات أداء' : 'No performance data'}
        rows={weekly.provider_performance || []}
      />

      <DataTable
        columns={[
          { key: 'category_name', label: isArabic ? 'التصنيف' : 'Category' },
          { key: 'orders_count', label: isArabic ? 'عدد الطلبات' : 'Requests' },
          { key: 'revenue', label: isArabic ? 'الإيراد' : 'Revenue', render: (row) => formatCurrency(row.revenue || 0, language) },
          { key: 'completed_orders', label: isArabic ? 'المكتمل' : 'Completed' },
          { key: 'delayed_orders', label: isArabic ? 'المتأخر' : 'Delayed' },
          { key: 'average_completion_time_hours', label: isArabic ? 'متوسط الإنجاز (ساعة)' : 'Avg. completion (h)' },
        ]}
        emptyDescription={isArabic ? 'ستظهر إحصاءات الطلبات والإيراد مجمّعة حسب التصنيف هنا.' : 'Requests and revenue grouped by category will appear here.'}
        emptyTitle={isArabic ? 'لا توجد بيانات بالتصنيف' : 'No category data'}
        rows={weekly.orders_by_category || []}
      />
    </div>
  )
}

export default ReportsPage
