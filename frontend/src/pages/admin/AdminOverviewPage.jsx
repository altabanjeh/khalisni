import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'

function AdminOverviewPage() {
  const { language, isArabic } = useLanguage()
  const { data, loading } = useAsyncData(() => api.getAdminDashboard(), [], null)

  if (loading || !data) {
    return <LoadingSpinner />
  }

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
              <BarChart data={data.orders_by_status}>
                <CartesianGrid stroke="var(--kh-border)" strokeDasharray="3 3" />
                <XAxis dataKey="status" stroke="var(--kh-text-muted)" tick={{ fill: 'var(--kh-text-muted)', fontSize: 12 }} />
                <YAxis stroke="var(--kh-text-muted)" tick={{ fill: 'var(--kh-text-muted)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--kh-surface)', border: '1px solid var(--kh-border)', borderRadius: 12, color: 'var(--kh-text)' }} />
                <Bar dataKey="total" fill="#146ef0" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{isArabic ? "الخدمات الأكثر طلباً" : "Most requested services"}</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={data.top_services} dataKey="total" fill="#146ef0" nameKey="service__name_ar" outerRadius={100} label />
                <Tooltip contentStyle={{ background: 'var(--kh-surface)', border: '1px solid var(--kh-border)', borderRadius: 12, color: 'var(--kh-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOverviewPage
