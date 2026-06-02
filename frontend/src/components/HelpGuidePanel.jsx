import { BookOpenText, CircleHelp, Search, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getDisplayError } from '../api/client'
import { api } from '../api/services'
import { useHelpGuideContext } from '../context/HelpGuideContext'
import { getHelpScreenLabel, matchHelpScreen } from '../help/screenRegistry'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'

function SectionBlock({ title, children }) {
  if (!children) return null

  return (
    <section className="space-y-2 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <div className="text-sm leading-7 text-slate-600">{children}</div>
    </section>
  )
}

function OrderedSteps({ steps = [] }) {
  if (!steps.length) return null

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={`${index + 1}-${step}`} className="flex gap-3 rounded-3xl border border-border bg-white p-4">
          <span className="icon-chip h-9 w-9 shrink-0 rounded-2xl bg-brand-50 text-brand-700">{index + 1}</span>
          <p className="text-sm leading-7 text-slate-700">{step}</p>
        </li>
      ))}
    </ol>
  )
}

function HelpGuideCard({ guide, compact = false }) {
  return (
    <article className="space-y-4 rounded-[28px] border border-border bg-slate-50/70 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {guide.screen_label || getHelpScreenLabel(guide.screen_key)}
          </span>
          {guide.workflow_status_label ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {guide.workflow_status_label}
            </span>
          ) : null}
        </div>
        <h3 className="text-lg font-bold text-ink">{guide.title}</h3>
        {guide.short_description ? <p className="text-sm leading-7 text-slate-600">{guide.short_description}</p> : null}
      </div>

      {!compact ? (
        <div className="space-y-4">
          <SectionBlock title="الغرض">{guide.purpose}</SectionBlock>
          <SectionBlock title="قبل البدء">{guide.before_you_start}</SectionBlock>
          {guide.steps?.length ? (
            <section className="space-y-3">
              <h4 className="text-sm font-bold text-ink">الخطوات</h4>
              <OrderedSteps steps={guide.steps} />
            </section>
          ) : null}
          <SectionBlock title="النتيجة المتوقعة">{guide.expected_result}</SectionBlock>
          {guide.common_error_items?.length ? (
            <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-bold text-amber-900">مشكلات شائعة</h4>
              <ul className="space-y-2 text-sm leading-7 text-amber-900">
                {guide.common_error_items.map((item, index) => (
                  <li key={`${index + 1}-${item}`}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {guide.related_screen || guide.related_permission ? (
            <SectionBlock title="الخطوة أو الشاشة التالية">
              {guide.related_screen ? `الشاشة المرتبطة: ${getHelpScreenLabel(guide.related_screen)}.` : ''}
              {guide.related_permission ? ` الصلاحية المرتبطة: ${guide.related_permission}.` : ''}
            </SectionBlock>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function HelpGuidePanel({ onClose, open }) {
  const location = useLocation()
  const { user } = useAuth()
  const { pageHelp } = useHelpGuideContext()
  const [currentPayload, setCurrentPayload] = useState({ results: [] })
  const [searchResults, setSearchResults] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeScreen = useMemo(() => matchHelpScreen(location.pathname), [location.pathname])
  const activeScreenKey = activeScreen?.screen_key || ''
  const activeScreenLabel = activeScreen?.label || getHelpScreenLabel(activeScreenKey)

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    async function loadCurrentGuides() {
      setLoading(true)
      setError('')
      try {
        const result = await api.getCurrentHelpGuides({
          screen_key: activeScreenKey,
          workflow_status: pageHelp.workflowStatus || '',
        })
        if (!cancelled) setCurrentPayload(result)
      } catch (requestError) {
        if (!cancelled) setError(getDisplayError(requestError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCurrentGuides()

    return () => {
      cancelled = true
    }
  }, [activeScreenKey, open, pageHelp.workflowStatus])

  useEffect(() => {
    if (!open) return undefined
    if (!query.trim()) {
      setSearchResults([])
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const results = await api.getHelpGuides({ search: query.trim() })
        if (!cancelled) setSearchResults(results)
      } catch (requestError) {
        if (!cancelled) setError(getDisplayError(requestError))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, open])

  if (!open || !user) return null

  const visibleGuides = query.trim() ? searchResults : currentPayload.results || []
  const hasGuides = visibleGuides.length > 0

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="إغلاق نافذة المساعدة"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 left-0 flex w-full max-w-full justify-end">
        <div className="flex h-full w-full max-w-[780px] flex-col border-r border-border bg-[#f7f5ef] shadow-2xl">
          <header className="border-b border-border bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-700">
                  <CircleHelp className="h-5 w-5" />
                  <span className="text-sm font-semibold">دليل المستخدم داخل النظام</span>
                </div>
                <h2 className="text-2xl font-extrabold text-ink">{query.trim() ? 'نتائج البحث في المساعدة' : activeScreenLabel}</h2>
                <p className="text-sm leading-7 text-slate-600">
                  {query.trim()
                    ? 'النتائج المعروضة تحترم دورك وصلاحياتك الحالية.'
                    : 'يعرض هذا القسم الإرشادات المطابقة للشاشة الحالية ودورك داخل النظام.'}
                </p>
              </div>
              <button aria-label="إغلاق" className="btn-ghost p-2" onClick={onClose} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="field pr-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ابحث بالعنوان أو الشاشة أو المهمة أو الكلمة المفتاحية"
                  value={query}
                />
              </div>
              <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                الدور الحالي: <span className="font-semibold text-ink">{user.role}</span>
              </div>
              {pageHelp.workflowStatus ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  الحالة: <span className="font-semibold">{pageHelp.workflowStatus}</span>
                </div>
              ) : null}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {error ? (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{error}</div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : null}

            {!loading && hasGuides ? (
              <div className="space-y-5">
                {visibleGuides.map((guide) => (
                  <HelpGuideCard key={guide.id} compact={Boolean(query.trim())} guide={guide} />
                ))}
              </div>
            ) : null}

            {!loading && !hasGuides && !error ? (
              <div className="space-y-4 rounded-[32px] border border-dashed border-border bg-white/70 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-700">
                  {query.trim() ? <Search className="h-6 w-6" /> : <BookOpenText className="h-6 w-6" />}
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-ink">
                    {query.trim() ? 'لا توجد نتائج مطابقة' : 'لا يوجد دليل مخصص لهذه الشاشة حالياً'}
                  </h3>
                  <p className="text-sm leading-7 text-slate-600">
                    {query.trim()
                      ? 'جرّب كلمة مختلفة أو افتح الشاشة المطلوبة ثم أعد البحث.'
                      : 'إذا كانت هذه الشاشة مهمة تشغيلية، أضف لها محتوى من إدارة دليل المستخدم.'}
                  </p>
                </div>
                {!query.trim() ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-start gap-3">
                      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>سيتم عرض الدليل العام المرتبط بدورك تلقائياً عندما يتوفر، حتى لو لم توجد تعليمات خاصة بهذه الشاشة بعد.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default HelpGuidePanel
