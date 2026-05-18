import { CreditCard, Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 20

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

function Field({ label, children }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  )
}

function PaymentsManagementPage() {
  const { toast } = useToast()
  const [filterStatus, setFilterStatus] = useState('')
  const [filterOrderNumber, setFilterOrderNumber] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const statusForm = useForm({ defaultValues: { status: '', failure_reason: '', notes: '', reference_number: '' } })

  const { data: payments = [], loading, reload } = useAsyncData(
    () => api.getAdminPayments({ status: filterStatus || undefined, order_number: filterOrderNumber || undefined }),
    [filterStatus, filterOrderNumber],
    [],
  )

  const selectedPayment = payments.find((payment) => String(payment.id) === String(selectedPaymentId)) || null

  const total = payments.length
  const paginated = payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function openEditForm(paymentId) {
    setSelectedPaymentId(paymentId)
    statusForm.reset({ status: '', failure_reason: '', notes: '', reference_number: '' })
    setIsFormOpen(true)
  }

  function closeForm() {
    setSelectedPaymentId(null)
    setIsFormOpen(false)
    statusForm.reset({ status: '', failure_reason: '', notes: '', reference_number: '' })
  }

  async function handleStatusUpdate(values) {
    if (!selectedPayment) return
    setSubmitting(true)
    try {
      await api.updateAdminPaymentStatus(selectedPayment.id, values)
      toast('تم تحديث حالة الدفع.', 'success')
      reload()
      closeForm()
    } catch (error) {
      toast(getDisplayError(error), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const toolbar = (
    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="field pr-9 text-sm"
          onChange={(event) => { setFilterOrderNumber(event.target.value); setPage(1) }}
          placeholder="رقم الطلب..."
          value={filterOrderNumber}
        />
      </div>
      <select className="field min-w-44 text-sm" onChange={(event) => { setFilterStatus(event.target.value); setPage(1) }} value={filterStatus}>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )

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
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
          تعديل الحالة
        </button>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description="استعرض سجل الدفعات وحدث حالة أي عملية من نافذة واضحة بدلاً من بطاقة جانبية ضيقة."
        eyebrow="إدارة المدفوعات"
        icon={CreditCard}
        title="المدفوعات"
      />

      <section className="glass-panel p-5">
        <p className="text-sm leading-7 text-slate-600">
          افتح أي دفعة من الجدول لتحديث حالتها أو إضافة المرجع والملاحظات. تم نقل نموذج التعديل إلى نافذة مستقلة حتى تبقى القائمة أسهل في المراجعة والمتابعة.
        </p>
      </section>

      <DataTable
        columns={columns}
        emptyDescription="لا توجد مدفوعات مسجلة بعد أو لا تطابق أي نتيجة المرشحات الحالية."
        emptyTitle="لا توجد مدفوعات"
        loading={loading}
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
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
        toolbar={toolbar}
      />

      <FormModal
        description="حدث الحالة وأضف المرجع أو الملاحظات عند الحاجة. استخدم سبب الفشل فقط للحالات الفاشلة أو الملغاة."
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              إلغاء
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="payment-status-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              تحديث الحالة
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="md"
        title={selectedPayment ? `تعديل ${selectedPayment.payment_number}` : 'تعديل حالة الدفع'}
      >
        {selectedPayment ? (
          <form className="space-y-5" id="payment-status-form" onSubmit={statusForm.handleSubmit(handleStatusUpdate)}>
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm space-y-2">
              <p>رقم الطلب: <span className="font-semibold">{selectedPayment.order_number}</span></p>
              <p>العميل: <span className="font-semibold">{selectedPayment.customer_name}</span></p>
              <p>المبلغ: <span className="font-semibold">{selectedPayment.amount} {selectedPayment.currency}</span></p>
              <p>طريقة الدفع: <span className="font-semibold">{selectedPayment.method_label}</span></p>
            </div>

            <Field label="الحالة الجديدة">
              <select className="field" {...statusForm.register('status', { required: true })}>
                <option value="">اختر الحالة الجديدة</option>
                {statusOptions.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>

            <Field label="المرجع أو رقم الإيصال">
              <input className="field" placeholder="المرجع أو رقم الإيصال" {...statusForm.register('reference_number')} />
            </Field>

            <Field label="ملاحظات">
              <textarea className="field min-h-24" placeholder="ملاحظات إضافية" {...statusForm.register('notes')} />
            </Field>

            <Field label="سبب الفشل">
              <input className="field" placeholder="يستخدم عند الحاجة فقط" {...statusForm.register('failure_reason')} />
            </Field>
          </form>
        ) : null}
      </FormModal>
    </div>
  )
}

export default PaymentsManagementPage
