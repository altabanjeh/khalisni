import { BriefcaseBusiness, Link2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
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

function ServiceProviderAssignmentsPage() {
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
  const [assignmentForm, setAssignmentForm] = useState(defaultAssignmentValues)
  const [feedback, setFeedback] = useState(null)

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

    setAssignmentForm({
      ...defaultAssignmentValues,
      provider_id: providerQuery || '',
    })
  }, [providerQuery, selectedAssignment])

  async function handleAssignmentSave() {
    try {
      const payload = {
        service_id: Number(assignmentForm.service_id),
        provider_id: Number(assignmentForm.provider_id),
        is_active: assignmentForm.is_active,
      }

      if (selectedAssignment) {
        await api.updateAdminServiceAssignment(selectedAssignment.id, payload)
        setFeedback({ type: 'success', text: 'تم تحديث خدمة المزود.' })
      } else {
        await api.createAdminServiceAssignment(payload)
        setFeedback({ type: 'success', text: 'تم ربط الخدمة بالمزود.' })
      }

      reload()
      setSelectedAssignmentId(null)
      setAssignmentForm({
        ...defaultAssignmentValues,
        provider_id: providerQuery || '',
      })
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  async function handleDeleteAssignment(id) {
    if (!window.confirm('سيتم إلغاء ربط الخدمة بهذا المزود. هل تريد المتابعة؟')) return

    try {
      await api.deleteAdminServiceAssignment(id)
      if (String(selectedAssignmentId) === String(id)) {
        setSelectedAssignmentId(null)
        setAssignmentForm({
          ...defaultAssignmentValues,
          provider_id: providerQuery || '',
        })
      }
      reload()
      setFeedback({ type: 'success', text: 'تم إلغاء ربط الخدمة.' })
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  if (loading || servicesLoading || providersLoading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل ربط الخدمات بالمزودين...</div>
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
          <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedAssignmentId(row.id)} type="button">
            تعديل
          </button>
          <button
            className="rounded-2xl border border-danger/20 px-3 py-2 text-xs font-semibold text-danger"
            onClick={() => handleDeleteAssignment(row.id)}
            type="button"
          >
            حذف
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="هذه الشاشة مخصصة لاختيار الخدمات التي ينفذها كل مزود. أنشئ المزود أولاً من شاشة المزودين، ثم اربطه بالخدمات المطلوبة هنا."
        eyebrow="خدمات المزودين"
        icon={Link2}
        title={selectedProviderName ? `خدمات ${selectedProviderName}` : 'ربط الخدمات بالمزودين'}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <DataTable
          columns={columns}
          emptyDescription="أضف أول ربط بين مزود وخدمة ليظهر المزود في مسار التعيين الخاص بهذه الخدمة."
          emptyTitle="لا توجد روابط خدمات"
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

        <section className="glass-panel p-6">
          <div className="flex items-start gap-3">
            <span className="icon-chip">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink">{selectedAssignment ? 'تعديل الربط' : 'ربط جديد'}</h2>
              <p className="mt-2 text-sm text-slate-600">اختر المزود ثم الخدمة التي يستطيع تنفيذها. هذا الربط هو الذي يحدد ظهور المزود عند التعيين.</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">المزود</span>
              <select
                className="field"
                value={assignmentForm.provider_id}
                onChange={(event) => setAssignmentForm({ ...assignmentForm, provider_id: event.target.value })}
              >
                <option value="">اختر المزود</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.full_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-ink">الخدمة</span>
              <select
                className="field"
                value={assignmentForm.service_id}
                onChange={(event) => setAssignmentForm({ ...assignmentForm, service_id: event.target.value })}
              >
                <option value="">اختر الخدمة</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name_ar}
                  </option>
                ))}
              </select>
            </label>

            <CheckboxField
              checked={assignmentForm.is_active}
              label="الربط نشط"
              onChange={(value) => setAssignmentForm({ ...assignmentForm, is_active: value })}
            />

            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={handleAssignmentSave} type="button">
                {selectedAssignment ? 'حفظ التعديل' : 'ربط الخدمة'}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setSelectedAssignmentId(null)
                  setAssignmentForm({
                    ...defaultAssignmentValues,
                    provider_id: providerQuery || '',
                  })
                }}
                type="button"
              >
                جديد
              </button>
            </div>

            {feedback ? <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.text}</p> : null}
          </div>
        </section>
      </div>
    </div>
  )
}

export default ServiceProviderAssignmentsPage
