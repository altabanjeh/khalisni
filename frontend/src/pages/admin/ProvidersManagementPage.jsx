import { BriefcaseBusiness, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultProviderValues = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  provider_type: '',
  company_name: '',
  commercial_registration_number: '',
  tax_number: '',
  city: '',
  address: '',
  service_category_ids: [],
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

function ProvidersManagementPage() {
  const { toast } = useToast()
  const { data: providers = [], loading, reload } = useAsyncData(() => api.getProviders(), [], [])
  const { data: assignments = [], loading: assignmentsLoading } = useAsyncData(() => api.getAdminServiceAssignments(), [], [])
  const { data: categories = [], loading: categoriesLoading } = useAsyncData(() => api.getAdminCategories(), [], [])
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [submitting, setSubmitting] = useState(false)
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
      company_name: selectedProvider.company_name || '',
      commercial_registration_number: selectedProvider.commercial_registration_number || '',
      tax_number: selectedProvider.tax_number || '',
      city: selectedProvider.city || '',
      address: selectedProvider.address || '',
      service_category_ids: (selectedProvider.service_category_ids || []).map(String),
      is_available: Boolean(selectedProvider.is_available),
      is_approved: Boolean(selectedProvider.is_approved),
      account_active: selectedProvider.account_active ?? true,
    })
  }, [providerForm, selectedProvider])

  function closeForm() {
    setIsFormOpen(false)
    setSelectedProviderId(null)
    providerForm.reset(defaultProviderValues)
  }

  function openCreateForm() {
    setSelectedProviderId(null)
    providerForm.reset(defaultProviderValues)
    setIsFormOpen(true)
  }

  function openEditForm(providerId) {
    setSelectedProviderId(providerId)
    setIsFormOpen(true)
  }

  async function handleProviderSubmit(values) {
    setSubmitting(true)
    try {
      const payload = {
        ...values,
        service_category_ids: (values.service_category_ids || []).map(Number),
        is_available: Boolean(values.is_available),
        is_approved: Boolean(values.is_approved),
        account_active: Boolean(values.account_active),
      }

      if (!payload.password) delete payload.password

      if (selectedProvider) {
        await api.updateProvider(selectedProvider.id, payload)
        toast('تم تحديث المزود.', 'success')
      } else {
        await api.createProvider(payload)
        toast('تم إنشاء المزود.', 'success')
      }

      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprovalChange(provider, nextDecision) {
    try {
      await api.updateProviderApproval(provider.id, {
        decision: nextDecision,
        reason: nextDecision === 'reject' ? 'تم إلغاء الاعتماد من شاشة الإدارة.' : '',
      })
      toast(nextDecision === 'approve' ? 'تم اعتماد المزود.' : 'تم إلغاء اعتماد المزود.', 'success')
      reload()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleActivationChange(provider, isActive) {
    try {
      await api.updateProviderActivation(provider.id, {
        is_active: isActive,
        reason: isActive ? '' : 'تم إيقاف الحساب من شاشة الإدارة.',
      })
      toast(isActive ? 'تم تفعيل الحساب.' : 'تم إيقاف الحساب.', 'success')
      reload()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    const provider = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteProvider(provider.id)
      if (String(selectedProviderId) === String(provider.id)) closeForm()
      reload()
      toast('تم تعطيل المزود.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
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
      key: 'service_categories',
      label: 'الفئات',
      render: (row) => row.service_categories?.join('، ') || 'بدون فئات',
    },
    {
      key: 'assigned_services',
      label: 'الخدمات المسندة',
      render: (row) => assignmentMap[String(row.id)]?.join('، ') || 'لم يتم ربط خدمات بعد',
    },
    { key: 'city', label: 'المدينة' },
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
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
            تعديل
          </button>
          <button
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => handleApprovalChange(row, row.is_approved ? 'reject' : 'approve')}
            type="button"
          >
            {row.is_approved ? 'إلغاء الاعتماد' : 'اعتماد'}
          </button>
          <button
            className="btn-secondary px-3 py-2 text-xs"
            onClick={() => handleActivationChange(row, !row.account_active)}
            type="button"
          >
            {row.account_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
          </button>
          <Link className="btn-secondary px-3 py-2 text-xs" to={`/admin/provider-services?provider=${row.id}`}>
            إدارة الخدمات
          </Link>
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

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="هذه الشاشة أصبحت مسؤولة عن CRUD الكامل للمزود نفسه: إنشاء، تعديل، اعتماد، تفعيل أو تعطيل، مع إبقاء ربط الخدمات في شاشته المتخصصة."
        eyebrow="إدارة المزودين"
        icon={BriefcaseBusiness}
        title="المزودون"
        actions={
          <div className="flex flex-wrap gap-3">
            <Link className="btn-secondary" to="/admin/provider-services">
              فتح شاشة خدمات المزودين
            </Link>
            <button className="btn-primary" onClick={openCreateForm} type="button">
              + مزود جديد
            </button>
          </div>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">CRUD واضح</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            كل ما يخص حساب المزود نفسه موجود هنا: البيانات الأساسية، التصنيف، الاعتماد، وتفعيل الحساب. لم يعد هناك تكرار لهذه الوظائف في شاشة أخرى.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">فصل المسؤوليات</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                ربط الخدمات بالمزود بقي في شاشة مستقلة حتى لا تختلط إدارة الحساب مع إدارة التوزيع التشغيلي.
              </p>
            </div>
          </div>
        </div>
      </section>

      <DataTable
        columns={columns}
        emptyDescription="أضف مزود خدمة جديدا ليظهر في مسار التعيين والمراجعة."
        emptyTitle="لا يوجد مزودون"
        loading={loading || assignmentsLoading || categoriesLoading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.full_name}</p>
              <StatusBadge status={row.account_active ? 'VERIFIED' : 'REJECTED'} />
            </div>
            <p className="text-sm text-slate-600">{row.provider_type || 'مزود خدمة'}</p>
            <p className="text-sm text-slate-500">{row.service_categories?.join('، ') || 'بدون فئات'}</p>
          </div>
        )}
        rows={providers}
      />

      <FormModal
        description="إدارة بيانات المزود وحالته العامة من شاشة واحدة. ربط الخدمات يتم لاحقا من شاشة خدمات المزودين."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {selectedProvider ? (
              <Link className="btn-secondary text-center" to={`/admin/provider-services?provider=${selectedProvider.id}`}>
                خدمات المزود
              </Link>
            ) : null}
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="provider-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedProvider ? 'حفظ التعديلات' : 'إضافة المزود'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedProvider ? `تعديل المزود: ${selectedProvider.full_name}` : 'مزود جديد'}
      >
        <form className="space-y-5" id="provider-form" onSubmit={providerForm.handleSubmit(handleProviderSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الاسم الكامل">
              <input className="field" placeholder="الاسم الكامل" {...providerForm.register('full_name', { required: true })} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input className="field" placeholder="البريد الإلكتروني" type="email" {...providerForm.register('email', { required: true })} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="الهاتف">
              <input className="field" placeholder="الهاتف" {...providerForm.register('phone', { required: true })} />
            </Field>
            <Field label={selectedProvider ? 'كلمة مرور جديدة عند الحاجة' : 'كلمة المرور'}>
              <input className="field" placeholder="كلمة المرور" type="password" {...providerForm.register('password')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="نوع المزود">
              <input className="field" placeholder="نوع المزود" {...providerForm.register('provider_type', { required: true })} />
            </Field>
            <Field label="المدينة">
              <input className="field" placeholder="المدينة" {...providerForm.register('city', { required: true })} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="اسم الشركة">
              <input className="field" {...providerForm.register('company_name')} />
            </Field>
            <Field label="السجل التجاري">
              <input className="field" {...providerForm.register('commercial_registration_number')} />
            </Field>
            <Field label="الرقم الضريبي">
              <input className="field" {...providerForm.register('tax_number')} />
            </Field>
            <Field label="العنوان">
              <input className="field" {...providerForm.register('address')} />
            </Field>
          </div>

          <Field hint="الفئات العامة التي يستطيع المزود تنفيذها" label="فئات الخدمات">
            <select
              className="field min-h-40"
              multiple
              {...providerForm.register('service_category_ids')}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name_ar}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 md:grid-cols-3">
            <CheckboxField label="متاح للتعيين" registration={providerForm.register('is_available')} />
            <CheckboxField label="معتمد" registration={providerForm.register('is_approved')} />
            <CheckboxField label="الحساب نشط" registration={providerForm.register('account_active')} />
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        confirmLabel="نعم، عطّل المزود"
        description={`سيتم تعطيل حساب "${pendingDelete?.full_name}" وإخفاؤه من مسارات التعيين.`}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title="تأكيد تعطيل المزود"
        variant="danger"
      />
    </div>
  )
}

export default ProvidersManagementPage
