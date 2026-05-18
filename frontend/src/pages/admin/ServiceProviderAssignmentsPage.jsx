import { Link2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ConfirmModal from '../../components/ConfirmModal'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
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
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const providerQuery = searchParams.get('provider') || ''

  const { data: assignments = [], loading, reload } = useAsyncData(
    () => api.getAdminServiceAssignments(providerQuery ? { provider: providerQuery } : {}),
    [providerQuery],
    [],
  )
  const { data: services = [], loading: servicesLoading } = useAsyncData(() => api.getAdminServices(), [], [])
  const { data: providers = [], loading: providersLoading } = useAsyncData(() => api.getProviders(), [], [])

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignmentValues)
  const [pendingDelete, setPendingDelete] = useState(null)
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
        toast('تم تحديث ربط الخدمة بالمزود.', 'success')
      } else {
        await api.createAdminServiceAssignment(payload)
        toast('تم ربط الخدمة بالمزود.', 'success')
      }
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDelete) return
    const id = pendingDelete
    setPendingDelete(null)
    try {
      await api.deleteAdminServiceAssignment(id)
      if (String(selectedAssignmentId) === String(id)) closeForm()
      reload()
      toast('تم إلغاء ربط الخدمة.', 'success')
    } catch (error) {
      toast(getDisplayError(error), 'error')
    }
  }

  const selectedProviderName = providers.find((provider) => String(provider.id) === String(providerQuery))?.full_name || ''

  const columns = [
    { key: 'provider_name', label: 'المزود' },
    { key: 'service_name', label: 'الخدمة' },
    { key: 'provider_city', label: 'المدينة' },
    { key: 'provider_is_approved', label: 'الاعتماد', render: (row) => (row.provider_is_approved ? 'معتمد' : 'قيد المراجعة') },
    { key: 'is_active', label: 'الحالة', render: (row) => (row.is_active ? 'نشط' : 'موقوف') },
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
            onClick={() => setPendingDelete(row.id)}
            type="button"
          >
            حذف
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="اختر الخدمات التي يستطيع كل مزود تنفيذها من نافذة واضحة ومنفصلة عن الجدول."
        eyebrow="خدمات المزودين"
        icon={Link2}
        title={selectedProviderName ? `خدمات ${selectedProviderName}` : 'ربط الخدمات بالمزودين'}
        actions={
          <button className="btn-primary" onClick={openCreateForm} type="button">
            + ربط جديد
          </button>
        }
      />

      <section className="glass-panel p-5">
        <p className="text-sm leading-7 text-slate-600">
          أنشئ المزود أولاً من شاشة المزودين، ثم اربطه بالخدمات المناسبة هنا. أصبح الربط يفتح في نافذة مستقلة حتى يبقى الجدول واضحاً ويمكن مراجعة الروابط الحالية بسرعة.
        </p>
      </section>

      <DataTable
        columns={columns}
        emptyDescription="أضف أول ربط بين مزود وخدمة ليظهر المزود في مسار التعيين الخاص بهذه الخدمة."
        emptyTitle="لا توجد روابط خدمات"
        loading={loading || servicesLoading || providersLoading}
        mobileCard={(row) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-ink">{row.provider_name}</p>
              <span className="text-sm text-slate-500">{row.is_active ? 'نشط' : 'موقوف'}</span>
            </div>
            <p className="text-sm text-slate-600">{row.service_name}</p>
            <p className="text-sm text-slate-500">{row.provider_city || 'بدون مدينة'}</p>
          </div>
        )}
        rows={assignments}
      />

      <FormModal
        description="حدد المزود والخدمة، ثم فعّل الربط إذا كان المزود متاحاً حالياً في مسار التعيين."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} onClick={handleAssignmentSave} type="button">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {selectedAssignment ? 'حفظ التعديلات' : 'ربط الخدمة'}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="md"
        title={selectedAssignment ? 'تعديل الربط' : 'ربط جديد'}
      >
        <div className="space-y-5">
          <Field label="المزود">
            <select
              className="field"
              value={assignmentForm.provider_id}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, provider_id: event.target.value })}
            >
              <option value="">اختر المزود</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.full_name}</option>
              ))}
            </select>
          </Field>

          <Field label="الخدمة">
            <select
              className="field"
              value={assignmentForm.service_id}
              onChange={(event) => setAssignmentForm({ ...assignmentForm, service_id: event.target.value })}
            >
              <option value="">اختر الخدمة</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name_ar}</option>
              ))}
            </select>
          </Field>

          <CheckboxField
            checked={assignmentForm.is_active}
            label="الربط نشط"
            onChange={(value) => setAssignmentForm({ ...assignmentForm, is_active: value })}
          />
        </div>
      </FormModal>

      <ConfirmModal
        confirmLabel="نعم، ألغِ الربط"
        description="سيتم إلغاء ربط هذه الخدمة بالمزود. هل تريد المتابعة؟"
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        open={!!pendingDelete}
        title="تأكيد إلغاء الربط"
        variant="danger"
      />
    </div>
  )
}

export default ServiceProviderAssignmentsPage
