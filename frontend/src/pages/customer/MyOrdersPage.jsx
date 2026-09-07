import { ClipboardList, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import RequestCard from '../../components/RequestCard'
import { EmptyState, LoadingSkeleton } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { EMPTY_STATE_ILLUSTRATIONS } from '../../utils/catalogImagery'

const PAGE_SIZE = 12
const TERMINAL = new Set(['COMPLETED', 'DELIVERED', 'CLOSED', 'VERIFIED', 'CANCELLED', 'REJECTED'])

function isActionRequired(order) {
  return String(order.status).toUpperCase() === 'WAITING_CUSTOMER' || (order.missing_document_types?.length ?? 0) > 0
}

function MyOrdersPage() {
  const { isArabic } = useLanguage()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const { data: orders = [], loading } = useAsyncData(() => api.getCustomerOrders(), [], [])

  const filters = [
    { key: 'all', label: isArabic ? 'الكل' : 'All' },
    { key: 'action', label: isArabic ? 'مطلوب إجراء' : 'Action required' },
    { key: 'active', label: isArabic ? 'قيد التنفيذ' : 'Active' },
    { key: 'done', label: isArabic ? 'مكتملة' : 'Completed' },
  ]

  const counts = useMemo(() => {
    const list = Array.isArray(orders) ? orders : []
    return {
      all: list.length,
      action: list.filter(isActionRequired).length,
      active: list.filter((o) => !TERMINAL.has(String(o.status).toUpperCase()) && !isActionRequired(o)).length,
      done: list.filter((o) => ['COMPLETED', 'DELIVERED', 'CLOSED', 'VERIFIED'].includes(String(o.status).toUpperCase())).length,
    }
  }, [orders])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return (Array.isArray(orders) ? orders : [])
      .filter((order) => {
        if (filter === 'action') return isActionRequired(order)
        if (filter === 'active') return !TERMINAL.has(String(order.status).toUpperCase()) && !isActionRequired(order)
        if (filter === 'done') return ['COMPLETED', 'DELIVERED', 'CLOSED', 'VERIFIED'].includes(String(order.status).toUpperCase())
        return true
      })
      .filter((order) => {
        if (!normalizedQuery) return true
        return `${order.order_number} ${order.service?.name_ar || ''} ${order.service?.name_en || ''}`
          .toLowerCase()
          .includes(normalizedQuery)
      })
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
  }, [orders, query, filter])

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic ? 'كل طلباتك مع بحث سريع وتصفية بالحالة وبطاقة واضحة لكل طلب.' : 'All your requests with quick search, status filters and a clear card per request.'}
        eyebrow={isArabic ? 'العميل' : 'Customer'}
        icon={ClipboardList}
        title={isArabic ? 'طلباتي' : 'My requests'}
        actions={<Link className="btn-primary" to="/customer/orders/new">{isArabic ? 'طلب جديد' : 'New request'}</Link>}
      />

      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="field ps-9"
            onChange={(event) => {
              setQuery(event.target.value)
              setVisible(PAGE_SIZE)
            }}
            placeholder={isArabic ? 'ابحث برقم الطلب أو اسم الخدمة' : 'Search by request number or service'}
            value={query}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist">
          {filters.map((item) => (
            <button
              aria-selected={filter === item.key}
              className={`kh-focusable inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
                filter === item.key
                  ? 'border-transparent bg-brand-600 text-white'
                  : 'border-border bg-card text-slate-600 hover:bg-brand-50'
              }`}
              key={item.key}
              onClick={() => {
                setFilter(item.key)
                setVisible(PAGE_SIZE)
              }}
              role="tab"
              type="button"
            >
              {item.label}
              <span className={filter === item.key ? 'text-white/80' : 'text-slate-400'}>{counts[item.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,22rem))]">
          {Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton className="h-64" key={index} />)}
        </div>
      ) : filtered.length ? (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,22rem))]">
            {filtered.slice(0, visible).map((order) => (
              <RequestCard key={order.id} order={order} />
            ))}
          </div>
          {filtered.length > visible ? (
            <div className="flex justify-center">
              <button className="btn-secondary" onClick={() => setVisible((current) => current + PAGE_SIZE)} type="button">
                {isArabic ? 'عرض المزيد' : 'Show more'} ({filtered.length - visible})
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          illustration={EMPTY_STATE_ILLUSTRATIONS.requests}
          icon={Search}
          title={isArabic ? 'لا توجد طلبات مطابقة' : 'No matching requests'}
          description={
            isArabic
              ? 'جرّب تصفية أخرى أو عدّل البحث، أو ابدأ طلباً جديداً من كتالوج الخدمات.'
              : 'Try another filter or search term, or start a new request from the service catalog.'
          }
          action={<Link className="btn-primary" to="/customer/orders/new">{isArabic ? 'طلب جديد' : 'New request'}</Link>}
        />
      )}
    </div>
  )
}

export default MyOrdersPage
