import { MessageSquareMore } from 'lucide-react'
import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const statusLabels = {
  new: 'جديد',
  in_review: 'قيد المراجعة',
  service_exists: 'الخدمة موجودة',
  forwarded: 'تم التحويل',
  resolved: 'تم الحل',
  closed: 'مغلق',
}

const statusOptions = Object.entries(statusLabels)

function MissingServiceRequestsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const { data: requests = [], loading, error, reload } = useAsyncData(
    () => api.getMissingServiceRequests(statusFilter ? { status: statusFilter } : {}),
    [statusFilter],
    [],
  )
  const { data: services = [] } = useAsyncData(() => api.getServices(), [], [])
  const { data: adminUsers = [] } = useAsyncData(
    () => (user?.role === 'admin' ? api.getAdminUsers() : Promise.resolve([])),
    [user?.role],
    [],
  )

  const normalizedSearch = search.trim().toLowerCase()
  const filteredRequests = requests.filter((item) => {
    if (!normalizedSearch) return true
    return [
      item.request_number,
      item.service_name,
      item.requester_name,
      item.request_message,
      item.assigned_to_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch)
  })

  const selectedRequest = filteredRequests.find((item) => item.id === selectedId) || requests.find((item) => item.id === selectedId) || null

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedId(null)
      setDraft(null)
      return
    }
    if (!selectedId || !filteredRequests.some((item) => item.id === selectedId)) {
      setSelectedId(filteredRequests[0].id)
    }
  }, [filteredRequests, selectedId])

  useEffect(() => {
    if (!selectedRequest) {
      setDraft(null)
      return
    }
    setDraft({
      status: selectedRequest.status || 'new',
      assigned_to: selectedRequest.assigned_to || '',
      matched_service: selectedRequest.matched_service || '',
      internal_notes: selectedRequest.internal_notes || '',
      response_message: selectedRequest.response_message || '',
    })
  }, [selectedRequest])

  async function handleSave() {
    if (!selectedRequest || !draft) return
    setSaving(true)
    try {
      await api.updateMissingServiceRequest(selectedRequest.id, {
        status: draft.status,
        assigned_to: draft.assigned_to || null,
        matched_service: draft.matched_service || null,
        internal_notes: draft.internal_notes,
        response_message: draft.response_message,
      })
      toast('تم تحديث طلب الخدمة بنجاح.', 'success')
      reload()
    } catch (saveError) {
      toast(getDisplayError(saveError), 'error')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'request_number', label: 'الرقم' },
    { key: 'service_name', label: 'الخدمة المطلوبة' },
    { key: 'requester_name', label: 'العميل' },
    { key: 'status', label: 'الحالة', render: (row) => statusLabels[row.status] || row.status },
    { key: 'assigned_to_name', label: 'المسؤول' },
    { key: 'created_at', label: 'الوقت', render: (row) => formatDateTime(row.created_at) },
    {
      key: 'action',
      label: 'الإجراء',
      render: (row) => (
        <button
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${
            row.id === selectedId ? 'bg-brand-700 text-white' : 'border border-brand-200 text-brand-700 hover:bg-brand-50'
          }`}
          onClick={() => setSelectedId(row.id)}
          type="button"
        >
          فتح
        </button>
      ),
    },
  ]

  if (loading && !requests.length) {
    return <LoadingSpinner />
  }

  if (error) {
    return <div className="glass-panel p-6 text-sm text-danger">{getDisplayError(error)}</div>
  }

  return (
    <div className="page-section">
      <PageHeader
        title="طلبات الخدمات غير الموجودة"
        eyebrow="SERVICE REQUEST WORKFLOW"
        icon={MessageSquareMore}
        description="هذه القائمة تستقبل الرسائل القادمة من مساعد الصفحة الرئيسية. يمكن للإدارة أو فريق الدعم مراجعة الطلب، تعيين مسؤول، ربطه بخدمة موجودة، أو إرسال رد متابعة."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <DataTable
            columns={columns}
            emptyTitle="لا توجد طلبات حالياً"
            emptyDescription="عند إرسال أي طلب خدمة غير موجودة من الصفحة الرئيسية سيظهر هنا."
            rows={filteredRequests}
            toolbar={
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  className="field"
                  placeholder="ابحث بالرقم أو اسم الخدمة أو اسم العميل"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select className="field md:max-w-56" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">كل الحالات</option>
                  {statusOptions.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            }
          />
        </section>

        <section className="glass-panel p-6">
          {!selectedRequest || !draft ? (
            <div className="text-sm text-slate-500">اختر طلباً من القائمة لعرض التفاصيل.</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold text-brand-700">{selectedRequest.request_number}</p>
                <h2 className="mt-2 text-2xl font-extrabold text-ink">{selectedRequest.service_name}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{selectedRequest.request_message}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-brand-50/50 p-4 text-sm">
                  <p className="font-bold text-ink">اسم العميل</p>
                  <p className="mt-1 text-slate-600">{selectedRequest.requester_name || 'غير مذكور'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-brand-50/50 p-4 text-sm">
                  <p className="font-bold text-ink">قناة التواصل</p>
                  <p className="mt-1 text-slate-600">{selectedRequest.preferred_contact_channel || 'غير محددة'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-brand-50/50 p-4 text-sm">
                  <p className="font-bold text-ink">الهاتف</p>
                  <p className="mt-1 text-slate-600">{selectedRequest.requester_phone || 'غير مذكور'}</p>
                </div>
                <div className="rounded-2xl border border-border bg-brand-50/50 p-4 text-sm">
                  <p className="font-bold text-ink">البريد الإلكتروني</p>
                  <p className="mt-1 text-slate-600">{selectedRequest.requester_email || 'غير مذكور'}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>الحالة</span>
                  <select
                    className="field"
                    value={draft.status}
                    onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                  >
                    {statusOptions.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                {user?.role === 'admin' ? (
                  <label className="space-y-2 text-sm font-semibold text-ink">
                    <span>تعيين إلى</span>
                    <select
                      className="field"
                      value={draft.assigned_to}
                      onChange={(event) => setDraft((current) => ({ ...current, assigned_to: event.target.value }))}
                    >
                      <option value="">بدون تعيين</option>
                      {adminUsers
                        .filter((staffUser) => ['admin', 'employee', 'support'].includes(staffUser.role))
                        .map((staffUser) => (
                          <option key={staffUser.id} value={staffUser.id}>{staffUser.full_name}</option>
                        ))}
                    </select>
                  </label>
                ) : null}

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>ربط بخدمة موجودة</span>
                  <select
                    className="field"
                    value={draft.matched_service}
                    onChange={(event) => setDraft((current) => ({ ...current, matched_service: event.target.value }))}
                  >
                    <option value="">لا يوجد ربط</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>{service.name_ar}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>ملاحظات داخلية</span>
                  <textarea
                    className="field min-h-28"
                    value={draft.internal_notes}
                    onChange={(event) => setDraft((current) => ({ ...current, internal_notes: event.target.value }))}
                  />
                </label>

                <label className="space-y-2 text-sm font-semibold text-ink">
                  <span>رسالة الرد أو التوجيه</span>
                  <textarea
                    className="field min-h-28"
                    value={draft.response_message}
                    onChange={(event) => setDraft((current) => ({ ...current, response_message: event.target.value }))}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={saving} onClick={handleSave} type="button">
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التحديث'}
                </button>
                <button className="btn-secondary" onClick={reload} type="button">
                  تحديث القائمة
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default MissingServiceRequestsPage
