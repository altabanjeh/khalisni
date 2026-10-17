import { ClipboardList, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadError from '../../components/LoadError'
import PageHeader from '../../components/PageHeader'
import Pagination from '../../components/Pagination'
import RequestCard from '../../components/RequestCard'
import { EmptyState, LoadingSkeleton } from '../../components/public/PublicPage'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { EMPTY_STATE_ILLUSTRATIONS } from '../../utils/catalogImagery'

const EMPTY_PAGE = { results: [], count: 0, hasNext: false, hasPrevious: false, statusCounts: null }

function MyOrdersPage() {
  const { isArabic } = useLanguage()
  // Requests page on the server: every request is reachable, and the chip,
  // the search and the chip counts are answered over all of them.
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  useEffect(() => {
    const next = query.trim()
    if (next === search) return undefined
    const timer = setTimeout(() => {
      setSearch(next)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])
  const { data: pageData, loading, error, reload } = useAsyncData(
    () => api.getCustomerOrdersPage({ page, statusGroup: filter, search }),
    [page, filter, search],
    EMPTY_PAGE,
  )
  const orders = useMemo(() => pageData?.results || [], [pageData])
  const total = pageData?.count || 0
  useEffect(() => {
    // A full page that has a successor tells the server's page size.
    if (pageData?.hasNext && pageData.results.length) setPageSize(pageData.results.length)
  }, [pageData])
  const pageGone = error?.response?.status === 404 && page > 1
  useEffect(() => {
    // The last request of the last page went away: go back to a page that exists.
    if (pageGone) setPage((current) => Math.max(1, current - 1))
  }, [pageGone])

  const filters = [
    { key: 'all', label: isArabic ? 'الكل' : 'All' },
    { key: 'action', label: isArabic ? 'مطلوب إجراء' : 'Action required' },
    { key: 'active', label: isArabic ? 'قيد التنفيذ' : 'Active' },
    { key: 'done', label: isArabic ? 'مكتملة' : 'Completed' },
  ]

  // Counts come from the server (same search as the list), not from one page.
  const counts = pageData?.statusCounts || {}

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
            aria-label={isArabic ? 'بحث في الطلبات' : 'Search requests'}
            onChange={(event) => setQuery(event.target.value)}
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
                setPage(1)
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

      {loading || pageGone ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,22rem))]">
          {Array.from({ length: 6 }).map((_, index) => <LoadingSkeleton className="h-64" key={index} />)}
        </div>
      ) : error ? (
        <LoadError error={error} onRetry={reload} title={isArabic ? 'تعذر تحميل طلباتك' : 'Could not load your requests'} />
      ) : orders.length ? (
        <>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(18rem,22rem))]">
            {orders.map((order) => (
              <RequestCard key={order.id} order={order} />
            ))}
          </div>
          <Pagination onChange={setPage} page={page} pageSize={pageSize} total={total} />
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
