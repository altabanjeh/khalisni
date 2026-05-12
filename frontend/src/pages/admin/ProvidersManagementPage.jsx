import { BriefcaseBusiness, ShieldCheck, UserPlus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultProviderValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  provider_type: '',
  city: '',
  is_available: true,
  is_approved: false,
  account_active: true,
}

function CheckboxField({ label, registration }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input className="h-4 w-4 accent-brand-600" type="checkbox" {...registration} />
    </label>
  )
}

function ProvidersManagementPage() {
  const { data: providers = [], loading, reload } = useAsyncData(() => api.getProviders(), [], [])
  const { data: assignments = [], loading: assignmentsLoading } = useAsyncData(() => api.getAdminServiceAssignments(), [], [])
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const providerForm = useForm({ defaultValues: defaultProviderValues })

  const selectedProvider = useMemo(
    () => providers.find((item) => String(item.id) === String(selectedProviderId)) || null,
    [providers, selectedProviderId],
  )

  useEffect(() => {
    if (!selectedProvider) {
      providerForm.reset(defaultProviderValues)
      return
    }

    providerForm.reset({
      full_name: selectedProvider.full_name || '',
      email: selectedProvider.email || '',
      phone: selectedProvider.phone || '',
      password: '',
      provider_type: selectedProvider.provider_type || '',
      city: selectedProvider.city || '',
      is_available: Boolean(selectedProvider.is_available),
      is_approved: Boolean(selectedProvider.is_approved),
      account_active: selectedProvider.account_active ?? true,
    })
  }, [providerForm, selectedProvider])

  async function handleProviderSubmit(values) {
    try {
      const payload = { ...values }

      if (!payload.password) {
        delete payload.password
      }

      if (selectedProvider) {
        await api.updateProvider(selectedProvider.id, payload)
        setFeedback({ type: 'success', text: 'تم تحديث المزود.' })
      } else {
        await api.createProvider(payload)
        setFeedback({ type: 'success', text: 'تم إنشاء المزود.' })
      }

      reload()
      setSelectedProviderId(null)
      providerForm.reset(defaultProviderValues)
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  if (loading || assignmentsLoading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل بيانات المزودين...</div>
  }

  const assignmentMap = assignments.reduce((accumulator, assignment) => {
    const providerId = String(assignment.provider_id || '')
    if (!providerId || !assignment.service_name) return accumulator
    accumulator[providerId] = accumulator[providerId] || []
    accumulator[providerId].push(assignment.service_name)
    return accumulator
  }, {})

  const columns = [
    { key: 'full_name', label: 'المزود' },
    { key: 'provider_type', label: 'النوع' },
    {
      key: 'assigned_services',
      label: 'الخدمات المسندة',
      render: (row) => assignmentMap[String(row.id)]?.join('، ') || 'لم يتم ربط خدمات بعد',
    },
    { key: 'city', label: 'المدينة' },
    { key: 'rating', label: 'التقييم', render: (row) => row.rating ?? '—' },
    {
      key: 'is_approved',
      label: 'الاعتماد',
      render: (row) => <StatusBadge status={row.is_approved ? 'VERIFIED' : 'PENDING_REVIEW'} />,
    },
    {
      key: 'account_active',
      label: 'الحساب',
      render: (row) => <StatusBadge status={row.account_active ? 'VERIFIED' : 'REJECTED'} />,
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedProviderId(row.id)} type="button">
            تعديل
          </button>
          <Link className="btn-secondary px-3 py-2 text-xs" to={`/admin/provider-services?provider=${row.id}`}>
            إدارة الخدمات
          </Link>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="هذه الشاشة لإنشاء حساب المزود وبياناته الأساسية فقط. اختيار الخدمات التي ينفذها المزود يتم من شاشة مستقلة مخصصة لذلك."
        eyebrow="إدارة المزودين"
        icon={BriefcaseBusiness}
        title="المزودون"
        actions={
          <Link className="btn-primary" to="/admin/provider-services">
            فتح شاشة خدمات المزودين
          </Link>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          columns={columns}
          emptyDescription="أضف مزود خدمة جديداً ليظهر في مسار التعيين والمراجعة."
          emptyTitle="لا يوجد مزودون"
          mobileCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-ink">{row.full_name}</p>
                <StatusBadge status={row.account_active ? 'VERIFIED' : 'REJECTED'} />
              </div>
              <p className="text-sm text-slate-600">{row.provider_type || 'مزود خدمة'}</p>
              <p className="text-sm text-slate-500">{assignmentMap[String(row.id)]?.join('، ') || 'بدون خدمات مسندة'}</p>
            </div>
          )}
          rows={providers}
        />

        <div className="space-y-6">
          <section className="glass-panel p-6">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <UserPlus className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">{selectedProvider ? 'تعديل المزود' : 'مزود جديد'}</h2>
                <p className="mt-2 text-sm text-slate-600">أنشئ حساب المزود هنا، ثم افتح شاشة خدمات المزودين لتحديد ما الذي يستطيع هذا المزود تنفيذه.</p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={providerForm.handleSubmit(handleProviderSubmit)}>
              <input className="field" placeholder="الاسم الكامل" {...providerForm.register('full_name', { required: true })} />
              <input className="field" placeholder="البريد الإلكتروني" type="email" {...providerForm.register('email', { required: true })} />
              <input className="field" placeholder="الهاتف" {...providerForm.register('phone', { required: true })} />
              <input
                className="field"
                placeholder={selectedProvider ? 'كلمة مرور جديدة إن لزم' : 'كلمة المرور'}
                type="password"
                {...providerForm.register('password')}
              />
              <input className="field" placeholder="نوع المزود" {...providerForm.register('provider_type', { required: true })} />
              <input className="field" placeholder="المدينة" {...providerForm.register('city', { required: true })} />
              <div className="grid gap-3 md:grid-cols-3">
                <CheckboxField label="متاح للتعيين" registration={providerForm.register('is_available')} />
                <CheckboxField label="معتمد" registration={providerForm.register('is_approved')} />
                <CheckboxField label="الحساب نشط" registration={providerForm.register('account_active')} />
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" type="submit">
                  {selectedProvider ? 'حفظ التعديل' : 'إضافة المزود'}
                </button>
                {selectedProvider ? (
                  <Link className="btn-secondary" to={`/admin/provider-services?provider=${selectedProvider.id}`}>
                    خدمات المزود
                  </Link>
                ) : null}
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSelectedProviderId(null)
                    providerForm.reset(defaultProviderValues)
                  }}
                  type="button"
                >
                  جديد
                </button>
              </div>
              {feedback ? <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.text}</p> : null}
            </form>
          </section>

          <section className="glass-panel p-6">
            <div className="flex items-start gap-3">
              <span className="icon-chip">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-ink">ملاحظة تشغيلية</h2>
                <p className="mt-2 text-sm text-slate-600">
                  اعتماد المزود وتفعيل الحساب يمكن إدارتهم هنا مباشرة، أما تحديد الخدمات التي ينفذها كل مزود فأصبح في شاشة مستقلة حتى لا يختلط إنشاء المزود مع توزيع
                  الخدمات.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ProvidersManagementPage
