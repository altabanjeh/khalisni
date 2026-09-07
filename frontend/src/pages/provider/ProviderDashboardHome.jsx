import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Clock3, FolderCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'
import StatusBadge from '../../components/StatusBadge'
import { EmptyState } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDate } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'

const ATTENTION = new Set(['ASSIGNED', 'READY_FOR_DELIVERY', 'WAITING_PROVIDER'])
const ACTIVE = new Set(['ASSIGNED', 'IN_PROGRESS', 'WAITING_GOVERNMENT', 'WAITING_PROVIDER', 'READY_FOR_DELIVERY'])

function ProviderDashboardHome() {
  const { language, isArabic } = useLanguage()
  const { data, loading } = useAsyncData(() => api.getProviderDashboard(), [], null)
  const { data: orders = [] } = useAsyncData(() => api.getProviderOrders(), [], [])

  if (loading || !data) return <LoadingSpinner />

  const list = Array.isArray(orders) ? orders : []
  const attention = list.filter((o) => ATTENTION.has(String(o.status).toUpperCase()))
  const recent = [...list]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 6)

  const stats = [
    { icon: FolderCheck, label: isArabic ? 'طلبات معيّنة' : 'Assigned', value: data.assigned_orders ?? list.length },
    { icon: Clock3, label: isArabic ? 'قيد التنفيذ' : 'In progress', value: data.in_progress ?? list.filter((o) => ACTIVE.has(String(o.status).toUpperCase())).length },
    { icon: CheckCircle2, label: isArabic ? 'مكتملة' : 'Completed', value: data.completed ?? 0 },
    { icon: AlertTriangle, label: isArabic ? 'متأخرة' : 'Delayed', value: data.delayed ?? 0, warn: true },
  ]

  function Row({ order }) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-ink">{order.service ? getServiceName(order.service, language) : (isArabic ? 'خدمة' : 'Service')}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            #{order.order_number} · {isArabic ? 'التسليم' : 'Due'} {formatDate(order.expected_delivery_date, language)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          <Link className="btn-ghost px-3 py-1.5 text-xs" to={`/provider/orders/${order.id}`}>
            {isArabic ? 'فتح' : 'Open'}
          </Link>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(50% 80% at 100% 0%, color-mix(in srgb, var(--kh-primary) 12%, transparent), transparent 70%)' }} />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-600">{isArabic ? 'بوابة المزوّد' : 'Provider portal'}</p>
            <h1 className="mt-1 text-2xl font-black text-ink sm:text-3xl">
              <Building2 className="me-2 inline h-6 w-6 text-brand-600" />
              {isArabic ? 'مساحة عملي' : 'My workspace'}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-7 text-slate-600">
              {isArabic ? 'الطلبات المسندة إليك، ما يحتاج انتباهك الآن، وآخر التحديثات.' : 'Requests assigned to you, what needs attention now, and the latest updates.'}
            </p>
            <Link className="btn-primary mt-4" to="/provider/orders">
              {isArabic ? 'كل الطلبات المعيّنة' : 'All assigned requests'}
              <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:w-[24rem]">
            {stats.map(({ icon: Icon, label, value, warn }) => (
              <div key={label} className={`rounded-[var(--radius-lg)] border p-3 ${warn && value ? 'border-amber-200 bg-amber-50' : 'border-border bg-brand-50/50'}`}>
                <Icon className={`h-4 w-4 ${warn && value ? 'text-amber-600' : 'text-brand-600'}`} />
                <p className="mt-2 text-2xl font-black text-ink">{value}</p>
                <p className="text-[0.7rem] font-bold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {attention.length ? (
        <section className="overflow-hidden rounded-[var(--radius-xl)] border-2 border-amber-300 bg-amber-50 shadow-soft">
          <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-100/60 px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-amber-950"><AlertTriangle className="h-5 w-5" /></span>
            <div>
              <h2 className="text-base font-black text-amber-950">{isArabic ? 'يحتاج انتباهك' : 'Needs your attention'}
                <span className="ms-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-black text-amber-950">{attention.length}</span>
              </h2>
              <p className="text-xs font-semibold text-amber-900">{isArabic ? 'ابدأ التنفيذ أو أكمل التسليم لهذه الطلبات.' : 'Start work or complete delivery on these requests.'}</p>
            </div>
          </div>
          <ul className="divide-y divide-amber-200 px-5">
            {attention.map((order) => <Row key={order.id} order={order} />)}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-ink">{isArabic ? 'آخر التحديثات' : 'Recent updates'}</h2>
          <Link className="text-sm font-extrabold text-brand-600 hover:text-brand-700" to="/provider/orders">{isArabic ? 'عرض الكل' : 'View all'}</Link>
        </div>
        {recent.length ? (
          <ul className="divide-y divide-border">{recent.map((order) => <Row key={order.id} order={order} />)}</ul>
        ) : (
          <EmptyState icon={FolderCheck} title={isArabic ? 'لا توجد طلبات معيّنة' : 'No assigned requests'} description={isArabic ? 'ستظهر هنا الطلبات التي تُسند إليك.' : 'Requests assigned to you will appear here.'} />
        )}
      </section>
    </div>
  )
}

export default ProviderDashboardHome
