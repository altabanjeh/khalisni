import { BookOpenText, CircleHelp, Search, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useHelpGuideContext } from '../context/HelpGuideContext'
import { getHelpScreenLabel, matchHelpScreen } from '../help/screenRegistry'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'

function SectionBlock({ title, children }) {
  if (!children) return null

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <div className="text-sm leading-7 text-slate-600">{children}</div>
    </section>
  )
}

function ListBlock({ items = [], tone = 'slate', title }) {
  if (!items.length) return null

  const toneClass =
    tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-border bg-white text-slate-700'

  return (
    <section className={`space-y-3 rounded-3xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-bold">{title}</h4>
      <ul className="space-y-2 text-sm leading-7">
        {items.map((item, index) => (
          <li key={`${index + 1}-${item}`}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function GuideTable({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-slate-500">{emptyLabel}</p>
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-border bg-white">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-right font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, index) => (
            <tr key={`${row.id || row.key || index}-${index}`}>
              {columns.map((column) => (
                <td key={column.key} className="align-top px-4 py-3 text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SearchSection({ title, rows, renderItem }) {
  if (!rows.length) return null

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${title}-${row.id || index}`} className="rounded-2xl border border-border bg-slate-50/60 p-4 text-sm text-slate-700">
            {renderItem(row)}
          </div>
        ))}
      </div>
    </section>
  )
}

function SearchResults({ results }) {
  return (
    <div className="space-y-5">
      <SearchSection
        rows={results.screens || []}
        title="Screen Guides"
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.screen_label}</p>
            {item.short_description ? <p className="mt-2">{item.short_description}</p> : null}
          </>
        )}
      />
      <SearchSection
        rows={results.actions || []}
        title="Buttons and Actions"
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.button_label}</p>
            <p className="mt-1 text-xs text-slate-500">{item.screen_label}</p>
            <p className="mt-2">{item.purpose || item.when_to_use}</p>
          </>
        )}
      />
      <SearchSection
        rows={results.fields || []}
        title="Fields"
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.field_label}</p>
            <p className="mt-1 text-xs text-slate-500">{item.screen_label}</p>
            <p className="mt-2">{item.purpose || item.tooltip_text}</p>
          </>
        )}
      />
      <SearchSection
        rows={results.services || []}
        title="Services"
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.service_name}</p>
            <p className="mt-1 text-xs text-slate-500">{item.category_name}</p>
            <p className="mt-2">{item.description}</p>
          </>
        )}
      />
      <SearchSection
        rows={results.workflows || []}
        title="Workflow Actions"
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.action_label || item.workflow_key}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.current_status_label} → {item.next_status_label}
            </p>
            <p className="mt-2">{item.system_effect}</p>
          </>
        )}
      />
    </div>
  )
}

