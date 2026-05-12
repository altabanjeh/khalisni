import { AlertTriangle, Shield, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultUserValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  role: 'customer',
  national_id: '',
  is_active: true,
  is_verified: false,
}

const fallbackRoleOptions = ['customer', 'employee', 'support', 'provider']

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

function canManageUserRecord(user, canManageAdminUsers) {
  if (canManageAdminUsers) return true
  return !user?.is_super_admin && user?.role !== 'admin'
}

function PermissionsPanel({ user, onSaved }) {
  const { data: available = {} } = useAsyncData(() => api.getAvailablePermissions(), [], {})
  const [checked, setChecked] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!user) return
    setChecked(new Set(user.current_permissions || []))
  }, [user])

  function toggle(fullCodename) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(fullCodename)) {
        next.delete(fullCodename)
      } else {
        next.add(fullCodename)
      }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)
    try {
      await api.setUserPermissions(user.id, Array.from(checked))
      setFeedback({ type: 'success', text: 'تم حفظ الصلاحيات.' })
      if (onSaved) onSaved()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    } finally {
      setSaving(false)
    }
  }

  const appEntries = Object.entries(available)

  if (appEntries.length === 0) {
    return (
      <div className="text-sm text-slate-500">جارٍ تحميل الصلاحيات...</div>
    )
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
        {saving ? 'جارٍ الحفظ...' : 'حفظ الصلاحيات'}
      </button>

      {feedback ? (
        <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}

function AdminUsersRolesPage() {
  const { data: users = [], loading, reload } = useAsyncData(() => api.getAdminUsers(), [], [])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('info')
  const [feedback, setFeedback] = useState(null)
  const userForm = useForm({ defaultValues: defaultUserValues })

  const selectedUser = useMemo(
    () => users.find((item) => String(item.id) === String(selectedUserId)) || null,
    [users, selectedUserId],
  )

  const availableRoleOptions = useMemo(
    () => users.find((item) => Array.isArray(item.role_options))?.role_options || fallbackRoleOptions,
    [users],
  )
  const canManageAdminUsers = availableRoleOptions.includes('admin')

  useEffect(() => {
    userForm.reset(
      selectedUser
        ? {
            full_name: selectedUser.full_name || '',
            email: selectedUser.email || '',
            phone: selectedUser.phone || '',
            password: '',
            role: selectedUser.role || 'customer',
            national_id: selectedUser.national_id || '',
            is_active: Boolean(selectedUser.is_active),
            is_verified: Boolean(selectedUser.is_verified),
          }
        : defaultUserValues,
    )
    setActiveTab('info')
    setFeedback(null)
  }, [selectedUser, userForm])

  async function handleUserSubmit(values) {
    try {
      const payload = { ...values }
      if (!payload.password) {
        delete payload.password
      }

      if (selectedUser) {
        await api.updateAdminUser(selectedUser.id, payload)
        setFeedback({ type: 'success', text: 'تم تحديث المستخدم.' })
      } else {
        await api.createAdminUser(payload)
        setFeedback({ type: 'success', text: 'تم إنشاء المستخدم.' })
        userForm.reset(defaultUserValues)
        setSelectedUserId(null)
      }

      reload()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  async function handleDeleteUser(user) {
    if (!canManageUserRecord(user, canManageAdminUsers)) return
    if (!window.confirm('سيتم تعطيل المستخدم. هل تريد المتابعة؟')) return

    try {
      await api.deleteAdminUser(user.id)
      if (String(selectedUserId) === String(user.id)) {
        setSelectedUserId(null)
        userForm.reset(defaultUserValues)
      }
      reload()
      setFeedback({ type: 'success', text: 'تم تعطيل المستخدم.' })
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل المستخدمين...</div>
  }

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
              onClick={() => setSelectedUserId(row.id)}
              type="button"
            >
              تعديل
            </button>
            <button
              className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canManageRecord}
              onClick={() => handleDeleteUser(row)}
              type="button"
            >
              تعطيل
            </button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="إدارة المستخدمين وتعيين الصلاحيات الدقيقة لكل حساب."
        eyebrow="إدارة المستخدمين"
        icon={UsersRound}
        title="المستخدمون والأدوار"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DataTable
          columns={columns}
          emptyDescription="أضف أول مستخدم تشغيلي أو عميل من هذه الشاشة."
          emptyTitle="لا يوجد مستخدمون"
          mobileCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-ink">{row.full_name}</p>
                <StatusBadge status={row.is_active ? 'VERIFIED' : 'REJECTED'} />
              </div>
              <p className="text-sm text-slate-600">{row.email}</p>
              <p className="text-sm text-slate-500">{roleLabels[row.role] || row.role}</p>
            </div>
          )}
          rows={users}
        />

        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-ink">
                {selectedUser ? selectedUser.full_name : 'مستخدم جديد'}
              </h2>
              {selectedUser ? (
                <div className="flex gap-2 rounded-2xl border border-border p-1">
                  <button
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${activeTab === 'info' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`}
                    onClick={() => setActiveTab('info')}
                    type="button"
                  >
                    البيانات
                  </button>
                  <button
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${activeTab === 'perms' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-ink'}`}
                    onClick={() => setActiveTab('perms')}
                    type="button"
                  >
                    الصلاحيات
                  </button>
                </div>
              ) : null}
            </div>

            {activeTab === 'info' || !selectedUser ? (
              <form className="space-y-4" onSubmit={userForm.handleSubmit(handleUserSubmit)}>
                <input className="field" placeholder="الاسم الكامل" {...userForm.register('full_name', { required: true })} />
                <input className="field" placeholder="البريد الإلكتروني" type="email" {...userForm.register('email', { required: true })} />
                <input className="field" placeholder="الهاتف" {...userForm.register('phone')} />
                <input
                  className="field"
                  placeholder={selectedUser ? 'كلمة مرور جديدة إن لزم' : 'كلمة المرور'}
                  type="password"
                  {...userForm.register('password')}
                />
                <select className="field" {...userForm.register('role')}>
                  {availableRoleOptions.map((option) => (
                    <option key={option} value={option}>
                      {roleLabels[option] || option}
                    </option>
                  ))}
                </select>
                <input className="field" placeholder="الرقم الوطني" {...userForm.register('national_id')} />
                <div className="grid gap-3 md:grid-cols-2">
                  <CheckboxField label="الحساب نشط" registration={userForm.register('is_active')} />
                  <CheckboxField label="الحساب موثق" registration={userForm.register('is_verified')} />
                </div>
                <div className="flex gap-3">
                  <button className="btn-primary flex-1" type="submit">
                    {selectedUser ? 'حفظ التعديل' : 'إضافة المستخدم'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedUserId(null)
                      userForm.reset(defaultUserValues)
                    }}
                    type="button"
                  >
                    جديد
                  </button>
                </div>
                {feedback ? (
                  <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>
                    {feedback.text}
                  </p>
                ) : null}
              </form>
            ) : (
              <PermissionsPanel user={selectedUser} onSaved={reload} />
            )}
          </section>

          <section className="glass-panel p-6">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">ملخص الصلاحيات</h2>
                <p className="mt-2 text-sm text-slate-600">
                  اختر مستخدماً من الجدول ثم انتقل إلى تبويب «الصلاحيات» لتعيين الصلاحيات الدقيقة. المدير العادي يمكنه إنشاء العملاء والموظفين والدعم والمزوّدين
                  فقط.
                </p>
              </div>
            </div>
          </section>

          {!canManageAdminUsers ? (
            <section className="glass-panel border-amber-200 bg-amber-50 p-6">
              <div className="flex items-start gap-3">
                <span className="icon-chip bg-white text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-amber-900">تنبيه إداري</h2>
                  <p className="mt-2 text-sm leading-7 text-amber-800">
                    تعديل أو إنشاء مستخدمين بدور «مدير» مقيد في الخلفية على حسابات المدير الأعلى فقط. الشاشة الحالية تعرض الخيارات المسموح بها لحسابك.
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default AdminUsersRolesPage
