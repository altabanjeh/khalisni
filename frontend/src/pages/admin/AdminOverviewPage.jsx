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
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatCurrency } from '../../utils/format'

function AdminOverviewPage() {
  const { data, loading } = useAsyncData(() => api.getAdminDashboard(), [], null)

  if (loading || !data) {
    return <LoadingSpinner />
  }

  return (
    <div className="page-section">
      <PageHeader
        description="نظرة تشغيلية عالية المستوى على الطلبات، الأداء، والإيراد التقديري. تم تبسيط الشاشة لتبقى مركزة على القرارات."
        eyebrow="الإدارة"
        icon={LayoutDashboard}
        title="لوحة الإدارة"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={BarChart3} title="طلبات جديدة اليوم" value={data.cards.new_orders_today} />
        <StatCard icon={Clock3} title="قيد التنفيذ" value={data.cards.orders_in_progress} />
        <StatCard icon={UsersRound} title="بانتظار العميل" tone="warning" value={data.cards.waiting_customer} />
        <StatCard icon={BarChart3} title="مكتمل هذا الأسبوع" tone="success" value={data.cards.completed_this_week} />
        <StatCard icon={Clock3} title="طلبات متأخرة" tone="warning" value={data.cards.delayed_orders} />
        <StatCard icon={BarChart3} title="تقدير الإيراد" value={formatCurrency(data.cards.revenue_estimate)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">الطلبات حسب الحالة</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={data.orders_by_status}>
                <CartesianGrid stroke="#d7e7f5" strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#0b67b2" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">الخدمات الأكثر طلباً</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={data.top_services} dataKey="total" fill="#147fd1" nameKey="service__name_ar" outerRadius={100} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminOverviewPage
