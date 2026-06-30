import { Search, Shield, TriangleAlert, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import AdminSoftDeleteModal from '../../components/AdminSoftDeleteModal'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const PAGE_SIZE = 20

const defaultUserValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'employee',
  national_id: '',
  is_active: true,
  is_verified: false,
}

const fallbackRoleOptions = ['employee', 'support', 'provider']

const roleLabels = {
  admin: 'مدير',
  customer: 'عميل',
  employee: 'موظف',
  provider: 'مزود',
  support: 'دعم',
}

const appLabels = {
  orders: 'الطلبات',
  documents: 'الوثائق',
  services: 'الخدمات',
  payment: 'المدفوعات',
  accounts: 'الحسابات',
  notifications: 'الإشعارات',
  providers: 'المزودون',
  audit: 'سجل الأحداث',
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
  const { data: available = {}, loading: permissionsLoading } = useAsyncData(
    () => api.getAvailablePermissions(),
    [],
    {},
  )
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
      toast('تم حفظ الصلاحيات.', 'success')
      if (onSaved) onSaved()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (permissionsLoading) {
    return <div className="text-sm text-slate-500">جارٍ تحميل الصلاحيات...</div>
  }

  const appEntries = Object.entries(available)

  if (appEntries.length === 0) {
    return <div className="text-sm text-slate-500">لا توجد صلاحيات متاحة.</div>
  }

  return (
    <div className="space-y-4">
      {appEntries.map(([app, perms]) => (
        <div key={app}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-600">
            {appLabels[app] || app}
          </p>
          <div className="space-y-2">
            {perms.map((perm) => (
              <label
                key={perm.full_codename}
                className="flex cursor-pointer items-center justify-between rounded-2xl border border-border px-4 py-3 text-sm transition-colors hover:bg-brand-50/40"
              >
                <span className="text-ink">{perm.name}</span>
                <input
                  checked={checked.has(perm.full_codename)}
                  className="h-4 w-4 accent-brand-600"
                  onChange={() => toggle(perm.full_codename)}
                  type="checkbox"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        className="btn-primary w-full disabled:opacity-60"
        disabled={saving}
        onClick={handleSave}
        type="button"
      >
        {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
        حفظ الصلاحيات
      </button>
    </div>
  )
}

function AdminUsersRolesPage() {
  const { toast } = useToast()
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

  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUserId)) || null,
    [users, selectedUserId],
  )

  const availableRoleOptions = useMemo(
    () => users.find((item) => Array.isArray(item.role_options))?.role_options || fallbackRoleOptions,
    [users],
  )
  const formRoleOptions = useMemo(() => {
    if (selectedUser?.role && !availableRoleOptions.includes(selectedUser.role)) {
      return [selectedUser.role, ...availableRoleOptions]
    }
    return availableRoleOptions
  }, [availableRoleOptions, selectedUser?.role])
  const canManageAdminUsers = availableRoleOptions.includes('admin')

  useEffect(() => {
    reset(
      selectedUser
        ? {
            full_name: selectedUser.full_name || '',
            email: selectedUser.email || '',
            phone: selectedUser.phone || '',
            password: '',
            role: selectedUser.role || 'employee',
            national_id: selectedUser.national_id || '',
            is_active: Boolean(selectedUser.is_active),
            is_verified: Boolean(selectedUser.is_verified),
          }
        : defaultUserValues,
    )
  }, [selectedUser, reset])

  function closeForm() {
    setIsFormOpen(false)
    setSelectedUserId(null)
    setActiveTab('info')
    reset(defaultUserValues)
  }

  function openCreateForm() {
    setSelectedUserId(null)
    setActiveTab('info')
    reset(defaultUserValues)
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedUserId(id)
    setActiveTab('info')
    setIsFormOpen(true)
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    )
  })

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  async function handleUserSubmit(values) {
    setSubmitting(true)
    try {
      const payload = { ...values }
      if (!payload.password) delete payload.password

      if (selectedUser) {
        await api.updateAdminUser(selectedUser.id, payload)
        toast('تم تحديث المستخدم.', 'success')
      } else {
        await api.createAdminUser(payload)
        toast('تم إنشاء المستخدم.', 'success')
      }
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm(payload) {
    if (!pendingDelete) return
    const user = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteAdminUser(user.id, payload)
      if (String(selectedUserId) === String(user.id)) closeForm()
      reload()
      toast('تم تعطيل المستخدم.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const toolbar = (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="field pr-9 text-sm"
        onChange={handleSearch}
        placeholder="بحث بالاسم أو البريد أو الهاتف..."
        value={search}
      />
    </div>
  )

  async function handleRestoreConfirm() {
    if (!pendingRestore) return
    const user = pendingRestore
    setPendingRestore(null)
    try {
      await api.restoreAdminUser(user.id)
      reload()
      toast('User restored.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const filtersToolbar = (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
      {toolbar}
      <select className="field text-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
        <option value="active">Active</option>
        <option value="deleted">Deleted</option>
        <option value="all">All</option>
      </select>
    </div>
  )

  const columns = [
    { key: 'full_name', label: 'الاسم' },
    { key: 'email', label: 'البريد الإلكتروني' },
    { key: 'phone', label: 'الهاتف' },
    { key: 'role', label: 'الدور', render: (row) => roleLabels[row.role] || row.role },
    {
      key: 'is_active',
      label: 'الحالة',
      render: (row) => <StatusBadge status={row.is_active ? 'VERIFIED' : 'REJECTED'} />,
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => {
        const canManageRecord = canManageUserRecord(row, canManageAdminUsers)
        return (
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManageRecord}
              onClick={() => openEditForm(row.id)}
              type="button"
            >
              تعديل
            </button>
            <button
              className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManageRecord}
              onClick={() => setPendingDelete(row)}
              type="button"
            >
              تعطيل
            </button>
          </div>
        )
      },
    },
  ]

  const tableColumns = [
    ...columns.slice(0, 3),
    {
      key: 'role_display',
      label: 'Role',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{roleLabels[row.role] || row.role}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              Deleted
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status_display',
      label: 'Status',
      render: (row) => <StatusBadge status={row.is_deleted ? 'REJECTED' : row.is_active ? 'VERIFIED' : 'PENDING_REVIEW'} />,
    },
    {
      key: 'actions_display',
      label: 'Actions',
      render: (row) => {
        const canManageRecord = canManageUserRecord(row, canManageAdminUsers)
        return (
          <div className="flex gap-2">
            {row.is_deleted ? (
              <button
                className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canManageRecord}
                onClick={() => setPendingRestore(row)}
                type="button"
              >
                Restore
              </button>
            ) : (
              <>
                <button
                  className="btn-secondary px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canManageRecord}
                  onClick={() => openEditForm(row.id)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canManageRecord}
                  onClick={() => setPendingDelete(row)}
                  type="button"
                >
                  Delete
                </button>
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
        <p className="text-sm text-slate-500">{roleLabels[row.role] || row.role}</p>
      </div>
    )
  }

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="إدارة المستخدمين التشغيليين وتوزيع الصلاحيات الدقيقة. حسابات العملاء تُنشأ تلقائياً من المسار العام ولا تُنشأ يدوياً من هذه الشاشة."
        eyebrow="إدارة المستخدمين"
        icon={UsersRound}
        title="المستخدمون والأدوار"
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            + مستخدم تشغيلي جديد
          </button>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">إدارة أوضح</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            أصبحت بيانات المستخدم والصلاحيات داخل نافذة مستقلة، بينما بقي الجدول مخصصاً للمراجعة والبحث فقط. هذا يقلل التشتت ويحسن القراءة على الشاشات الصغيرة.
          </p>
        </div>

        {!loading && !canManageAdminUsers ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <span className="icon-chip bg-white text-amber-600">
                <TriangleAlert className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-amber-900">تنبيه إداري</p>
                <p className="mt-2 text-sm leading-7 text-amber-800">
                  إنشاء أو تعديل مستخدمين بدور «مدير» مقيد لحسابات المدير الأعلى فقط. الشاشة الحالية تعرض الخيارات المسموح بها لحسابك.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">ملخص الصلاحيات</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  افتح المستخدم من الجدول ثم انتقل إلى تبويب «الصلاحيات» لتعيين الأذونات الدقيقة لكل تطبيق داخل النظام. حسابات العملاء لا تُنشأ من هذه الشاشة.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <DataTable
        columns={tableColumns}
        emptyDescription="أضف أول مستخدم تشغيلي من هذه الشاشة. حسابات العملاء تُنشأ تلقائياً."
        emptyTitle="لا يوجد مستخدمون"
        loading={loading}
        mobileCard={renderMobileCard}
        mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
        rows={paginated}
        toolbar={filtersToolbar}
      />

      <FormModal
        description={selectedUser ? 'راجع بيانات الحساب أو افتح تبويب الصلاحيات لتوزيع الأذونات التفصيلية.' : 'أدخل بيانات حساب تشغيلي جديد، ويمكنك ضبط الصلاحيات الدقيقة لاحقاً بعد الإنشاء.'}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <div className="text-sm text-slate-500">
              {selectedUser ? `الدور الحالي: ${roleLabels[selectedUser.role] || selectedUser.role}` : 'سيتم إنشاء المستخدم بالحالة النشطة افتراضياً.'}
            </div>
            {activeTab === 'info' || !selectedUser ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button className="btn-secondary" onClick={closeForm} type="button">
                  إلغاء
                </button>
                <button className="btn-primary min-w-40" disabled={submitting} form="admin-user-form" type="submit">
                  {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  {selectedUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                </button>
              </div>
            ) : (
              <button className="btn-secondary" onClick={closeForm} type="button">
                إغلاق
              </button>
            )}
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedUser ? selectedUser.full_name : 'مستخدم جديد'}
      >
        <div className="space-y-6">
          {selectedUser ? (
            <div className="flex gap-2 rounded-2xl border border-border bg-slate-50 p-1">
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'info' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`}
                onClick={() => setActiveTab('info')}
                type="button"
              >
                البيانات
              </button>
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${activeTab === 'perms' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`}
                onClick={() => setActiveTab('perms')}
                type="button"
              >
                الصلاحيات
              </button>
            </div>
          ) : null}

          {activeTab === 'info' || !selectedUser ? (
            <form className="space-y-6" id="admin-user-form" onSubmit={userForm.handleSubmit(handleUserSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الاسم الكامل">
                  <input className="field" placeholder="الاسم الكامل" {...userForm.register('full_name', { required: true })} />
                </Field>
                <Field label="البريد الإلكتروني">
                  <input className="field" placeholder="البريد الإلكتروني" type="email" {...userForm.register('email', { required: true })} />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الهاتف">
                  <input className="field" placeholder="الهاتف" {...userForm.register('phone')} />
                </Field>
                <Field label={selectedUser ? 'كلمة مرور جديدة عند الحاجة' : 'كلمة المرور'}>
                  <input
                    className="field"
                    placeholder={selectedUser ? 'اتركها فارغة للإبقاء على الحالية' : 'كلمة المرور'}
                    type="password"
                    {...userForm.register('password')}
                  />
                </Field>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="الدور">
                  <select className="field" {...userForm.register('role')}>
                    {formRoleOptions.map((option) => (
                      <option key={option} value={option}>{roleLabels[option] || option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="الرقم الوطني">
                  <input className="field" placeholder="الرقم الوطني" {...userForm.register('national_id')} />
                </Field>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-ink">إعدادات الحساب</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField label="الحساب نشط" registration={userForm.register('is_active')} />
                  <CheckboxField label="الحساب موثق" registration={userForm.register('is_verified')} />
                </div>
              </div>
            </form>
          ) : (
            <PermissionsPanel onSaved={reload} user={selectedUser} />
          )}
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel="Restore"
        description={`This will restore "${pendingRestore?.full_name || ''}" back to active admin lists.`}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        open={!!pendingRestore}
        title="Restore user"
      />

      <ConfirmModal
        confirmLabel="نعم، عطّل الحساب"
        description={`سيتم تعطيل حساب "${pendingDelete?.full_name}". هل تريد المتابعة؟`}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title="تأكيد تعطيل المستخدم"
        variant="danger"
      />
    </div>
  )
}

export default AdminUsersRolesPage
