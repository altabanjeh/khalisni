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
import { useLanguage } from '../../context/LanguageContext'
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
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const [statusFilter, setStatusFilter] = useState('active')
  const { data: providers = [], loading, reload } = useAsyncData(() => api.getProviders({ status: statusFilter }), [statusFilter], [])
  const { data: assignments = [], loading: assignmentsLoading } = useAsyncData(() => api.getAdminServiceAssignments(), [], [])
  const { data: categories = [], loading: categoriesLoading } = useAsyncData(() => api.getAdminCategories(), [], [])
  const [selectedProviderId, setSelectedProviderId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
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
        toast(tr('تم تحديث المزود.', 'Provider updated.'), 'success')
      } else {
        await api.createProvider(payload)
        toast(tr('تم إنشاء المزود.', 'Provider created.'), 'success')
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
      toast(nextDecision === 'approve' ? tr('تم اعتماد المزود.', 'Provider approved.') : tr('تم إلغاء اعتماد المزود.', 'Provider approval removed.'), 'success')
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
      toast(isActive ? tr('تم تفعيل الحساب.', 'Account activated.') : tr('تم إيقاف الحساب.', 'Account deactivated.'), 'success')
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
      toast(tr('تم تعطيل المزود.', 'Provider deactivated.'), 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleRestoreConfirm() {
    if (!pendingRestore) return
    const provider = pendingRestore
    setPendingRestore(null)
    try {
      await api.restoreProvider(provider.id)
      reload()
      toast(tr('تم استعادة المزود.', 'Provider restored.'), 'success')
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

  const noCategories = tr('بدون فئات', 'No categories')

  const tableColumns = [
    {
      key: 'provider_display',
      label: tr('المزود', 'Provider'),
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.full_name}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              {tr('محذوف', 'Deleted')}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'provider_type', label: tr('النوع', 'Type') },
    {
      key: 'service_categories',
      label: tr('الفئات', 'Categories'),
      render: (row) => row.service_categories?.join('، ') || noCategories,
    },
    {
      key: 'assigned_services',
      label: tr('الخدمات المسندة', 'Assigned services'),
      render: (row) => assignmentMap[String(row.id)]?.join('، ') || tr('لم يتم ربط خدمات بعد', 'No services linked yet'),
    },
    { key: 'city', label: tr('المدينة', 'City') },
    {
      key: 'is_approved',
      label: tr('الاعتماد', 'Approval'),
      render: (row) => <StatusBadge status={row.is_approved ? 'VERIFIED' : 'PENDING_REVIEW'} />,
    },
    {
      key: 'actions_display',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore(row)} type="button">
              {tr('استعادة', 'Restore')}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                {tr('تعديل', 'Edit')}
              </button>
              <button
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => handleApprovalChange(row, row.is_approved ? 'reject' : 'approve')}
                type="button"
              >
                {row.is_approved ? tr('إلغاء الاعتماد', 'Unapprove') : tr('اعتماد', 'Approve')}
              </button>
              <button
                className="btn-secondary px-3 py-2 text-xs"
                onClick={() => handleActivationChange(row, !row.account_active)}
                type="button"
              >
                {row.account_active ? tr('إيقاف الحساب', 'Deactivate') : tr('تفعيل الحساب', 'Activate')}
              </button>
              <Link className="btn-secondary px-3 py-2 text-xs" to={`/admin/provider-services?provider=${row.id}`}>
                {tr('إدارة الخدمات', 'Manage services')}
              </Link>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete(row)}
                type="button"
              >
                {tr('تعطيل', 'Deactivate')}
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tr(
          'هذه الشاشة مسؤولة عن الإدارة الكاملة للمزود نفسه: إنشاء، تعديل، اعتماد، تفعيل أو تعطيل، مع إبقاء ربط الخدمات في شاشته المتخصصة.',
          'This screen owns full provider account management: create, edit, approve, activate or deactivate, while service assignment stays in its dedicated screen.',
        )}
        eyebrow={tr('إدارة المزودين', 'Provider management')}
        icon={BriefcaseBusiness}
        title={tr('المزودون', 'Providers')}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link className="btn-secondary" to="/admin/provider-services">
              {tr('فتح شاشة خدمات المزودين', 'Open provider services')}
            </Link>
            <button className="btn-primary" onClick={openCreateForm} type="button">
              {isArabic ? '+ مزود جديد' : '+ New provider'}
            </button>
          </div>
        }
      />

      <section className="glass-panel grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <p className="text-sm font-bold text-ink">{tr('إدارة واضحة', 'Clear management')}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {tr(
              'كل ما يخص حساب المزود نفسه موجود هنا: البيانات الأساسية، التصنيف، الاعتماد، وتفعيل الحساب. لم يعد هناك تكرار لهذه الوظائف في شاشة أخرى.',
              'Everything about the provider account lives here: core details, classification, approval and account activation. These functions are no longer duplicated elsewhere.',
            )}
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-slate-50/70 p-5">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{tr('فصل المسؤوليات', 'Separation of concerns')}</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {tr(
                  'ربط الخدمات بالمزود بقي في شاشة مستقلة حتى لا تختلط إدارة الحساب مع إدارة التوزيع التشغيلي.',
                  'Linking services to a provider stays in a separate screen so account management does not mix with operational assignment.',
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <DataTable
        columns={tableColumns}
        emptyDescription={tr('أضف مزود خدمة جديداً ليظهر في مسار التعيين والمراجعة.', 'Add a new service provider so it appears in the assignment and review flow.')}
        emptyTitle={tr('لا يوجد مزودون', 'No providers')}
        loading={loading || assignmentsLoading || categoriesLoading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.full_name}</p>
              <StatusBadge status={row.is_deleted ? 'REJECTED' : row.account_active ? 'VERIFIED' : 'PENDING_REVIEW'} />
            </div>
            <p className="text-sm text-slate-600">{row.provider_type || tr('مزود خدمة', 'Service provider')}</p>
            <p className="text-sm text-slate-500">{row.service_categories?.join('، ') || noCategories}</p>
          </div>
        )}
        mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
        rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
        rows={providers}
        toolbar={
          <select aria-label={tr('تصفية حسب الحالة', 'Filter by status')} className="field max-w-56" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="active">{tr('نشط', 'Active')}</option>
            <option value="deleted">{tr('محذوف', 'Deleted')}</option>
            <option value="all">{tr('الكل', 'All')}</option>
          </select>
        }
      />

      <FormModal
        description={tr(
          'إدارة بيانات المزود وحالته العامة من شاشة واحدة. ربط الخدمات يتم لاحقاً من شاشة خدمات المزودين.',
          'Manage the provider details and overall status from one screen. Service assignment happens later from the provider services screen.',
        )}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {selectedProvider ? (
              <Link className="btn-secondary text-center" to={`/admin/provider-services?provider=${selectedProvider.id}`}>
                {tr('خدمات المزود', 'Provider services')}
              </Link>
            ) : null}
            <button className="btn-secondary" onClick={closeForm} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="provider-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedProvider ? tr('حفظ التعديلات', 'Save changes') : (isArabic ? 'إضافة المزود' : 'Add provider')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="lg"
        title={selectedProvider ? tr(`تعديل المزود: ${selectedProvider.full_name}`, `Edit provider: ${selectedProvider.full_name}`) : tr('مزود جديد', 'New provider')}
      >
        <form className="space-y-5" id="provider-form" onSubmit={providerForm.handleSubmit(handleProviderSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isArabic ? 'الاسم الكامل' : 'Full name'}>
              <input className="field" placeholder={isArabic ? 'الاسم الكامل' : 'Full name'} {...providerForm.register('full_name', { required: true })} />
            </Field>
            <Field label={isArabic ? 'البريد الإلكتروني' : 'Email'}>
              <input className="field" placeholder={isArabic ? 'البريد الإلكتروني' : 'Email'} type="email" {...providerForm.register('email', { required: true })} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isArabic ? 'الهاتف' : 'Phone'}>
              <input className="field" placeholder={isArabic ? 'الهاتف' : 'Phone'} {...providerForm.register('phone', { required: true })} />
            </Field>
            <Field label={selectedProvider ? tr('كلمة مرور جديدة عند الحاجة', 'New password if needed') : (isArabic ? 'كلمة المرور' : 'Password')}>
              <input className="field" placeholder={isArabic ? 'كلمة المرور' : 'Password'} type="password" {...providerForm.register('password')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={isArabic ? 'نوع المزود' : 'Provider type'}>
              <input className="field" placeholder={isArabic ? 'نوع المزود' : 'Provider type'} {...providerForm.register('provider_type', { required: true })} />
            </Field>
            <Field label={isArabic ? 'المدينة' : 'City'}>
              <input className="field" placeholder={isArabic ? 'المدينة' : 'City'} {...providerForm.register('city', { required: true })} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label={tr('اسم الشركة', 'Company name')}>
              <input className="field" {...providerForm.register('company_name')} />
            </Field>
            <Field label={tr('السجل التجاري', 'Commercial registration')}>
              <input className="field" {...providerForm.register('commercial_registration_number')} />
            </Field>
            <Field label={tr('الرقم الضريبي', 'Tax number')}>
              <input className="field" {...providerForm.register('tax_number')} />
            </Field>
            <Field label={tr('العنوان', 'Address')}>
              <input className="field" {...providerForm.register('address')} />
            </Field>
          </div>

          <Field hint={tr('الفئات العامة التي يستطيع المزود تنفيذها', 'The general categories this provider can serve')} label={tr('فئات الخدمات', 'Service categories')}>
            <select
              className="field min-h-40"
              multiple
              {...providerForm.register('service_category_ids')}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {isArabic ? category.name_ar : (category.name_en || category.name_ar)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 md:grid-cols-3">
            <CheckboxField label={tr('متاح للتعيين', 'Available for assignment')} registration={providerForm.register('is_available')} />
            <CheckboxField label={tr('معتمد', 'Approved')} registration={providerForm.register('is_approved')} />
            <CheckboxField label={tr('الحساب نشط', 'Account active')} registration={providerForm.register('account_active')} />
          </div>
        </form>
      </FormModal>

      <ConfirmModal
        confirmLabel={tr('استعادة', 'Restore')}
        description={tr(
          `سيتم استعادة "${pendingRestore?.full_name || ''}" وإعادته إلى شاشات إدارة المزودين.`,
          `This will restore "${pendingRestore?.full_name || ''}" back to provider management screens.`,
        )}
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        open={!!pendingRestore}
        title={tr('استعادة المزود', 'Restore provider')}
      />

      <ConfirmModal
        confirmLabel={tr('نعم، عطّل المزود', 'Yes, deactivate')}
        description={tr(
          `سيتم تعطيل حساب "${pendingDelete?.full_name}" وإخفاؤه من مسارات التعيين.`,
          `The account "${pendingDelete?.full_name}" will be deactivated and hidden from assignment flows.`,
        )}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title={tr('تأكيد تعطيل المزود', 'Confirm provider deactivation')}
        variant="danger"
      />
    </div>
  )
}

export default ProvidersManagementPage
