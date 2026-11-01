import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BarChart3, Clock3, LayoutDashboard, UsersRound } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import StatCard from '../../components/StatCard'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import EmptyState from '../../components/EmptyState'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'
import { buildOverviewChartData } from '../../utils/overviewCharts'

function AdminOverviewPage() {
  const { language, isArabic } = useLanguage()
  const { data, loading, error } = useAsyncData(() => api.getAdminDashboard(), [], null)
  const { data: catalogue = [] } = useAsyncData(() => (isArabic ? Promise.resolve([]) : api.getAdminServices()), [isArabic], [])

  if (loading) {
    return <LoadingSpinner />
  }
  if (error || !data) {
    return (
      <EmptyState
        description={error ? getDisplayError(error) : (isArabic ? 'تعذر تحميل لوحة الإدارة.' : 'The admin dashboard could not be loaded.')}
        title={isArabic ? 'تعذر تحميل البيانات' : 'Could not load data'}
      />
    )
  }

  const { statusRows, serviceRows } = buildOverviewChartData(data, language, catalogue)

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'نظرة تشغيلية عالية المستوى على الطلبات والأداء والإيراد التقديري.'
          : 'A high-level operational view of requests, performance and estimated revenue.'}
        eyebrow={isArabic ? 'الإدارة' : 'Administration'}
        icon={LayoutDashboard}
        title={isArabic ? 'لوحة الإدارة' : 'Admin dashboard'}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BarChart3} title={isArabic ? 'طلبات جديدة اليوم' : 'New requests today'} value={data.cards.new_orders_today} />
        <StatCard icon={Clock3} title={isArabic ? 'قيد التنفيذ' : 'In progress'} value={data.cards.orders_in_progress} />
        <StatCard icon={UsersRound} title={isArabic ? 'بانتظار العميل' : 'Waiting for customer'} tone="warning" value={data.cards.waiting_customer} />
        <StatCard icon={BarChart3} title={isArabic ? 'مكتمل هذا الأسبوع' : 'Completed this week'} tone="success" value={data.cards.completed_this_week} />
        <StatCard icon={Clock3} title={isArabic ? 'طلبات متأخرة' : 'Delayed requests'} tone="warning" value={data.cards.delayed_orders} />
        <StatCard icon={BarChart3} title={isArabic ? 'تقدير الإيراد' : 'Estimated revenue'} value={formatCurrency(data.cards.revenue_estimate, language)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? "الطلبات حسب الحالة" : "Requests by status"}</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              {/* Status codes are presented through the shared status labels (audit D03). */}
              <BarChart data={statusRows} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--kh-border)" strokeDasharray="3 3" />
                <XAxis
                  angle={-35}
                  dataKey="label"
                  height={90}
                  interval={0}
                  reversed={isArabic}
                  stroke="var(--kh-text-muted)"
                  textAnchor={isArabic ? 'start' : 'end'}
                  tick={{ fill: 'var(--kh-text-muted)', fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  orientation={isArabic ? 'right' : 'left'}
                  stroke="var(--kh-text-muted)"
                  tick={{ fill: 'var(--kh-text-muted)', fontSize: 12 }}
                  width={40}
                />
                <Tooltip contentStyle={{ background: 'var(--kh-surface)', border: '1px solid var(--kh-border)', borderRadius: 12, color: 'var(--kh-text)' }} />
                <Bar dataKey="total" fill="#146ef0" name={isArabic ? 'عدد الطلبات' : 'Requests'} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? "الخدمات الأكثر طلباً" : "Most requested services"}</h2>
          <div className="mt-6 h-64">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={serviceRows}
                  dataKey="total"
                  innerRadius={50}
                  label={({ percent }) => `${Math.round((percent || 0) * 100)}%`}
                  labelLine={false}
                  nameKey="label"
                  outerRadius={95}
                  paddingAngle={2}
                >
                  {serviceRows.map((row) => <Cell fill={row.color} key={row.label} stroke="var(--kh-surface)" />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--kh-surface)', border: '1px solid var(--kh-border)', borderRadius: 12, color: 'var(--kh-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {serviceRows.length ? (
            <ul aria-label={isArabic ? 'مفتاح الخدمات الأكثر طلباً' : 'Most requested services legend'} className="mt-4 grid gap-2 text-sm" data-testid="top-services-legend">
              {serviceRows.map((row) => (
                <li className="flex items-center justify-between gap-3" key={row.label}>
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="truncate text-ink">{row.label}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-ink">{row.total}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-600">{isArabic ? 'لا توجد طلبات بعد.' : 'No requests yet.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminOverviewPage
