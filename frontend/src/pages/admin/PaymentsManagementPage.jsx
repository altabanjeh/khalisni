import { CreditCard } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const statusOptions = [
  { value: '', label: 'كل الحالات' },
  { value: 'pending', label: 'معلق' },
  { value: 'processing', label: 'قيد المعالجة' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'failed', label: 'فشل' },
  { value: 'refunded', label: 'مسترجع' },
  { value: 'partially_refunded', label: 'مسترجع جزئياً' },
  { value: 'cancelled', label: 'ملغي' },
]

const statusMap = {
  pending: 'PENDING_REVIEW',
  processing: 'UNDER_REVIEW',
  paid: 'COMPLETED',
  failed: 'REJECTED',
  refunded: 'CANCELLED',
  partially_refunded: 'WAITING_CUSTOMER',
  cancelled: 'CANCELLED',
}

function PaymentsManagementPage() {
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const statusForm = useForm({ defaultValues: { status: '', failure_reason: '', notes: '', reference_number: '' } })

  const { data: payments = [], loading, reload } = useAsyncData(
    () => api.getAdminPayments({ status: filterStatus || undefined, order_number: filterOrderNumber || undefined }),
    [filterStatus, filterOrderNumber],
    [],
  )

  const selectedPayment = payments.find((p) => String(p.id) === String(selectedPaymentId)) || null

  async function handleStatusUpdate(values) {
    if (!selectedPayment) return
    try {
      await api.updateAdminPaymentStatus(selectedPayment.id, values)
      setFeedback({ type: 'success', text: 'تم تحديث حالة الدفع.' })
      reload()
      setSelectedPaymentId(null)
      statusForm.reset()
    } catch (error) {
      setFeedback({ type: 'error', text: getDisplayError(error) })
    }
  }

  const columns = [
    { key: 'payment_number', label: 'رقم الدفع' },
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'customer_name', label: 'العميل' },
    { key: 'payment_type_label', label: 'النوع' },
    { key: 'method_label', label: 'طريقة الدفع' },
    {
      key: 'status',
      label: 'الحالة',
      render: (row) => <StatusBadge status={statusMap[row.status] || row.status} />,
    },
    {
      key: 'amount',
      label: 'المبلغ',
      render: (row) => `${row.amount} ${row.currency || 'JOD'}`,
    },
    { key: 'created_at', label: 'التاريخ', render: (row) => formatDateTime(row.created_at) },
    {
      key: 'actions',
      label: 'الإجراءات',
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setSelectedPaymentId(row.id)} type="button">
          تعديل الحالة
        </button>
      ),
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="استعرض سجلات الدفع للطلبات وحدّث الحالة أو أضف ملاحظات عند الحاجة."
        eyebrow="إدارة المدفوعات"
        icon={CreditCard}
        title="المدفوعات"
      />

      <div className="mb-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <input
          className="field"
          placeholder="رقم الطلب"
          value={filterOrderNumber}
          onChange={(e) => setFilterOrderNumber(e.target.value)}
        />
        <select className="field min-w-44" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        {loading ? (
          <div className="glass-panel p-6 text-sm text-slate-500">جارٍ تحميل المدفوعات...</div>
        ) : (
          <DataTable
            columns={columns}
            emptyDescription="لا توجد مدفوعات مسجلة بعد أو لا تطابق أي نتيجة المرشحات الحالية."
            emptyTitle="لا توجد مدفوعات"
            mobileCard={(row) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-ink">{row.payment_number}</p>
                  <StatusBadge status={statusMap[row.status] || row.status} />
                </div>
                <p className="text-sm text-slate-600">{row.order_number} — {row.customer_name}</p>
                <p className="text-sm font-medium text-ink">{row.amount} {row.currency || 'JOD'}</p>
              </div>
            )}
            rows={payments}
          />
        )}

        <section className="glass-panel p-6">
          <h2 className="text-xl font-bold text-ink">{selectedPayment ? `تعديل ${selectedPayment.payment_number}` : 'اختر دفعة لتعديل حالتها'}</h2>
          {selectedPayment ? (
            <form className="mt-6 space-y-4" onSubmit={statusForm.handleSubmit(handleStatusUpdate)}>
              <div className="rounded-3xl border border-border bg-white p-4 text-sm space-y-1">
                <p>رقم الطلب: <span className="font-semibold">{selectedPayment.order_number}</span></p>
                <p>العميل: <span className="font-semibold">{selectedPayment.customer_name}</span></p>
                <p>المبلغ: <span className="font-semibold">{selectedPayment.amount} {selectedPayment.currency}</span></p>
                <p>طريقة الدفع: <span className="font-semibold">{selectedPayment.method_label}</span></p>
              </div>
              <select className="field" {...statusForm.register('status', { required: true })}>
                <option value="">اختر الحالة الجديدة</option>
                {statusOptions.filter((o) => o.value).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input className="field" placeholder="المرجع أو رقم الإيصال" {...statusForm.register('reference_number')} />
              <textarea className="field min-h-20" placeholder="ملاحظات (اختياري)" {...statusForm.register('notes')} />
              <input className="field" placeholder="سبب الفشل (إن وجد)" {...statusForm.register('failure_reason')} />
              <div className="flex gap-3">
                <button className="btn-primary flex-1" type="submit">
                  تحديث الحالة
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setSelectedPaymentId(null); statusForm.reset() }}
                  type="button"
                >
                  إلغاء
                </button>
              </div>
              {feedback ? <p className={`text-sm ${feedback.type === 'error' ? 'text-danger' : 'text-success'}`}>{feedback.text}</p> : null}
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">انقر على "تعديل الحالة" في أي صف لفتح نموذج التحديث هنا.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default PaymentsManagementPage
