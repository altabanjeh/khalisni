import { useState } from 'react'
import { Download, LineChart } from 'lucide-react'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getLocalizedField } from '../../utils/i18n'
import { formatCurrency } from '../../utils/format'

function ReportsPage() {
  const { language, isArabic } = useLanguage()
  const { data: daily, loading: dailyLoading } = useAsyncData(() => api.getDailyReport(), [], null)
  const { data: weekly, loading: weeklyLoading } = useAsyncData(() => api.getWeeklyReport(), [], null)
  // PRD success metrics; the page still renders when the summary is unavailable.
  const { data: summary } = useAsyncData(() => api.getOperationalSummary(), [], null)
  const metrics = summary?.success_metrics

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
          { key: 'service__name_ar', label: isArabic ? 'الخدمة' : 'Service', render: (row) => getLocalizedField(row, { ar: 'service__name_ar', en: 'service__name_en' }, language, '—') },
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
          { key: 'category_name', label: isArabic ? 'التصنيف' : 'Category', render: (row) => (isArabic ? row.category_name : row.category_name_en || row.category_name) },
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

      <MonthlyReport isArabic={isArabic} language={language} />

      {metrics ? <SuccessMetrics isArabic={isArabic} language={language} metrics={metrics} /> : null}
    </div>
  )
}

const PAYMENT_METHOD_LABELS = {
  cash: ['نقداً', 'Cash'],
  bank_transfer: ['تحويل بنكي', 'Bank transfer'],
  card: ['بطاقة', 'Card'],
  wallet: ['محفظة إلكترونية', 'Wallet'],
  online_gateway: ['بوابة دفع إلكتروني', 'Online payment gateway'],
  other: ['أخرى', 'Other'],
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function MonthlyReport({ isArabic, language }) {
  const { toast } = useToast()
  const [month, setMonth] = useState(currentMonth)
  const [exporting, setExporting] = useState('')
  const { data: monthly } = useAsyncData(() => api.getMonthlyReport(month), [month], null)

  async function exportCsv(period) {
    setExporting(period)
    try {
      const blob = await api.exportReport(period === 'monthly' ? { period, month } : { period })
      saveBlob(blob, `khalsni-${period}-${period === 'monthly' ? month : new Date().toISOString().slice(0, 10)}.csv`)
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setExporting('')
    }
  }

  return (
    <section aria-labelledby="monthly-report-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-lg font-black text-ink" id="monthly-report-heading">
          {isArabic ? 'التقرير الشهري' : 'Monthly report'}
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-bold text-slate-600">
            <span className="block">{isArabic ? 'الشهر' : 'Month'}</span>
            <input
              className="field mt-1 min-h-11"
              dir="ltr"
              onChange={(event) => setMonth(event.target.value || currentMonth())}
              type="month"
              value={month}
            />
          </label>
          {['weekly', 'monthly'].map((period) => (
            <button
              className="btn-secondary min-h-11"
              disabled={Boolean(exporting)}
              key={period}
              onClick={() => exportCsv(period)}
              type="button"
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              {period === 'weekly'
                ? (isArabic ? 'تصدير الأسبوع (CSV)' : 'Export week (CSV)')
                : (isArabic ? 'تصدير الشهر (CSV)' : 'Export month (CSV)')}
            </button>
          ))}
        </div>
      </div>
      {monthly ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricTile detail={monthly.month} label={isArabic ? 'طلبات الشهر' : 'Requests this month'} value={monthly.created_orders} />
            <MetricTile detail={monthly.month} label={isArabic ? 'المكتمل' : 'Completed'} value={monthly.completed_orders} />
            <MetricTile detail={monthly.month} label={isArabic ? 'الإيراد' : 'Revenue'} value={formatCurrency(monthly.revenue_summary || 0, language)} />
          </div>
          <DataTable
            columns={[
              { key: 'method', label: isArabic ? 'طريقة الدفع' : 'Payment method', render: (row) => (PAYMENT_METHOD_LABELS[row.method] || [row.method, row.method])[isArabic ? 0 : 1] },
              { key: 'records', label: isArabic ? 'عدد الدفعات' : 'Payments' },
              { key: 'amount', label: isArabic ? 'المبلغ' : 'Amount', render: (row) => formatCurrency(row.amount || 0, language) },
            ]}
            emptyDescription={isArabic ? 'تظهر الدفعات المسجّلة من الموظفين هنا حسب طريقة الدفع.' : 'Payments recorded by staff appear here by payment method.'}
            emptyTitle={isArabic ? 'لا توجد دفعات مسجّلة' : 'No recorded payments'}
            rows={withRowIds(monthly.payments_by_method)}
          />
        </>
      ) : null}
    </section>
  )
}

