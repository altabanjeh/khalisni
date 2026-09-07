import { Search, Shield, TriangleAlert, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const PAGE_SIZE = 20

const defaultUserValues = {
  full_name: '', email: '', phone: '', password: '',
  role: 'employee', national_id: '', is_active: true, is_verified: false,
}
const fallbackRoleOptions = ['employee', 'support', 'provider']

function roleLabel(role, isArabic) {
  return (isArabic
    ? { admin: 'مدير', customer: 'عميل', employee: 'موظف', provider: 'مزود', support: 'دعم' }
    : { admin: 'Admin', customer: 'Customer', employee: 'Employee', provider: 'Provider', support: 'Support' }
  )[role] || role
}
function appLabel(app, isArabic) {
  return (isArabic
    ? { orders: 'الطلبات', documents: 'الوثائق', services: 'الخدمات', payment: 'المدفوعات', accounts: 'الحسابات', notifications: 'الإشعارات', providers: 'المزودون', audit: 'سجل الأحداث' }
    : { orders: 'Orders', documents: 'Documents', services: 'Services', payment: 'Payments', accounts: 'Accounts', notifications: 'Notifications', providers: 'Providers', audit: 'Audit log' }
  )[app] || app
}

function CheckboxField({ label, registration }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
  )
}
function Field({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  )
}

function canManageUserRecord(user, canManageAdminUsers) {
  if (canManageAdminUsers) return true
  return !user?.is_super_admin && user?.role !== 'admin'
}

