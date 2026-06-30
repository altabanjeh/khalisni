import { Link2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminSoftDeleteModal from '../../components/AdminSoftDeleteModal'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'

const defaultAssignmentValues = {
  service_id: '',
  provider_id: '',
  is_active: true,
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-border bg-brand-50/40 px-4 py-3 text-sm font-medium text-ink">
      <span>{label}</span>
      <input checked={checked} className="h-4 w-4 accent-brand-600" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
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

function ServiceProviderAssignmentsPage() {
  const { isArabic } = useLanguage()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const providerQuery = searchParams.get('provider') || ''
  const [statusFilter, setStatusFilter] = useState('active')

  const { data: assignments = [], loading, reload } = useAsyncData(
    () => api.getAdminServiceAssignments({ ...(providerQuery ? { provider: providerQuery } : {}), status: statusFilter }),
    [providerQuery, statusFilter],
    [],
  )
  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: providers = [], loading: providersLoading } = useAsyncData(() => api.getProviders(), [], [])

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignmentValues)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [pendingRestore, setPendingRestore] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedAssignment = useMemo(
    () => assignments.find((item) => String(item.id) === String(selectedAssignmentId)) || null,
    [assignments, selectedAssignmentId],
  )

  useEffect(() => {
    if (selectedAssignment) {
      setAssignmentForm({
        service_id: String(selectedAssignment.service_id || ''),
        provider_id: String(selectedAssignment.provider_id || ''),
        is_active: Boolean(selectedAssignment.is_active),
      })
      return
    }
    setAssignmentForm({ ...defaultAssignmentValues, provider_id: providerQuery || '' })
  }, [providerQuery, selectedAssignment])

  function closeForm() {
    setIsFormOpen(false)
    setSelectedAssignmentId(null)
    setAssignmentForm({ ...defaultAssignmentValues, provider_id: providerQuery || '' })
  }

  function openCreateForm() {
    setSelectedAssignmentId(null)
    setAssignmentForm({ ...defaultAssignmentValues, provider_id: providerQuery || '' })
    setIsFormOpen(true)
  }

  function openEditForm(id) {
    setSelectedAssignmentId(id)
    setIsFormOpen(true)
  }

  async function handleAssignmentSave() {
    setSubmitting(true)
    try {
      const payload = {
        service_id: Number(assignmentForm.service_id),
        provider_id: Number(assignmentForm.provider_id),
        is_active: assignmentForm.is_active,
      }
      if (selectedAssignment) {
        await api.updateAdminServiceAssignment(selectedAssignment.id, payload)
        toast(isArabic ? 'تم تحديث الربط.' : 'Assignment updated.', 'success')
      } else {
        await api.createAdminServiceAssignment(payload)
        toast(isArabic ? 'تم ربط الخدمة بالمزود.' : 'Assignment created.', 'success')
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
    const id = pendingDelete.id
    setPendingDelete(null)
    try {
      await api.deleteAdminServiceAssignment(id, payload)
      if (String(selectedAssignmentId) === String(id)) closeForm()
      reload()
      toast(isArabic ? 'تم حذف الربط من المسارات النشطة.' : 'Assignment deleted from active flows.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  async function handleRestoreConfirm() {
    if (!pendingRestore) return
    const id = pendingRestore.id
    setPendingRestore(null)
    try {
      await api.restoreAdminServiceAssignment(id)
      reload()
      toast(isArabic ? 'تمت استعادة الربط.' : 'Assignment restored.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const availableServices = services.filter((service) => !service.is_deleted)
  const selectedProviderName = providers.find((provider) => String(provider.id) === String(providerQuery))?.full_name || ''

  const columns = [
    {
      key: 'provider_name',
      label: isArabic ? 'المزود' : 'Provider',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span>{row.provider_name}</span>
          {row.is_deleted ? (
            <span className="rounded-full border border-danger/20 bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
              {isArabic ? 'محذوف' : 'Deleted'}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'service_name', label: isArabic ? 'الخدمة' : 'Service' },
    { key: 'provider_city', label: isArabic ? 'المدينة' : 'City' },
    {
      key: 'provider_is_approved',
      label: isArabic ? 'الاعتماد' : 'Approval',
      render: (row) => (row.provider_is_approved ? (isArabic ? 'معتمد' : 'Approved') : (isArabic ? 'قيد المراجعة' : 'Pending')),
    },
    {
      key: 'is_active',
      label: isArabic ? 'الحالة' : 'Status',
      render: (row) => {
        if (row.is_deleted) return isArabic ? 'محذوف' : 'Deleted'
        return row.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Inactive')
      },
    },
    {
      key: 'actions',
      label: isArabic ? 'الإجراءات' : 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          {row.is_deleted ? (
            <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setPendingRestore(row)} type="button">
              {isArabic ? 'استعادة' : 'Restore'}
            </button>
          ) : (
            <>
              <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
                {isArabic ? 'تعديل' : 'Edit'}
              </button>
              <button
                className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
                onClick={() => setPendingDelete(row)}
                type="button"
              >
                {isArabic ? 'حذف' : 'Delete'}
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
        description={
          isArabic
            ? 'اختر الخدمات التي يستطيع كل مزود تنفيذها من نافذة واضحة ومنفصلة عن الجدول.'
            : 'Choose which services each provider can perform from a dedicated management screen.'
        }
        eyebrow={isArabic ? 'خدمات المزودين' : 'Provider Services'}
        icon={Link2}
        title={selectedProviderName ? `${isArabic ? 'خدمات' : 'Services for'} ${selectedProviderName}` : (isArabic ? 'ربط الخدمات بالمزودين' : 'Service Provider Assignments')}
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            {isArabic ? '+ ربط جديد' : '+ New assignment'}
          </button>
        }
      />

      <section className="glass-panel p-5">
        <p className="text-sm leading-7 text-slate-600">
          {isArabic
            ? 'هذا الربط يستخدم حذفاً مرناً: يمكن حذف الربط من المسارات التشغيلية ثم استعادته لاحقاً دون فقدان أثر التدقيق.'
            : 'Assignments use soft delete: you can remove them from operational flows and restore them later without losing audit history.'}
        </p>
      </section>

      <DataTable
        columns={columns}
        emptyDescription={isArabic ? 'أضف أول ربط بين مزود وخدمة.' : 'Create the first provider-service assignment.'}
        emptyTitle={isArabic ? 'لا توجد روابط خدمات' : 'No assignments found'}
        loading={loading || servicesLoading || providersLoading}
        mobileCardClassName={(row) => (row.is_deleted ? 'opacity-60 ring-1 ring-danger/20' : '')}
        rowClassName={(row) => (row.is_deleted ? 'opacity-60' : '')}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.provider_name}</p>
              <span className="text-sm text-slate-500">
                {row.is_deleted ? (isArabic ? 'محذوف' : 'Deleted') : row.is_active ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'موقوف' : 'Inactive')}
              </span>
            </div>
            <p className="text-sm text-slate-600">{row.service_name}</p>
            <p className="text-sm text-slate-500">{row.provider_city || (isArabic ? 'بدون مدينة' : 'No city')}</p>
          </div>
        )}
        rows={assignments}
        toolbar={
          <div className="grid gap-3 md:grid-cols-2">
            <select className="field" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">{isArabic ? 'النشطة' : 'Active'}</option>
              <option value="deleted">{isArabic ? 'المحذوفة' : 'Deleted'}</option>
              <option value="all">{isArabic ? 'الكل' : 'All'}</option>
            </select>
          </div>
        }
      />

      <FormModal
        description={
          isArabic
            ? 'حدد المزود والخدمة ثم فعّل الربط إذا كان المزود متاحاً حالياً في مسار التعيين.'
            : 'Choose the provider and service, then enable the assignment when the provider is currently available.'
        }
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} onClick={handleAssignmentSave} type="button">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedAssignment ? (isArabic ? 'حفظ التعديلات' : 'Save changes') : (isArabic ? 'ربط الخدمة' : 'Create assignment')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="md"
        title={selectedAssignment ? (isArabic ? 'تعديل الربط' : 'Edit assignment') : (isArabic ? 'ربط جديد' : 'New assignment')}
      >
        <div className="space-y-5">
          <Field label={isArabic ? 'المزود' : 'Provider'}>
            <select
              className="field"
              value={assignmentForm.provider_id}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, provider_id: event.target.value })}
            >
              <option value="">{isArabic ? 'اختر المزود' : 'Select provider'}</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.full_name}</option>
              ))}
            </select>
          </Field>

          <Field label={isArabic ? 'الخدمة' : 'Service'}>
            <select
              className="field"
              value={assignmentForm.service_id}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, service_id: event.target.value })}
            >
              <option value="">{isArabic ? 'اختر الخدمة' : 'Select service'}</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.id}>{service.name_ar}</option>
              ))}
            </select>
          </Field>

          <CheckboxField
            checked={assignmentForm.is_active}
            label={isArabic ? 'الربط نشط' : 'Assignment is active'}
            onChange={(value) => setAssignmentForm({ ...assignmentForm, is_active: value })}
          />
        </div>
      </FormModal>

      <AdminSoftDeleteModal
        confirmLabel={isArabic ? 'تأكيد الحذف' : 'Confirm delete'}
        description={
          isArabic
            ? `سيتم إخفاء ربط "${pendingDelete?.service_name || ''}" مع "${pendingDelete?.provider_name || ''}" من مسارات التعيين.`
            : `This will hide the assignment of "${pendingDelete?.service_name || ''}" to "${pendingDelete?.provider_name || ''}" from assignment flows.`
        }
        impact={
          isArabic
            ? 'لن يُستخدم هذا الربط في الطلبات الجديدة، بينما تبقى السجلات القديمة محفوظة.'
            : 'The assignment will stop being used for new orders while historical records remain intact.'
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        requireReason
        title={isArabic ? 'حذف الربط' : 'Delete assignment'}
      />

      <ConfirmModal
        confirmLabel={isArabic ? 'استعادة' : 'Restore'}
        description={
          isArabic
            ? 'سيعود الربط إلى مسارات التعيين ويمكن استخدامه مجدداً.'
            : 'This will restore the assignment back into provider selection flows.'
        }
        onClose={() => setPendingRestore(null)}
        onConfirm={handleRestoreConfirm}
        open={!!pendingRestore}
        title={isArabic ? 'استعادة الربط' : 'Restore assignment'}
      />
    </div>
  )
}

export default ServiceProviderAssignmentsPage
