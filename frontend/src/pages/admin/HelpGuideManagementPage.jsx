import { BookOpenText, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useToast } from '../../context/ToastContext'
import { getHelpScreenLabel } from '../../help/screenRegistry'
import { useAsyncData } from '../../hooks/useAsyncData'

const PAGE_SIZE = 15

const defaultValues = {
  screen_key: '',
  route_path: '',
  role: 'all_users',
  permission_key: '',
  workflow_status: '',
  title: '',
  short_description: '',
  purpose: '',
  before_you_start: '',
  step_by_step_guide: '',
  expected_result: '',
  common_errors: '',
  related_screen: '',
  related_permission: '',
  search_keywords: '',
  display_order: 0,
  is_active: true,
}

function Field({ label, children, hint }) {
  return (
    <label className="space-y-2">
      <div className="space-y-1">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </label>
  )
}

function PreviewSection({ title, children }) {
  if (!children) return null

  return (
    <section className="space-y-2 rounded-3xl border border-border bg-white p-4">
      <h4 className="text-sm font-bold text-ink">{title}</h4>
      <div className="text-sm leading-7 text-slate-600">{children}</div>
    </section>
  )
}

function HelpGuidePreview({ guide }) {
  const steps = guide.step_by_step_guide
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  const commonErrors = guide.common_errors
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  return (
    <div className="space-y-4 rounded-[28px] border border-border bg-slate-50/70 p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            {getHelpScreenLabel(guide.screen_key)}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {guide.role_label}
          </span>
          {guide.workflow_status ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {guide.workflow_status}
            </span>
          ) : null}
        </div>
        <h3 className="text-lg font-bold text-ink">{guide.title || 'عنوان الدليل سيظهر هنا'}</h3>
        {guide.short_description ? <p className="text-sm leading-7 text-slate-600">{guide.short_description}</p> : null}
      </div>

      <PreviewSection title="الغرض">{guide.purpose}</PreviewSection>
      <PreviewSection title="قبل البدء">{guide.before_you_start}</PreviewSection>

      {steps.length ? (
        <section className="space-y-3">
          <h4 className="text-sm font-bold text-ink">الخطوات</h4>
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li key={`${index + 1}-${step}`} className="flex gap-3 rounded-3xl border border-border bg-white p-4">
                <span className="icon-chip h-9 w-9 shrink-0 rounded-2xl bg-brand-50 text-brand-700">{index + 1}</span>
                <p className="text-sm leading-7 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <PreviewSection title="النتيجة المتوقعة">{guide.expected_result}</PreviewSection>

      {commonErrors.length ? (
        <section className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-bold text-amber-900">مشكلات شائعة</h4>
          <ul className="space-y-2 text-sm leading-7 text-amber-900">
            {commonErrors.map((item, index) => (
              <li key={`${index + 1}-${item}`}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function flattenPermissionOptions(permissionGroups) {
  return Object.entries(permissionGroups || {}).flatMap(([app, permissions]) =>
    permissions.map((permission) => ({
      value: permission.full_codename,
      label: `${app} / ${permission.name}`,
    })),
  )
}

function HelpGuideManagementPage() {
  const { toast } = useToast()
  const { data: guides = [], loading, reload } = useAsyncData(() => api.getHelpGuides(), [], [])
  const { data: metadata = { screens: [], roles: [], workflow_statuses: [] }, loading: metadataLoading } = useAsyncData(
    () => api.getHelpGuideMetadata(),
    [],
    { screens: [], roles: [], workflow_statuses: [] },
  )
  const { data: permissions = {}, loading: permissionsLoading } = useAsyncData(() => api.getAvailablePermissions(), [], {})
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedGuideId, setSelectedGuideId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm({ defaultValues })

  const selectedGuide = useMemo(
    () => guides.find((item) => String(item.id) === String(selectedGuideId)) || null,
    [guides, selectedGuideId],
  )
  const permissionOptions = useMemo(() => flattenPermissionOptions(permissions), [permissions])
  const screenOptions = useMemo(() => metadata.screens || [], [metadata.screens])
  const roleOptions = useMemo(() => metadata.roles || [], [metadata.roles])
  const workflowOptions = useMemo(() => metadata.workflow_statuses || [], [metadata.workflow_statuses])

  useEffect(() => {
    if (!selectedGuide) {
      form.reset({
        ...defaultValues,
        screen_key: screenOptions[0]?.screen_key || '',
        route_path: screenOptions[0]?.route_path || '',
        role: roleOptions[0]?.value || 'all_users',
      })
      return
    }

    form.reset({
      ...defaultValues,
      ...selectedGuide,
    })
  }, [form, roleOptions, screenOptions, selectedGuide])

  const watchedScreenKey = form.watch('screen_key')
  const previewValues = form.watch()
  const filtered = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase()
    return guides.filter((guide) => {
      if (!normalizedQuery) return true
      return [guide.title, guide.short_description, guide.screen_label, guide.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
  }, [guides, search])
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openCreateForm() {
    setSelectedGuideId(null)
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedGuideId(id)
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setSelectedGuideId(null)
  }

  async function handleSubmit(values) {
    setSubmitting(true)
    try {
      const selectedScreen = screenOptions.find((item) => item.screen_key === values.screen_key)
      const payload = {
        ...values,
        display_order: Number(values.display_order || 0),
        route_path: selectedScreen?.route_path || values.route_path || '',
      }
      if (selectedGuide) {
        await api.updateHelpGuide(selectedGuide.id, payload)
        toast('تم تحديث دليل المساعدة.', 'success')
      } else {
        await api.createHelpGuide(payload)
        toast('تم إنشاء دليل المساعدة.', 'success')
      }
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return
    try {
      await api.deleteHelpGuide(pendingDelete.id)
      toast('تم تعطيل دليل المساعدة.', 'success')
      reload()
      setPendingDelete(null)
      if (String(selectedGuideId) === String(pendingDelete.id)) closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const columns = [
    { key: 'title', label: 'العنوان' },
    { key: 'screen_label', label: 'الشاشة', render: (row) => row.screen_label || getHelpScreenLabel(row.screen_key) },
    { key: 'role_label', label: 'الدور', render: (row) => row.role_label || row.role },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (row) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {row.is_active ? 'نشط' : 'معطّل'}
        </span>
      ),
    },
    { key: 'display_order', label: 'الترتيب' },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => setPendingDelete(row)}
            type="button"
          >
            تعطيل
          </button>
        </div>
      ),
    },
  ]

  const previewGuide = {
    ...previewValues,
    role_label: roleOptions.find((item) => item.value === previewValues.role)?.label || previewValues.role,
  }
  const selectedScreen = screenOptions.find((item) => item.screen_key === watchedScreenKey)
  const isBusy = loading || metadataLoading || permissionsLoading

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="إدارة محتوى المساعدة الذي يظهر داخل النظام حسب الشاشة الحالية ودور المستخدم وصلاحياته. استخدم الترتيب لتقديم الأدلة الأهم أولاً، وفعّل أو عطّل النسخ حسب الحاجة."
        eyebrow="المساعدة داخل النظام"
        icon={BookOpenText}
        title="Help Guide Management"
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            + دليل جديد
          </button>
        }
      />

      <DataTable
        columns={columns}
        emptyDescription="أضف أول دليل مساعدة لربط الشاشة الحالية بالمحتوى التشغيلي المناسب."
        emptyTitle="لا توجد أدلة مساعدة"
        loading={isBusy}
        mobileCard={(row) => (
          <div className="space-y-3">
            <p className="font-bold text-ink">{row.title}</p>
            <p className="text-sm text-slate-600">{row.screen_label || getHelpScreenLabel(row.screen_key)}</p>
            <p className="text-xs text-slate-500">{row.role_label || row.role}</p>
          </div>
        )}
        pagination={{ page, pageSize: PAGE_SIZE, total: filtered.length, onChange: setPage }}
        rows={paginated}
        toolbar={
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="field pr-9 text-sm"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="ابحث بالعنوان أو الشاشة أو الدور"
              value={search}
            />
          </div>
        }
      />

      <FormModal
        description={selectedGuide ? 'عدّل النصوص أو شروط الظهور ثم راجع المعاينة قبل الحفظ.' : 'أنشئ دليلاً جديداً واربطه بالشاشة والدور المناسبين.'}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="help-guide-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedGuide ? 'حفظ التعديلات' : 'إضافة الدليل'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="xl"
        title={selectedGuide ? selectedGuide.title : 'دليل مساعدة جديد'}
      >
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <form className="space-y-5" id="help-guide-form" onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الشاشة">
                <select className="field" {...form.register('screen_key')}>
                  <option value="">دليل عام للدور</option>
                  {screenOptions.map((screen) => (
                    <option key={screen.screen_key} value={screen.screen_key}>
                      {screen.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الدور">
                <select className="field" {...form.register('role', { required: true })}>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الصلاحية المطلوبة" hint="اختياري. استخدمها إذا كان هذا الدليل يجب أن يظهر فقط عند وجود صلاحية محددة.">
                <select className="field" {...form.register('permission_key')}>
                  <option value="">بدون شرط صلاحية</option>
                  {permissionOptions.map((permission) => (
                    <option key={permission.value} value={permission.value}>
                      {permission.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الحالة التشغيلية" hint="اختياري. استخدمها لعرض تعليمات خاصة بحالة طلب معينة.">
                <select className="field" {...form.register('workflow_status')}>
                  <option value="">بدون حالة محددة</option>
                  {workflowOptions.map((workflow) => (
                    <option key={workflow.value} value={workflow.value}>
                      {workflow.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="العنوان">
                <input className="field" {...form.register('title', { required: true })} />
              </Field>

              <Field label="الترتيب">
                <input className="field" min="0" type="number" {...form.register('display_order')} />
              </Field>
            </div>

            <Field label="وصف قصير">
              <textarea className="field min-h-24" {...form.register('short_description')} />
            </Field>

            <Field label="الغرض">
              <textarea className="field min-h-24" {...form.register('purpose')} />
            </Field>

            <Field label="قبل البدء">
              <textarea className="field min-h-24" {...form.register('before_you_start')} />
            </Field>

            <Field label="الخطوات" hint="اكتب كل خطوة في سطر مستقل حتى تظهر مرقمة داخل لوحة المساعدة.">
              <textarea className="field min-h-32" {...form.register('step_by_step_guide')} />
            </Field>

            <Field label="النتيجة المتوقعة">
              <textarea className="field min-h-24" {...form.register('expected_result')} />
            </Field>

            <Field label="المشكلات الشائعة" hint="اكتب كل مشكلة في سطر مستقل.">
              <textarea className="field min-h-24" {...form.register('common_errors')} />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الشاشة المرتبطة">
                <select className="field" {...form.register('related_screen')}>
                  <option value="">بدون شاشة مرتبطة</option>
                  {screenOptions.map((screen) => (
                    <option key={screen.screen_key} value={screen.screen_key}>
                      {screen.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="الصلاحية المرتبطة">
                <select className="field" {...form.register('related_permission')}>
                  <option value="">بدون صلاحية مرتبطة</option>
                  {permissionOptions.map((permission) => (
                    <option key={permission.value} value={permission.value}>
                      {permission.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="كلمات مفتاحية للبحث">
              <input className="field" {...form.register('search_keywords')} />
            </Field>

            <label className="flex items-center justify-between rounded-2xl border border-border bg-slate-50 px-4 py-3 text-sm font-medium text-ink">
              <span>الدليل نشط</span>
              <input className="h-4 w-4 accent-brand-600" type="checkbox" {...form.register('is_active')} />
            </label>

            {selectedScreen ? (
              <div className="rounded-3xl border border-border bg-slate-50/70 p-4 text-sm text-slate-600">
                المسار المرتبط بهذه الشاشة: <span className="font-semibold text-ink">{selectedScreen.route_path || 'غير محدد'}</span>
              </div>
            ) : null}
          </form>

          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-slate-50/70 p-4">
              <p className="text-sm font-bold text-ink">معاينة الدليل</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                هذه المعاينة تساعدك على مراجعة الصياغة كما ستظهر داخل لوحة المساعدة للمستخدم.
              </p>
            </div>
            <HelpGuidePreview guide={previewGuide} />
          </div>
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel="نعم، عطّل الدليل"
        description={`سيتم تعطيل دليل "${pendingDelete?.title || ''}" ولن يظهر للمستخدمين العاديين. هل تريد المتابعة؟`}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        open={!!pendingDelete}
        title="تأكيد تعطيل دليل المساعدة"
        variant="danger"
      />
    </div>
  )
}

export default HelpGuideManagementPage
