import { FilePlus2, Save, Scale, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getDisplayError } from '../../api/client'
import { LEGAL_KINDS, legalApi } from '../../api/legalApi'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { FieldGroup, FormMessage } from '../../components/publicSite/PublicSiteFormFields'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { broadcastPublicSiteUpdate } from '../../utils/publicSiteSync'

const EMPTY_FORM = {
  version: '',
  effective_date: '',
  title_ar: '',
  title_en: '',
  body_ar: '',
  body_en: '',
  approval_status: 'draft_requires_approval',
  approval_note: '',
}

const FORM_FIELDS = Object.keys(EMPTY_FORM)

function fieldError(errors, name) {
  const messages = errors?.[name]
  return messages ? { message: Array.isArray(messages) ? messages[0] : String(messages) } : null
}

// Versioned legal documents (D06). A version that has been published is
// read-only; a change is a new version, saved as a draft and then published.
function LegalDocumentsEditorPage() {
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [kind, setKind] = useState('privacy')
  const { data, loading, error, reload } = useAsyncData(() => legalApi.getAdminLegalDocuments({ kind }), [kind], null)
  const versions = useMemo(() => (Array.isArray(data) ? data : data?.results || []), [data])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [busy, setBusy] = useState(false)

  const published = versions.find((item) => item.is_published) || null
  const selected = versions.find((item) => item.id === selectedId || item.legal_document_id === selectedId) || null
  const editing = form !== null
  const kindLabel = (value) => (value === 'privacy' ? tr('سياسة الخصوصية', 'Privacy policy') : tr('شروط الاستخدام', 'Terms of use'))
  const statusLabel = (item) => (item.approval_status === 'approved' ? tr('معتمدة', 'Approved') : tr('مسودة تتطلب الموافقة', 'Draft – requires approval'))

  function chooseKind(value) {
    setKind(value)
    setSelectedId(null)
    setForm(null)
    setFeedback(null)
  }

  function startNewVersion() {
    const source = published || EMPTY_FORM
    setSelectedId(null)
    setFieldErrors({})
    setFeedback(null)
    setForm({
      ...EMPTY_FORM,
      title_ar: source.title_ar || '',
      title_en: source.title_en || '',
      body_ar: source.body_ar || '',
      body_en: source.body_en || '',
    })
  }

  function editVersion(item) {
    setSelectedId(item.legal_document_id)
    setFieldErrors({})
    setFeedback(null)
    setForm(item.is_editable ? Object.fromEntries(FORM_FIELDS.map((name) => [name, item[name] ?? ''])) : null)
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setFeedback(null)
    setFieldErrors({})
    try {
      const saved = selected
        ? await legalApi.updateAdminLegalDocument(selected.legal_document_id, form)
        : await legalApi.createAdminLegalDocument({ ...form, kind })
      setSelectedId(saved.legal_document_id)
      setFeedback({ type: 'success', text: tr('تم حفظ النسخة كمسودة غير منشورة.', 'Version saved (not published).') })
      reload()
    } catch (saveError) {
      setFieldErrors(saveError?.fieldErrors || {})
      setFeedback({ type: 'error', text: getDisplayError(saveError) })
    } finally {
      setBusy(false)
    }
  }

  async function publish(item) {
    const question = tr(
      `نشر النسخة ${item.version}؟ ستحل محل النسخة المنشورة حالياً، وتبقى النسخ السابقة محفوظة للقراءة فقط.`,
      `Publish version ${item.version}? It replaces the currently published version; previous versions stay stored read-only.`,
    )
    if (!window.confirm(question)) return
    setBusy(true)
    setFeedback(null)
    try {
      await legalApi.publishAdminLegalDocument(item.legal_document_id)
      broadcastPublicSiteUpdate('legal-documents')
      setForm(null)
      setFeedback({ type: 'success', text: tr('تم نشر النسخة.', 'Version published.') })
      reload()
    } catch (publishError) {
      setFeedback({ type: 'error', text: getDisplayError(publishError) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page-section">
      <PageHeader
        icon={Scale}
        eyebrow={tr('الموقع العام', 'Public site')}
        title={tr('الوثائق القانونية', 'Legal documents')}
        description={tr(
          'سياسة الخصوصية وشروط الاستخدام بنسخ مرقّمة. النسخة المنشورة أو التي نُشرت سابقاً للقراءة فقط؛ أي تعديل يكون بنسخة جديدة. لا تعتمد نصاً إلا بعد موافقة المالك/المستشار القانوني الموثّقة.',
          'Versioned privacy policy and terms of use. A published (or previously published) version is read-only; a change is a new version. Mark a text approved only after the owner/legal advisor has approved it in writing.',
        )}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={tr('نوع الوثيقة', 'Document kind')}>
        {LEGAL_KINDS.map((value) => (
          <button
            aria-selected={kind === value}
            className={kind === value ? 'btn-primary' : 'btn-secondary'}
            key={value}
            onClick={() => chooseKind(value)}
            role="tab"
            type="button"
          >
            {kindLabel(value)}
          </button>
        ))}
        <button className="btn-secondary" disabled={busy} onClick={startNewVersion} type="button">
          <FilePlus2 className="h-4 w-4" />
          {tr('نسخة جديدة', 'New version')}
        </button>
      </div>

      <FormMessage message={feedback} />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="glass-panel space-y-3 p-6">
          <h2 className="text-lg font-extrabold text-ink">{tr('النسخ', 'Versions')}</h2>
          {loading && !data ? <LoadingSpinner /> : null}
          {error ? <p className="text-sm text-danger">{getDisplayError(error)}</p> : null}
          {!loading && !versions.length ? <p className="text-sm text-slate-600">{tr('لا توجد نسخ بعد.', 'No versions yet.')}</p> : null}
          <ul className="space-y-2">
            {versions.map((item) => (
              <li key={item.legal_document_id}>
                <button
                  className={`w-full rounded-2xl border px-4 py-3 text-start text-sm ${selected?.legal_document_id === item.legal_document_id ? 'border-brand-500 bg-brand-50' : 'border-border bg-white'}`}
                  onClick={() => editVersion(item)}
                  type="button"
                >
                  <span className="block font-extrabold text-ink">{item.version}</span>
                  <span className="block text-xs text-slate-600">
                    {tr('تاريخ السريان', 'Effective')}: {item.effective_date} · {statusLabel(item)}
                    {item.is_published ? ` · ${tr('منشورة', 'Published')}` : ''}
                    {!item.is_editable ? ` · ${tr('للقراءة فقط', 'Read-only')}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-panel space-y-4 p-6">
          {editing ? (
            <form className="space-y-4" onSubmit={save}>
              <h2 className="text-lg font-extrabold text-ink">
                {selected ? tr(`تعديل المسودة ${selected.version}`, `Edit draft ${selected.version}`) : tr(`نسخة جديدة — ${kindLabel(kind)}`, `New version — ${kindLabel(kind)}`)}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup error={fieldError(fieldErrors, 'version')} hint={tr('مثال: 2026-12-01', 'e.g. 2026-12-01')} label={tr('رقم النسخة', 'Version label')}>
                  <input className="field" onChange={(event) => update('version', event.target.value)} required value={form.version} />
                </FieldGroup>
                <FieldGroup error={fieldError(fieldErrors, 'effective_date')} label={tr('تاريخ السريان', 'Effective date')}>
                  <input className="field" onChange={(event) => update('effective_date', event.target.value)} required type="date" value={form.effective_date} />
                </FieldGroup>
                <FieldGroup error={fieldError(fieldErrors, 'title_ar')} label={tr('العنوان (عربي)', 'Title (Arabic)')}>
                  <input className="field" dir="rtl" onChange={(event) => update('title_ar', event.target.value)} required value={form.title_ar} />
                </FieldGroup>
                <FieldGroup error={fieldError(fieldErrors, 'title_en')} label={tr('العنوان (إنجليزي)', 'Title (English)')}>
                  <input className="field" dir="ltr" onChange={(event) => update('title_en', event.target.value)} required value={form.title_en} />
                </FieldGroup>
              </div>
              <FieldGroup error={fieldError(fieldErrors, 'body_ar')} hint={tr('افصل الفقرات بسطر فارغ', 'Separate paragraphs with a blank line')} label={tr('النص (عربي)', 'Text (Arabic)')}>
                <textarea className="field min-h-64" dir="rtl" onChange={(event) => update('body_ar', event.target.value)} required value={form.body_ar} />
              </FieldGroup>
              <FieldGroup error={fieldError(fieldErrors, 'body_en')} label={tr('النص (إنجليزي)', 'Text (English)')}>
                <textarea className="field min-h-64" dir="ltr" onChange={(event) => update('body_en', event.target.value)} required value={form.body_en} />
              </FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup error={fieldError(fieldErrors, 'approval_status')} label={tr('حالة الموافقة', 'Approval status')}>
                  <select className="field" onChange={(event) => update('approval_status', event.target.value)} value={form.approval_status}>
                    <option value="draft_requires_approval">{tr('مسودة تتطلب موافقة المالك/المستشار القانوني', 'Draft – requires owner/legal approval')}</option>
                    <option value="approved">{tr('معتمدة من المالك/المستشار القانوني', 'Approved by the owner/legal advisor')}</option>
                  </select>
                </FieldGroup>
                <FieldGroup
                  error={fieldError(fieldErrors, 'approval_note')}
                  hint={tr('مطلوب عند الاعتماد', 'Required when approved')}
                  label={tr('مرجع الموافقة (من وافق وكيف)', 'Approval reference (who approved and how)')}
                >
                  <input className="field" onChange={(event) => update('approval_note', event.target.value)} value={form.approval_note} />
                </FieldGroup>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={busy} type="submit">
                  <Save className="h-4 w-4" />
                  {tr('حفظ كمسودة غير منشورة', 'Save (not published)')}
                </button>
                {selected && selected.is_editable ? (
                  <button className="btn-secondary" disabled={busy} onClick={() => publish(selected)} type="button">
                    <Send className="h-4 w-4" />
                    {tr('نشر هذه النسخة', 'Publish this version')}
                  </button>
                ) : null}
              </div>
            </form>
          ) : selected ? (
            <article className="space-y-3" data-testid="legal-version-readonly">
              <h2 className="text-lg font-extrabold text-ink">
                {kindLabel(selected.kind)} — {selected.version}
              </h2>
              <p className="text-sm text-slate-600">
                {statusLabel(selected)} · {tr('تاريخ السريان', 'Effective')}: {selected.effective_date}
                {selected.approved_at ? ` · ${tr('اعتمدها', 'Approved by')}: ${selected.approved_by_name || '—'} (${selected.approval_note})` : ''}
              </p>
              <p className="rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-semibold text-ink">
                {tr('هذه النسخة نُشرت ولا يمكن تعديلها. أنشئ نسخة جديدة لأي تغيير.', 'This version was published and cannot be edited. Create a new version for any change.')}
              </p>
              <h3 className="text-sm font-extrabold text-ink">{selected.title_ar}</h3>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700" dir="rtl">{selected.body_ar}</p>
              <h3 className="text-sm font-extrabold text-ink">{selected.title_en}</h3>
              <p className="whitespace-pre-line text-sm leading-7 text-slate-700" dir="ltr">{selected.body_en}</p>
            </article>
          ) : (
            <p className="text-sm text-slate-600">
              {tr('اختر نسخة لعرضها، أو أنشئ نسخة جديدة.', 'Choose a version to view it, or create a new version.')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

export default LegalDocumentsEditorPage
