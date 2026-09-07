import { MessageSquareMore } from 'lucide-react'
import { useEffect, useState } from 'react'
import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'
import { getServiceName } from '../../utils/servicePresentation'

const STATUS_KEYS = ['new', 'in_review', 'service_exists', 'forwarded', 'resolved', 'closed']

function MissingServiceRequestsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { language, isArabic } = useLanguage()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const statusLabel = (key) => ({
    new: isArabic ? 'جديد' : 'New',
    in_review: isArabic ? 'قيد المراجعة' : 'In review',
    service_exists: isArabic ? 'الخدمة موجودة' : 'Service exists',
    forwarded: isArabic ? 'تم التحويل' : 'Forwarded',
    resolved: isArabic ? 'تم الحل' : 'Resolved',
    closed: isArabic ? 'مغلق' : 'Closed',
  }[key] || key)
  const notGiven = isArabic ? 'غير مذكور' : 'Not given'

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
    return [item.request_number, item.service_name, item.requester_name, item.request_message, item.assigned_to_name]
      .filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch)
  })

  const selectedRequest = filteredRequests.find((item) => item.id === selectedId) || requests.find((item) => item.id === selectedId) || null

  useEffect(() => {
    if (!filteredRequests.length) { setSelectedId(null); setDraft(null); return }
    if (!selectedId || !filteredRequests.some((item) => item.id === selectedId)) setSelectedId(filteredRequests[0].id)
  }, [filteredRequests, selectedId])

  useEffect(() => {
    if (!selectedRequest) { setDraft(null); return }
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
      toast(isArabic ? 'تم تحديث طلب الخدمة.' : 'Service request updated.', 'success')
      reload()
    } catch (saveError) {
      toast(getDisplayError(saveError), 'error')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { key: 'request_number', label: isArabic ? 'الرقم' : 'Reference' },
    { key: 'service_name', label: isArabic ? 'الخدمة المطلوبة' : 'Requested service' },
    { key: 'requester_name', label: isArabic ? 'العميل' : 'Requester' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status', render: (row) => statusLabel(row.status) },
    { key: 'assigned_to_name', label: isArabic ? 'المسؤول' : 'Owner' },
    { key: 'created_at', label: isArabic ? 'الوقت' : 'Time', render: (row) => formatDateTime(row.created_at, language) },
    {
      key: 'action',
      label: isArabic ? 'الإجراء' : 'Action',
      render: (row) => (
        <button
          className={`rounded-full px-4 py-2 text-xs font-bold transition ${row.id === selectedId ? 'bg-brand-700 text-white' : 'border border-brand-200 text-brand-700 hover:bg-brand-50'}`}
          onClick={() => setSelectedId(row.id)}
          type="button"
        >
          {isArabic ? 'فتح' : 'Open'}
        </button>
      ),
    },
  ]

  if (loading && !requests.length) return <LoadingSpinner />
  if (error) return <div className="rounded-[var(--radius-xl)] border border-red-200 bg-red-50 p-6 text-sm font-bold text-danger">{getDisplayError(error)}</div>

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic
          ? 'الرسائل الواردة من مساعد الصفحة الرئيسية. راجع الطلب، عيّن مسؤولاً، اربطه بخدمة موجودة، أو أرسل رد متابعة.'
          : 'Messages coming from the homepage assistant. Review a request, assign an owner, link it to an existing service, or send a follow-up reply.'}
        eyebrow={isArabic ? 'طلبات الخدمات' : 'Service requests'}
        icon={MessageSquareMore}
        title={isArabic ? 'طلبات الخدمات غير الموجودة' : 'Unlisted service requests'}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-4">
          <DataTable
            columns={columns}
            emptyDescription={isArabic ? 'عند إرسال أي طلب خدمة غير موجودة من الصفحة الرئيسية سيظهر هنا.' : 'When someone submits an unlisted service request from the homepage, it will appear here.'}
            emptyTitle={isArabic ? 'لا توجد طلبات حالياً' : 'No requests yet'}
            rows={filteredRequests}
            toolbar={
              <div className="flex flex-col gap-3 md:flex-row">
                <input
                  aria-label={isArabic ? 'بحث' : 'Search'}
                  className="field"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isArabic ? 'ابحث بالرقم أو الخدمة أو اسم العميل' : 'Search by reference, service or requester'}
                  value={search}
                />
                <select aria-label={isArabic ? 'تصفية حسب الحالة' : 'Filter by status'} className="field md:max-w-56" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="">{isArabic ? 'كل الحالات' : 'All statuses'}</option>
                  {STATUS_KEYS.map((key) => <option key={key} value={key}>{statusLabel(key)}</option>)}
                </select>
              </div>
            }
          />
        </section>

        <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
          {!selectedRequest || !draft ? (
            <div className="text-sm font-semibold text-slate-500">{isArabic ? 'اختر طلباً من القائمة لعرض التفاصيل.' : 'Select a request from the list to see its details.'}</div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-black text-brand-600">{selectedRequest.request_number}</p>
                <h2 className="mt-2 text-xl font-black text-ink sm:text-2xl">{selectedRequest.service_name}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{selectedRequest.request_message}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  [isArabic ? 'اسم العميل' : 'Requester', selectedRequest.requester_name || notGiven],
                  [isArabic ? 'قناة التواصل' : 'Contact channel', selectedRequest.preferred_contact_channel || (isArabic ? 'غير محددة' : 'Not set')],
                  [isArabic ? 'الهاتف' : 'Phone', selectedRequest.requester_phone || notGiven],
                  [isArabic ? 'البريد الإلكتروني' : 'Email', selectedRequest.requester_email || notGiven],
                ].map(([label, value]) => (
                  <div className="rounded-[var(--radius-md)] border border-border bg-brand-50/50 p-4 text-sm" key={label}>
                    <p className="font-bold text-ink">{label}</p>
                    <p className="mt-1 text-slate-600">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4">
                <label className="space-y-1.5 text-sm font-bold text-ink">
                  <span>{isArabic ? 'الحالة' : 'Status'}</span>
                  <select className="field" onChange={(e) => setDraft((c) => ({ ...c, status: e.target.value }))} value={draft.status}>
                    {STATUS_KEYS.map((key) => <option key={key} value={key}>{statusLabel(key)}</option>)}
                  </select>
                </label>

                {user?.role === 'admin' ? (
                  <label className="space-y-1.5 text-sm font-bold text-ink">
                    <span>{isArabic ? 'تعيين إلى' : 'Assign to'}</span>
                    <select className="field" onChange={(e) => setDraft((c) => ({ ...c, assigned_to: e.target.value }))} value={draft.assigned_to}>
                      <option value="">{isArabic ? 'بدون تعيين' : 'Unassigned'}</option>
                      {adminUsers.filter((u) => ['admin', 'employee', 'support'].includes(u.role)).map((u) => (
                        <option key={u.id} value={u.id}>{u.full_name}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="space-y-1.5 text-sm font-bold text-ink">
                  <span>{isArabic ? 'ربط بخدمة موجودة' : 'Link to an existing service'}</span>
                  <select className="field" onChange={(e) => setDraft((c) => ({ ...c, matched_service: e.target.value }))} value={draft.matched_service}>
                    <option value="">{isArabic ? 'لا يوجد ربط' : 'No link'}</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{getServiceName(service, language)}</option>)}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm font-bold text-ink">
                  <span>{isArabic ? 'ملاحظات داخلية' : 'Internal notes'}</span>
                  <textarea className="field min-h-24" onChange={(e) => setDraft((c) => ({ ...c, internal_notes: e.target.value }))} value={draft.internal_notes} />
                </label>

                <label className="space-y-1.5 text-sm font-bold text-ink">
                  <span>{isArabic ? 'رسالة الرد أو التوجيه' : 'Reply / routing message'}</span>
                  <textarea className="field min-h-24" onChange={(e) => setDraft((c) => ({ ...c, response_message: e.target.value }))} value={draft.response_message} />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" disabled={saving} onClick={handleSave} type="button">
                  {saving ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : isArabic ? 'حفظ التحديث' : 'Save update'}
                </button>
                <button className="btn-secondary" onClick={reload} type="button">{isArabic ? 'تحديث القائمة' : 'Refresh list'}</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default MissingServiceRequestsPage