function PermissionsPanel({ user, onSaved }) {
  const { toast } = useToast()
  const { isArabic } = useLanguage()
  const { data: available = {}, loading: permissionsLoading } = useAsyncData(() => api.getAvailablePermissions(), [], {})
  const [checked, setChecked] = useState(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    setChecked(new Set(user.current_permissions || []))
  }, [user])

  function toggle(fullCodename) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(fullCodename)) next.delete(fullCodename)
      else next.add(fullCodename)
      return next
    })
  }
  async function handleSave() {
    setSaving(true)
    try {
      await api.setUserPermissions(user.id, Array.from(checked))
      toast(isArabic ? 'تم حفظ الصلاحيات.' : 'Permissions saved.', 'success')
      if (onSaved) onSaved()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (permissionsLoading) return <div className="text-sm text-slate-500">{isArabic ? 'جارٍ تحميل الصلاحيات...' : 'Loading permissions…'}</div>
  const appEntries = Object.entries(available)
  if (appEntries.length === 0) return <div className="text-sm text-slate-500">{isArabic ? 'لا توجد صلاحيات متاحة.' : 'No permissions available.'}</div>

  return (
    <div className="space-y-4">
      {appEntries.map(([app, perms]) => (
        <div key={app}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">{appLabel(app, isArabic)}</p>
          <div className="space-y-2">
            {perms.map((perm) => (
              <label key={perm.full_codename} className="flex cursor-pointer items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-brand-50/40">
                <span className="text-ink">{perm.name}</span>
                <input checked={checked.has(perm.full_codename)} className="h-4 w-4 accent-brand-600" onChange={() => toggle(perm.full_codename)} type="checkbox" />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="btn-primary w-full disabled:opacity-60" disabled={saving} onClick={handleSave} type="button">
        {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        {isArabic ? 'حفظ الصلاحيات' : 'Save permissions'}
      </button>
    </div>
  )
}

function AdminUsersRolesPage() {
  const { toast } = useToast()
  const { isArabic } = useLanguage()
  const [statusFilter, setStatusFilter] = useState('active')
  const { data: users = [], loading, reload } = useAsyncData(() => api.getAdminUsers({ status: statusFilter }), [statusFilter], [])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const userForm = useForm({ defaultValues: defaultUserValues })
  const { reset } = userForm
  const tr = (ar, en) => (isArabic ? ar : en)

  const selectedUser = useMemo(() => users.find((item) => String(item.id) === String(selectedUserId)) || null, [users, selectedUserId])
  const availableRoleOptions = useMemo(() => users.find((item) => Array.isArray(item.role_options))?.role_options || fallbackRoleOptions, [users])
  const formRoleOptions = useMemo(() => {
    if (selectedUser?.role && !availableRoleOptions.includes(selectedUser.role)) return [selectedUser.role, ...availableRoleOptions]
    return availableRoleOptions
  }, [availableRoleOptions, selectedUser?.role])
  const canManageAdminUsers = availableRoleOptions.includes('admin')

  useEffect(() => {
    reset(selectedUser ? {
      full_name: selectedUser.full_name || '', email: selectedUser.email || '', phone: selectedUser.phone || '',
      password: '', role: selectedUser.role || 'employee', national_id: selectedUser.national_id || '',
      is_active: Boolean(selectedUser.is_active), is_verified: Boolean(selectedUser.is_verified),
    } : defaultUserValues)
  }, [selectedUser, reset])

  function closeForm() { setIsFormOpen(false); setSelectedUserId(null); setActiveTab('info'); reset(defaultUserValues) }
  function openCreateForm() { setSelectedUserId(null); setActiveTab('info'); reset(defaultUserValues); setIsFormOpen(true) }
  function openEditForm(id) { setSelectedUserId(id); setActiveTab('info'); setIsFormOpen(true) }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.toLowerCase().includes(q)
  })
  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleUserSubmit(values) {
    setSubmitting(true)
    try {
      const payload = { ...values }
      if (!payload.password) delete payload.password
      if (selectedUser) {
        await api.updateAdminUser(selectedUser.id, payload)
        toast(tr('تم تحديث المستخدم.', 'User updated.'), 'success')
      } else {
        await api.createAdminUser(payload)
        toast(tr('تم إنشاء المستخدم.', 'User created.'), 'success')
      }
      reload(); closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }
  async function handleDeleteConfirm(payload) {
    if (!pendingDelete) return
    const u = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteAdminUser(u.id, payload)
      if (String(selectedUserId) === String(u.id)) closeForm()
      reload()
      toast(tr('تم تعطيل المستخدم.', 'User deactivated.'), 'success')
    } catch (error) { toast(getDisplayError(error), 'error') }
  }
  async function handleRestoreConfirm() {
    if (!pendingRestore) return
    const u = pendingRestore
    setPendingRestore(null)
    try {
      await api.restoreAdminUser(u.id)
      reload()
      toast(tr('تم استعادة الحساب.', 'User restored.'), 'success')
    } catch (error) { toast(getDisplayError(error), 'error') }
  }

  const filtersToolbar = (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative">
        <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input aria-label={tr('بحث', 'Search')} className="field ps-9 text-sm" onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder={tr('بحث بالاسم أو البريد أو الهاتف...', 'Search by name, email or phone…')} value={search} />
      </div>
      <select aria-label={tr('تصفية حسب الحالة', 'Filter by status')} className="field text-sm" onChange={(e) => setStatusFilter(e.target.value)} value={statusFilter}>
        <option value="active">{tr('نشط', 'Active')}</option>
        <option value="deleted">{tr('محذوف', 'Deleted')}</option>
        <option value="all">{tr('الكل', 'All')}</option>
      </select>
    </div>
  )

  const tableColumns = [
    { key: 'full_name', label: tr('الاسم', 'Name') },
    { key: 'email', label: tr('البريد الإلكتروني', 'Email') },
    { key: 'phone', label: tr('الهاتف', 'Phone') },
    {
      key: 'role_display', label: tr('الدور', 'Role'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{roleLabel(row.role, isArabic)}</span>
          {row.is_deleted ? <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">{tr('محذوف', 'Deleted')}</span> : null}
        </div>
      ),
    },
    { key: 'status_display', label: tr('الحالة', 'Status'), render: (row) => <StatusBadge status={row.is_deleted ? 'REJECTED' : row.is_active ? 'VERIFIED' : 'PENDING_REVIEW'} /> },
    {
      key: 'actions_display', label: tr('الإجراءات', 'Actions'),
      render: (row) => {
        const canManageRecord = canManageUserRecord(row, canManageAdminUsers)
        return (
          <div className="flex gap-2">
            {row.is_deleted ? (
              <button className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50" disabled={!canManageRecord} onClick={() => setPendingRestore(row)} type="button">{tr('استعادة', 'Restore')}</button>
            ) : (
              <>
                <button className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50" disabled={!canManageRecord} onClick={() => openEditForm(row.id)} type="button">{tr('تعديل', 'Edit')}</button>
                <button className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50" disabled={!canManageRecord} onClick={() => setPendingDelete(row)} type="button">{tr('تعطيل', 'Deactivate')}</button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  function renderMobileCard(row) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-ink">{row.full_name}</p>
          <StatusBadge status={row.is_deleted ? 'REJECTED' : row.is_active ? 'VERIFIED' : 'PENDING_REVIEW'} />
        </div>
        <p className="text-sm text-slate-600">{row.email}</p>
        <p className="text-sm text-slate-500">{roleLabel(row.role, isArabic)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={<button className="btn-primary" onClick={openCreateForm} type="button">{isArabic ? '+ مستخدم تشغيلي جديد' : '+ New operational user'}</button>}
        description={tr('إدارة المستخدمين التشغيليين وتوزيع الصلاحيات الدقيقة. حسابات العملاء تُنشأ تلقائياً من المسار العام.', 'Manage operational users and fine-grained permissions. Customer accounts are created automatically from the public flow.')}
        eyebrow={tr('إدارة المستخدمين', 'User management')}
        icon={UsersRound}
        title={tr('المستخدمون والأدوار', 'Users & roles')}
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('إدارة أوضح', 'Clearer management')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{tr('بيانات المستخدم والصلاحيات داخل نافذة مستقلة، بينما بقي الجدول للمراجعة والبحث فقط.', 'User details and permissions live in a dedicated dialog, while the table stays focused on review and search.')}</p>
        </div>
        {!loading && !canManageAdminUsers ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="icon-chip bg-white text-amber-600"><TriangleAlert className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold text-amber-900">{tr('تنبيه إداري', 'Admin notice')}</p>
                <p className="mt-2 text-sm leading-7 text-amber-800">{tr('إنشاء أو تعديل مستخدمين بدور «مدير» مقيّد لحسابات المدير الأعلى فقط.', 'Creating or editing users with the Admin role is restricted to super-admin accounts.')}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
            <div className="flex items-start gap-3">
              <span className="icon-chip"><Shield className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-bold text-ink">{tr('ملخص الصلاحيات', 'Permissions summary')}</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">{tr('افتح المستخدم من الجدول ثم انتقل إلى تبويب «الصلاحيات» لتعيين الأذونات الدقيقة لكل تطبيق.', 'Open a user from the table, then switch to the Permissions tab to assign per-app permissions.')}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {!isFormOpen ? (
        <DataTable
          columns={tableColumns}
          emptyDescription={tr('أضف أول مستخدم تشغيلي من هذه الشاشة. حسابات العملاء تُنشأ تلقائياً.', 'Add the first operational user from this screen. Customer accounts are created automatically.')}
          emptyTitle={tr('لا يوجد مستخدمون', 'No users')}
          loading={loading}
          mobileCard={renderMobileCard}
          mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
          pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
          rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
          rows={paginated}
          toolbar={filtersToolbar}
        />
      ) : null}

      <FormModal
        description={selectedUser ? tr('راجع بيانات الحساب أو افتح تبويب الصلاحيات لتوزيع الأذونات.', 'Review the account details or open the Permissions tab to assign permissions.') : tr('أدخل بيانات حساب تشغيلي جديد، ويمكنك ضبط الصلاحيات لاحقاً.', 'Enter the new operational account details; you can set permissions after creating it.')}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="text-sm text-slate-500">
              {selectedUser ? tr(`الدور الحالي: ${roleLabel(selectedUser.role, true)}`, `Current role: ${roleLabel(selectedUser.role, false)}`) : tr('سيُنشأ المستخدم بحالة نشطة افتراضياً.', 'The user will be created active by default.')}
            </div>
            {activeTab === 'info' || !selectedUser ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button className="btn-secondary" onClick={closeForm} type="button">{tr('إلغاء', 'Cancel')}</button>
                <button className="btn-primary min-w-40" disabled={submitting} form="admin-user-form" type="submit">
                  {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {selectedUser ? tr('حفظ التعديلات', 'Save changes') : (isArabic ? 'إضافة المستخدم' : 'Add user')}
                </button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={closeForm} type="button">{tr('إغلاق', 'Close')}</button>
            )}
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedUser ? selectedUser.full_name : tr('مستخدم جديد', 'New user')}
      >
        <div className="space-y-6">
          {selectedUser ? (
            <div className="flex gap-2 rounded-2xl border border-border bg-slate-50 p-1">
              <button className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'info' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`} onClick={() => setActiveTab('info')} type="button">{tr('البيانات', 'Details')}</button>
              <button className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'perms' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`} onClick={() => setActiveTab('perms')} type="button">{isArabic ? 'الصلاحيات' : 'Permissions'}</button>
            </div>
          ) : null}

          {activeTab === 'info' || !selectedUser ? (
            <form className="space-y-6" id="admin-user-form" onSubmit={userForm.handleSubmit(handleUserSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={isArabic ? 'الاسم الكامل' : 'Full name'}>
                  <input className="field" placeholder={isArabic ? 'الاسم الكامل' : 'Full name'} {...userForm.register('full_name', { required: true })} />
                </Field>
                <Field label={isArabic ? 'البريد الإلكتروني' : 'Email'}>
                  <input className="field" placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} type="email" {...userForm.register('email', { required: true })} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={tr('الهاتف', 'Phone')}>
                  <input className="field" placeholder={tr('الهاتف', 'Phone')} {...userForm.register('phone')} />
                </Field>
                <Field label={selectedUser ? tr('كلمة مرور جديدة عند الحاجة', 'New password if needed') : (isArabic ? 'كلمة المرور' : 'Password')}>
                  <input className="field" placeholder={selectedUser ? tr('اتركها فارغة للإبقاء على الحالية', 'Leave blank to keep the current one') : (isArabic ? 'كلمة المرور' : 'Password')} type="password" {...userForm.register('password')} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={tr('الدور', 'Role')}>
                  <select className="field" {...userForm.register('role')}>
                    {formRoleOptions.map((option) => <option key={option} value={option}>{roleLabel(option, isArabic)}</option>)}
                  </select>
                </Field>
                <Field label={tr('الرقم الوطني', 'National ID')}>
                  <input className="field" placeholder={tr('الرقم الوطني', 'National ID')} {...userForm.register('national_id')} />
                </Field>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-bold text-ink">{tr('إعدادات الحساب', 'Account settings')}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField label={tr('الحساب نشط', 'Account active')} registration={userForm.register('is_active')} />
                  <CheckboxField label={tr('الحساب موثّق', 'Account verified')} registration={userForm.register('is_verified')} />
                </div>
              </div>
            </form>
          ) : (
            <PermissionsPanel onSaved={reload} user={selectedUser} />
          )}
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel={tr('استعادة الحساب', 'Restore account')}
        description={tr(`سيتم استعادة حساب "${pendingRestore?.full_name || ''}" وإعادته إلى القوائم النشطة.`, `The account "${pendingRestore?.full_name || ''}" will be restored to the active lists.`)}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        open={!!pendingRestore}
        title={tr('استعادة المستخدم', 'Restore user')}
      />
      <ConfirmModal
        confirmLabel={tr('نعم، عطّل الحساب', 'Yes, deactivate')}
        description={tr(`سيتم تعطيل حساب "${pendingDelete?.full_name}". هل تريد المتابعة؟`, `The account "${pendingDelete?.full_name}" will be deactivated. Continue?`)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title={tr('تأكيد تعطيل المستخدم', 'Confirm deactivation')}
        variant="danger"
      />
    </div>
  )
}

export default AdminUsersRolesPage