function withRowIds(rows) {
  return (rows || []).map((row, index) => ({ id: index, ...row }))
}

function formatMinutes(seconds, isArabic) {
  if (seconds === null || seconds === undefined) return '—'
  const minutes = Math.max(1, Math.round(seconds / 60))
  return isArabic ? `${minutes} دقيقة` : `${minutes} min`
}

function MetricTile({ label, value, detail }) {
  return (
    <div className="glass-panel p-5">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-ink">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  )
}

function SuccessMetrics({ metrics, isArabic, language }) {
  const timing = metrics.time_to_create_request || {}
  const followUp = metrics.completed_without_follow_up || {}
  const satisfaction = metrics.customer_satisfaction || {}
  return (
    <section aria-labelledby="success-metrics-heading" className="space-y-4">
      <h2 className="text-lg font-black text-ink" id="success-metrics-heading">
        {isArabic ? 'مؤشرات النجاح' : 'Success metrics'}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricTile
          detail={isArabic ? `الوسيط من ${timing.measured_orders || 0} طلب مقاس` : `Median of ${timing.measured_orders || 0} measured requests`}
          label={isArabic ? 'وقت إنشاء الطلب' : 'Time to create a request'}
          value={formatMinutes(timing.median_seconds, isArabic)}
        />
        <MetricTile
          detail={isArabic
            ? `${followUp.without_missing_document_request || 0} من ${followUp.completed_orders || 0} طلب مكتمل دون طلب مستندات ناقصة`
            : `${followUp.without_missing_document_request || 0} of ${followUp.completed_orders || 0} completed requests with no missing-document request`}
          label={isArabic ? 'مكتمل دون متابعة يدوية' : 'Completed without manual follow-up'}
          value={followUp.percent === null || followUp.percent === undefined ? '—' : `${followUp.percent}%`}
        />
        <MetricTile
          detail={isArabic ? `من ${satisfaction.ratings || 0} تقييم` : `From ${satisfaction.ratings || 0} ratings`}
          label={isArabic ? 'رضا العملاء (من 5)' : 'Customer satisfaction (out of 5)'}
          value={satisfaction.average_score ?? '—'}
        />
      </div>
      <DataTable
        columns={[
          { key: 'service_name_ar', label: isArabic ? 'الخدمة' : 'Service', render: (row) => getLocalizedField(row, { ar: 'service_name_ar', en: 'service_name_en' }, language, '—') },
          { key: 'completed_orders', label: isArabic ? 'طلبات مكتملة' : 'Completed requests' },
          { key: 'average_hours', label: isArabic ? 'متوسط مدة المعالجة (ساعة)' : 'Avg. processing time (h)' },
        ]}
        emptyDescription={isArabic ? 'ستظهر مدة المعالجة لكل خدمة بعد اكتمال الطلبات.' : 'Processing time per service appears once requests are completed.'}
        emptyTitle={isArabic ? 'لا توجد طلبات مكتملة' : 'No completed requests'}
        rows={withRowIds(metrics.processing_duration_by_service)}
      />
      <DataTable
        columns={[
          { key: 'provider_name', label: isArabic ? 'المزوّد' : 'Provider' },
          { key: 'total_orders', label: isArabic ? 'الطلبات المسندة' : 'Assigned requests' },
          { key: 'completed_orders', label: isArabic ? 'المكتمل' : 'Completed' },
          { key: 'completion_rate', label: isArabic ? 'نسبة الإنجاز' : 'Completion rate', render: (row) => (row.completion_rate === null ? '—' : `${row.completion_rate}%`) },
        ]}
        emptyDescription={isArabic ? 'ستظهر إنتاجية المزوّدين بعد إسناد الطلبات.' : 'Provider throughput appears once requests are assigned.'}
        emptyTitle={isArabic ? 'لا توجد بيانات مزوّدين' : 'No provider data'}
        rows={withRowIds(metrics.provider_throughput)}
      />
    </section>
  )
}

export default ReportsPage