function HelpGuidePanel({ onClose, open }) {
  const location = useLocation()
  const { user } = useAuth()
  const { currentHelp, currentHelpError, currentHelpLoading, pageHelp } = useHelpGuideContext()
  const [searchResults, setSearchResults] = useState(null)
  const [query, setQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const activeScreen = useMemo(() => matchHelpScreen(location.pathname), [location.pathname])
  const activeScreenKey = activeScreen?.screen_key || ''
  const activeScreenLabel = activeScreen?.label || getHelpScreenLabel(activeScreenKey)
  const screenGuides = currentHelp.screen_guides || currentHelp.results || []
  const primaryGuide = screenGuides[0] || null
  const actionRows = currentHelp.actions || []
  const fieldRows = currentHelp.fields || []
  const workflowRows = currentHelp.workflows || []
  const serviceGuide = currentHelp.service || null

  useEffect(() => {
    if (!open) return undefined
    if (!query.trim()) {
      setSearchResults(null)
      setSearchError('')
      return undefined
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError('')
      try {
        const payload = await api.searchHelp({ q: query.trim() })
        if (!cancelled) setSearchResults(payload)
      } catch (requestError) {
        if (!cancelled) setSearchError(getDisplayError(requestError))
      } finally {
        if (!cancelled) setSearchLoading(false)
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

  const isSearching = Boolean(query.trim())
  const commonProblems = [
    ...(primaryGuide?.common_error_items || []),
    ...((serviceGuide?.common_errors || []).slice(0, 3)),
  ]
  const nextStepItems = [primaryGuide?.next_step, primaryGuide?.expected_result, primaryGuide?.related_screen_label]
    .filter(Boolean)
    .map((item) => String(item))

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="إغلاق نافذة المساعدة"
        className="absolute inset-0 bg-slate-900/45"
        onClick={onClose}
        type="button"
      />

      <aside className="absolute inset-y-0 left-0 flex w-full max-w-full justify-end">
        <div className="flex h-full w-full max-w-[860px] flex-col border-r border-border bg-[#f7f5ef] shadow-2xl">
          <header className="border-b border-border bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-700">
                  <CircleHelp className="h-5 w-5" />
                  <span className="text-sm font-semibold">الدليل التشغيلي داخل النظام</span>
                </div>
                <h2 className="text-2xl font-extrabold text-ink">{isSearching ? 'نتائج البحث في المساعدة' : activeScreenLabel}</h2>
                <p className="text-sm leading-7 text-slate-600">
                  {isSearching
                    ? 'النتائج تعرض فقط المحتوى المسموح لدورك الحالي.'
                    : 'يعرض هذا القسم شرح الشاشة الحالية، الحقول، الأزرار، والخطوات التالية في نفس السياق.'}
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
                  placeholder="ابحث عن شاشة أو زر أو حقل أو خطوة عمل"
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
            {currentHelpError && !isSearching ? (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{currentHelpError}</div>
            ) : null}
            {searchError && isSearching ? (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{searchError}</div>
            ) : null}

            {(currentHelpLoading && !isSearching) || (searchLoading && isSearching) ? (
              <div className="flex min-h-[240px] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              </div>
            ) : null}

            {!currentHelpLoading && !searchLoading && isSearching && searchResults ? <SearchResults results={searchResults} /> : null}

            {!isSearching && !currentHelpLoading ? (
              <div className="space-y-5">
                <SectionBlock title="Page Overview">
                  <p>{primaryGuide?.short_description || primaryGuide?.purpose || 'No page-specific overview is available yet.'}</p>
                  {primaryGuide?.route_path ? <p className="mt-2 text-xs text-slate-500">Route: {primaryGuide.route_path}</p> : null}
                </SectionBlock>

                <SectionBlock title="What You Can Do Here">
                  {primaryGuide?.when_to_use ? <p>{primaryGuide.when_to_use}</p> : null}
                  {primaryGuide?.steps?.length ? (
                    <ol className="mt-3 space-y-2">
                      {primaryGuide.steps.map((step, index) => (
                        <li key={`${index + 1}-${step}`}>{`${index + 1}. ${step}`}</li>
                      ))}
                    </ol>
                  ) : (
                    <p>{primaryGuide?.before_you_start || primaryGuide?.purpose || 'Use this screen for the current workflow stage.'}</p>
                  )}
                </SectionBlock>

                <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
                  <h4 className="text-sm font-bold text-ink">Buttons and Actions</h4>
                  <GuideTable
                    columns={[
                      { key: 'button_label', label: 'Button' },
                      { key: 'purpose', label: 'Purpose' },
                      { key: 'when_to_use', label: 'When to Use' },
                      { key: 'action_result', label: 'Result' },
                      { key: 'warning_message', label: 'Warning' },
                    ]}
                    emptyLabel="No contextual button help is available for this screen yet."
                    rows={actionRows}
                  />
                </section>

                <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
                  <h4 className="text-sm font-bold text-ink">Fields and Data Entry</h4>
                  <GuideTable
                    columns={[
                      { key: 'field_label', label: 'Field' },
                      {
                        key: 'required',
                        label: 'Required',
                        render: (row) => (row.required ? 'Yes' : 'Optional'),
                      },
                      { key: 'purpose', label: 'What to Enter' },
                      { key: 'valid_example', label: 'Example' },
                      { key: 'error_explanation', label: 'Common Error' },
                    ]}
                    emptyLabel="No field-level help is available for this screen yet."
                    rows={fieldRows}
                  />
                </section>

                {serviceGuide ? (
                  <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
                    <h4 className="text-sm font-bold text-ink">Service Guide</h4>
                    <div className="space-y-3 text-sm leading-7 text-slate-600">
                      <p>{serviceGuide.description}</p>
                      <p>
                        <span className="font-semibold text-ink">Who can use it:</span> {serviceGuide.who_can_use}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">Estimated time:</span> {serviceGuide.estimated_processing_time}
                      </p>
                      <p>
                        <span className="font-semibold text-ink">Price rule:</span> {serviceGuide.price_rule}
                      </p>
                    </div>
                    <ListBlock items={serviceGuide.required_documents || []} title="Required Documents" />
                    <ListBlock items={serviceGuide.required_data || []} title="Required Data" />
                    <ListBlock items={serviceGuide.workflow_summary || []} title="Workflow Steps" />
                  </section>
                ) : null}

                {workflowRows.length ? (
                  <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
                    <h4 className="text-sm font-bold text-ink">Workflow / Status Guide</h4>
                    <GuideTable
                      columns={[
                        { key: 'current_status_label', label: 'Current Status' },
                        { key: 'action_label', label: 'User Action' },
                        { key: 'next_status_label', label: 'Next Status' },
                        { key: 'role_label', label: 'Who Can Do It' },
                      ]}
                      emptyLabel="No workflow guidance is available for this status."
                      rows={workflowRows}
                    />
                  </section>
                ) : null}

                <ListBlock items={commonProblems} title="Common Problems" tone="amber" />
                <ListBlock items={nextStepItems} title="Next Step" />
              </div>
            ) : null}

            {!currentHelpLoading && !isSearching && !screenGuides.length && !actionRows.length && !fieldRows.length && !workflowRows.length && !serviceGuide ? (
              <div className="space-y-4 rounded-[32px] border border-dashed border-border bg-white/70 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-700">
                  <BookOpenText className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-ink">No contextual help is available yet</h3>
                  <p className="text-sm leading-7 text-slate-600">
                    Add screen, field, action, service, or workflow guidance from Help Guide Management to make this page self-explanatory.
                  </p>
                </div>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex items-start gap-3">
                    <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>The system still applies backend role and permission filtering even when generic fallback guidance is shown elsewhere.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default HelpGuidePanel
