import { BookOpenText, CircleHelp, Search, TriangleAlert, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/services'
import { getDisplayError } from '../api/client'
import { useHelpGuideContext } from '../context/HelpGuideContext'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { getManualScreenshots } from '../help/manualAssets'
import { getHelpScreenLabel, matchHelpScreen } from '../help/screenRegistry'

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function hasRealScreenshot(screenshot) {
  return Boolean(screenshot?.image_url)
}

function getGuideScreenshots(guide, language) {
  const existing = Array.isArray(guide?.screenshots) ? guide.screenshots : []
  const fallback = getManualScreenshots(guide?.screen_key, language)

  if (!existing.length) return fallback
  if (existing.some(hasRealScreenshot)) return existing
  return fallback.length ? fallback : existing
}

function SectionBlock({ title, children, tone = 'default' }) {
  if (!children) return null

  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : tone === 'muted'
        ? 'border-border bg-slate-50/70'
        : 'border-border bg-white'

  return (
    <section className={`space-y-3 rounded-3xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <div className="text-sm leading-7 text-slate-700">{children}</div>
    </section>
  )
}

function ListBlock({ items = [], title, ordered = false, tone = 'default' }) {
  if (!items.length) return null

  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : 'border-border bg-white'

  const ListTag = ordered ? 'ol' : 'ul'

  return (
    <section className={`space-y-3 rounded-3xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <ListTag className="space-y-2 text-sm leading-7 text-slate-700">
        {items.map((item, index) => (
          <li key={`${title}-${index + 1}-${item}`}>{ordered ? `${index + 1}. ${item}` : item}</li>
        ))}
      </ListTag>
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

function ScreenshotGallery({ screenshots = [], t }) {
  if (!screenshots.length) return null

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{t('manual.screenshots', 'الصور التوضيحية')}</h4>
      <div className="grid gap-4 md:grid-cols-2">
        {screenshots.map((shot) => (
          <figure key={shot.id || `${shot.caption}-${shot.display_order}`} className="space-y-3 rounded-3xl border border-border bg-slate-50/70 p-4">
            {shot.image_url ? (
              <img alt={shot.alt_text || shot.caption} className="w-full rounded-2xl border border-border bg-white object-cover" src={shot.image_url} />
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-6 text-center text-sm font-semibold text-amber-900">
                {shot.placeholder_label || t('manual.screenshotRequired', 'الصورة مطلوبة: {caption}', { caption: shot.caption })}
              </div>
            )}
            <figcaption className="space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-ink">{shot.caption}</p>
              {shot.step_reference ? <p className="text-xs uppercase tracking-wide text-slate-500">{t('manual.stepLabel', 'الخطوة: {step}', { step: shot.step_reference })}</p> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function RelatedGuides({ guide, onSelectGuide, t }) {
  const relatedPages = guide?.related_pages || []
  const relatedScreenLabel = guide?.related_screen_label

  if (!relatedPages.length && !relatedScreenLabel) return null

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{t('manual.relatedPages', 'صفحات مرتبطة')}</h4>
      <div className="flex flex-wrap gap-2">
        {relatedPages.map((item) => (
          <button
            key={item.slug || item.id}
            className="rounded-full border border-border bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            onClick={() => onSelectGuide(item.slug)}
            type="button"
          >
            {item.title}
          </button>
        ))}
        {!relatedPages.length && relatedScreenLabel ? (
          <span className="rounded-full border border-border bg-slate-50 px-3 py-2 text-sm text-slate-600">{relatedScreenLabel}</span>
        ) : null}
      </div>
    </section>
  )
}

function GuideDetail({ guide, onSelectGuide, extraSections = null, t, language }) {
  if (!guide) {
    return (
      <div className="rounded-[32px] border border-dashed border-border bg-white/70 p-6 text-center text-sm text-slate-500">
        {t('manual.noGuideSelected', 'اختر دليلاً لقراءة الصفحة الكاملة.')}
      </div>
    )
  }

  const beforeYouStart = guide.before_you_start_items?.length ? guide.before_you_start_items : splitLines(guide.before_you_start)
  const steps = guide.steps?.length ? guide.steps : splitLines(guide.step_by_step_guide)
  const expectedResult = guide.expected_result_items?.length ? guide.expected_result_items : splitLines(guide.expected_result)
  const commonMistakes = guide.common_error_items?.length ? guide.common_error_items : splitLines(guide.common_errors)
  const troubleshooting = guide.troubleshooting_items?.length ? guide.troubleshooting_items : splitLines(guide.troubleshooting)
  const screenshots = getGuideScreenshots(guide, language)

  return (
    <div className="space-y-5">
      <SectionBlock title={t('manual.title', 'العنوان')}>
        <div className="space-y-2">
          <p className="text-lg font-bold text-ink">{guide.title}</p>
          {guide.short_description ? <p>{guide.short_description}</p> : null}
        </div>
      </SectionBlock>

      <SectionBlock title={t('manual.whoCanUse', 'من يستخدم هذه الصفحة')}>
        <p>{guide.role_label || guide.role || t('common.allUsers', 'جميع المستخدمين')}</p>
      </SectionBlock>

      <SectionBlock title={t('manual.purpose', 'الغرض')}>
        <p>{guide.purpose || guide.when_to_use || t('common.notAvailable', 'غير متاح')}</p>
      </SectionBlock>

      <ListBlock items={beforeYouStart} title={t('manual.beforeYouStart', 'قبل أن تبدأ')} />
      <ListBlock items={steps} ordered title={t('manual.steps', 'الخطوات')} />
      <ListBlock items={expectedResult} title={t('manual.expectedResult', 'النتيجة المتوقعة')} />
      <ListBlock items={commonMistakes} title={t('manual.commonMistakes', 'الأخطاء الشائعة')} tone="warning" />
      <ListBlock items={troubleshooting} title={t('manual.troubleshooting', 'استكشاف الأخطاء')} tone="warning" />
      <ScreenshotGallery screenshots={screenshots} t={t} />
      <RelatedGuides guide={guide} onSelectGuide={onSelectGuide} t={t} />
      {extraSections}
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

function SearchResults({ results, t }) {
  return (
    <div className="space-y-5">
      <SearchSection
        rows={results.screens || []}
        title={t('manual.searchResults.screens', 'أدلة الشاشات')}
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
        title={t('manual.searchResults.actions', 'الأزرار والإجراءات')}
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
        title={t('manual.searchResults.fields', 'الحقول')}
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
        title={t('manual.searchResults.services', 'الخدمات')}
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
        title={t('manual.searchResults.workflows', 'إجراءات المسار')}
        renderItem={(item) => (
          <>
            <p className="font-semibold text-ink">{item.action_label || item.workflow_key}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.current_status_label} to {item.next_status_label}
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
  const { t, language } = useLanguage()
  const { currentHelp, currentHelpError, currentHelpLoading, pageHelp } = useHelpGuideContext()
  const [panelView, setPanelView] = useState('current')
  const [query, setQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [libraryData, setLibraryData] = useState({ guides: [], quick_links: [], categories: [], roles: [], can_manage_help_guides: false })
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedGuideSlug, setSelectedGuideSlug] = useState('')

  const activeScreen = useMemo(() => matchHelpScreen(location.pathname), [location.pathname])
  const activeScreenKey = activeScreen?.screen_key || ''
  const activeScreenLabel = activeScreen?.label || getHelpScreenLabel(activeScreenKey)
  const screenGuides = currentHelp.screen_guides || currentHelp.results || []
  const primaryGuide = screenGuides[0] || null
  const actionRows = currentHelp.actions || []
  const fieldRows = currentHelp.fields || []
  const workflowRows = currentHelp.workflows || []
  const serviceGuide = currentHelp.service || null
  const selectedLibraryGuide =
    libraryData.guides.find((item) => item.slug === selectedGuideSlug) ||
    libraryData.quick_links.find((item) => item.slug === selectedGuideSlug) ||
    libraryData.guides[0] ||
    null

  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, open])

  useEffect(() => {
    if (!open || panelView !== 'current') return undefined
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
  }, [open, panelView, query])

  useEffect(() => {
    if (!open || panelView !== 'library') return undefined

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLibraryLoading(true)
      setLibraryError('')
      try {
        const payload = await api.getHelpGuideIndex({
          search: query.trim(),
          category: categoryFilter,
          preview_role: roleFilter,
        })
        if (cancelled) return
        setLibraryData(payload)
        setSelectedGuideSlug((current) => {
          if (current && payload.guides.some((item) => item.slug === current)) return current
          return payload.quick_links[0]?.slug || payload.guides[0]?.slug || ''
        })
      } catch (requestError) {
        if (!cancelled) setLibraryError(getDisplayError(requestError))
      } finally {
        if (!cancelled) setLibraryLoading(false)
      }
    }, 150)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [categoryFilter, open, panelView, query, roleFilter])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSearchResults(null)
    setSearchError('')
  }, [panelView, open])

  if (!open || !user) return null

  const isCurrentSearch = panelView === 'current' && Boolean(query.trim())
  const commonProblems = [
    ...(primaryGuide?.common_error_items || []),
    ...((serviceGuide?.common_errors || []).slice(0, 3)),
  ]
  const contextualExtraSections = (
    <>
      <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
        <h4 className="text-sm font-bold text-ink">{t('manual.buttonsAndActions', 'الأزرار والإجراءات')}</h4>
        <GuideTable
          columns={[
            { key: 'button_label', label: t('manual.table.button', 'الزر') },
            { key: 'purpose', label: t('manual.table.purpose', 'الغرض') },
            { key: 'when_to_use', label: t('manual.table.whenToUse', 'متى يُستخدم') },
            { key: 'action_result', label: t('manual.table.result', 'النتيجة') },
            { key: 'warning_message', label: t('manual.table.warning', 'تنبيه') },
          ]}
          emptyLabel={t('manual.table.emptyActions', 'لا توجد مساعدة مرتبطة بالأزرار لهذه الشاشة بعد.')}
          rows={actionRows}
        />
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
        <h4 className="text-sm font-bold text-ink">{t('manual.fieldsAndDataEntry', 'الحقول وإدخال البيانات')}</h4>
        <GuideTable
          columns={[
            { key: 'field_label', label: t('manual.table.field', 'الحقل') },
            { key: 'required', label: t('manual.table.required', 'الإلزام'), render: (row) => (row.required ? t('common.required', 'إلزامي') : t('common.optional', 'اختياري')) },
            { key: 'purpose', label: t('manual.table.whatToEnter', 'ماذا تُدخل') },
            { key: 'valid_example', label: t('manual.table.example', 'مثال') },
            { key: 'error_explanation', label: t('manual.table.commonError', 'خطأ شائع') },
          ]}
          emptyLabel={t('manual.table.emptyFields', 'لا توجد مساعدة على مستوى الحقول لهذه الشاشة بعد.')}
          rows={fieldRows}
        />
      </section>

      {serviceGuide ? (
        <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
          <h4 className="text-sm font-bold text-ink">{t('manual.serviceGuide', 'دليل الخدمة')}</h4>
          <div className="space-y-3 text-sm leading-7 text-slate-700">
            <p>{serviceGuide.description}</p>
            <p>
              <span className="font-semibold text-ink">{t('manual.serviceWhoCanUse', 'من يستخدمها')}:</span> {serviceGuide.who_can_use}
            </p>
            <p>
              <span className="font-semibold text-ink">{t('manual.serviceEstimatedTime', 'المدة التقديرية')}:</span> {serviceGuide.estimated_processing_time}
            </p>
            <p>
              <span className="font-semibold text-ink">{t('manual.servicePriceRule', 'قاعدة التسعير')}:</span> {serviceGuide.price_rule}
            </p>
          </div>
          <ListBlock items={serviceGuide.required_documents || []} title={t('manual.requiredDocuments', 'الوثائق المطلوبة')} />
          <ListBlock items={serviceGuide.required_data || []} title={t('manual.requiredData', 'البيانات المطلوبة')} />
          <ListBlock items={serviceGuide.workflow_summary || []} title={t('manual.workflowSteps', 'خطوات المسار')} />
        </section>
      ) : null}

      {workflowRows.length ? (
        <section className="space-y-3 rounded-3xl border border-border bg-white p-4">
          <h4 className="text-sm font-bold text-ink">{t('manual.workflowGuide', 'دليل الحالات والمسار')}</h4>
          <GuideTable
            columns={[
              { key: 'current_status_label', label: t('manual.table.currentStatus', 'الحالة الحالية') },
              { key: 'action_label', label: t('manual.table.userAction', 'إجراء المستخدم') },
              { key: 'next_status_label', label: t('manual.table.nextStatus', 'الحالة التالية') },
              { key: 'role_label', label: t('manual.table.whoCanDoIt', 'من يستطيع التنفيذ') },
            ]}
            emptyLabel={t('manual.table.emptyWorkflow', 'لا توجد إرشادات حالة لهذه المرحلة حالياً.')}
            rows={workflowRows}
          />
        </section>
      ) : null}

      <ListBlock items={commonProblems} title={t('manual.commonProblems', 'المشكلات الشائعة')} tone="warning" />
    </>
  )

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label={t('common.close', 'إغلاق')} className="absolute inset-0 bg-slate-900/45" onClick={onClose} type="button" />

      <aside className="absolute inset-y-0 left-0 flex w-full max-w-full justify-end">
        <div className="flex h-full w-full max-w-[1080px] flex-col border-r border-border bg-[#f7f5ef] shadow-2xl">
          <header className="border-b border-border bg-white px-5 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-brand-700">
                  <CircleHelp className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t('manual.inAppManual', 'الدليل داخل النظام')}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-ink">{panelView === 'current' ? activeScreenLabel : t('manual.library', 'مكتبة الدليل')}</h2>
                <p className="text-sm leading-7 text-slate-600">
                  {panelView === 'current'
                    ? t('manual.currentDescription', 'اقرأ دليل الصفحة الحالية، وراجع الأزرار والحقول المرتبطة بها، أو ابحث داخل نظام المساعدة.')
                    : t('manual.libraryDescription', 'تصفح الأدلة حسب الدور والتصنيف والتعليمات المدعومة بالصور.')}
                </p>
              </div>
              <button aria-label={t('common.close', 'إغلاق')} className="btn-ghost p-2" onClick={onClose} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${panelView === 'current' ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-600'}`}
                onClick={() => setPanelView('current')}
                type="button"
              >
                {t('manual.currentPage', 'الصفحة الحالية')}
              </button>
              <button
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${panelView === 'library' ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-600'}`}
                onClick={() => setPanelView('library')}
                type="button"
              >
                {t('manual.library', 'مكتبة الدليل')}
              </button>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="field pr-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={panelView === 'current' ? t('manual.searchCurrent', 'ابحث في الشاشات والأزرار والحقول ومسارات العمل') : t('manual.searchLibrary', 'ابحث في عناوين الأدلة وصفحات العمل')}
                  value={query}
                />
              </div>
              {panelView === 'library' ? (
                <select className="field" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                  <option value="">{t('manual.allCategories', 'كل التصنيفات')}</option>
                  {(libraryData.categories || []).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                  {t('manual.role', 'الدور')}: <span className="font-semibold text-ink">{user.role}</span>
                </div>
              )}
              {panelView === 'library' ? (
                <select
                  className="field"
                  disabled={!libraryData.can_manage_help_guides}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  value={roleFilter}
                >
                  <option value="">{libraryData.can_manage_help_guides ? t('manual.currentRoleVisibility', 'عرض أدلة الدور الحالي') : t('manual.rolePreviewRestricted', 'معاينة الأدوار تتطلب صلاحية إدارة الدليل')}</option>
                  {(libraryData.roles || []).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              ) : pageHelp.workflowStatus ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {t('manual.workflowStatus', 'حالة المسار')}: <span className="font-semibold">{pageHelp.workflowStatus}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-600">
                  {t('manual.screenKey', 'مفتاح الشاشة')}: <span className="font-semibold text-ink">{activeScreenKey || t('manual.general', 'دليل عام')}</span>
                </div>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {panelView === 'current' ? (
              <>
                {currentHelpError && !isCurrentSearch ? (
                  <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{currentHelpError}</div>
                ) : null}
                {searchError && isCurrentSearch ? (
                  <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{searchError}</div>
                ) : null}

                {(currentHelpLoading && !isCurrentSearch) || (searchLoading && isCurrentSearch) ? (
                  <div className="flex min-h-[240px] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
                  </div>
                ) : null}

                {!currentHelpLoading && !searchLoading && isCurrentSearch && searchResults ? <SearchResults results={searchResults} t={t} /> : null}

                {!isCurrentSearch && !currentHelpLoading ? (
                  <div className="space-y-5">
                    <GuideDetail
                      guide={primaryGuide}
                      extraSections={contextualExtraSections}
                      language={language}
                      onSelectGuide={(slug) => {
                        if (slug) setSelectedGuideSlug(slug)
                        setPanelView('library')
                      }}
                      t={t}
                    />

                    {!screenGuides.length && !actionRows.length && !fieldRows.length && !workflowRows.length && !serviceGuide ? (
                      <div className="space-y-4 rounded-[32px] border border-dashed border-border bg-white/70 p-6 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-50 text-brand-700">
                          <BookOpenText className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-ink">{t('manual.noContextHelpTitle', 'لا توجد مساعدة سياقية لهذه الصفحة بعد')}</h3>
                          <p className="text-sm leading-7 text-slate-600">
                            {t('manual.noContextHelpDescription', 'أضف محتوى الشاشة والحقول والأزرار والحالات والصور من شاشة إدارة الدليل لجعل هذه الصفحة أوضح للمستخدم.')}
                          </p>
                        </div>
                        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          <div className="flex items-start gap-3">
                            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                            <p>{t('manual.permissionFilterNote', 'يواصل النظام تطبيق تصفية الأدوار والصلاحيات من الخلفية حتى عند توفر إرشادات عامة في المكتبة.')}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {libraryError ? <div className="rounded-3xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">{libraryError}</div> : null}

                {libraryLoading ? (
                  <div className="flex min-h-[240px] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
                  </div>
                ) : (
                  <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-5">
                      <SectionBlock title={t('manual.quickLinks', 'روابط سريعة')} tone="muted">
                        <div className="flex flex-wrap gap-2">
                          {(libraryData.quick_links || []).map((guide) => (
                            <button
                              key={guide.slug}
                              className={`rounded-full border px-3 py-2 text-sm transition ${selectedGuideSlug === guide.slug ? 'border-brand-600 bg-brand-600 text-white' : 'border-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'}`}
                              onClick={() => setSelectedGuideSlug(guide.slug)}
                              type="button"
                            >
                              {guide.title}
                            </button>
                          ))}
                        </div>
                      </SectionBlock>

                      <SectionBlock title={t('manual.guidePages', 'صفحات الدليل')} tone="muted">
                        <div className="space-y-2">
                          {(libraryData.guides || []).map((guide) => (
                            <button
                              key={guide.slug}
                              className={`w-full rounded-2xl border px-4 py-3 text-right transition ${selectedGuideSlug === guide.slug ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-border bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50/70'}`}
                              onClick={() => setSelectedGuideSlug(guide.slug)}
                              type="button"
                            >
                              <p className="font-semibold">{guide.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {guide.category} | {guide.role_label}
                              </p>
                            </button>
                          ))}
                          {!libraryData.guides?.length ? (
                            <p className="rounded-2xl border border-dashed border-border px-4 py-3 text-sm text-slate-500">{t('manual.noGuidesMatch', 'لا توجد أدلة مطابقة للبحث أو الفلاتر الحالية.')}</p>
                          ) : null}
                        </div>
                      </SectionBlock>
                    </aside>

                    <GuideDetail guide={selectedLibraryGuide} language={language} onSelectGuide={setSelectedGuideSlug} t={t} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}

export default HelpGuidePanel
