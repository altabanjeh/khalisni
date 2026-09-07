import { CreditCard, Search } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import DataTable from '../../components/DataTable'
import FormModal from '../../components/FormModal'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 20

const statusOptions = [
  { value: '', label_ar: 'كل الحالات', label_en: 'All statuses' },
  { value: 'pending', label_ar: 'معلق', label_en: 'Pending' },
  { value: 'processing', label_ar: 'قيد المعالجة', label_en: 'Processing' },
  { value: 'paid', label_ar: 'مدفوع', label_en: 'Paid' },
  { value: 'failed', label_ar: 'فشل', label_en: 'Failed' },
  { value: 'refunded', label_ar: 'مسترجع', label_en: 'Refunded' },
  { value: 'partially_refunded', label_ar: 'مسترجع جزئياً', label_en: 'Partially refunded' },
  { value: 'cancelled', label_ar: 'ملغي', label_en: 'Cancelled' },
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
  const { isArabic } = useLanguage()
  const tr = (ar, en) => (isArabic ? ar : en)
  const optionLabel = (option) => (isArabic ? option.label_ar : option.label_en)
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
      toast(tr('تم تحديث حالة الدفع.', 'Payment status updated.'), 'success')
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
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          aria-label={tr('بحث برقم الطلب', 'Search by order number')}
          className="field ps-9 text-sm"
          onChange={(event) => { setFilterOrderNumber(event.target.value); setPage(1) }}
          placeholder={tr('رقم الطلب...', 'Order number…')}
          value={filterOrderNumber}
        />
      </div>
      <select aria-label={tr('تصفية حسب الحالة', 'Filter by status')} className="field min-w-44 text-sm" onChange={(event) => { setFilterStatus(event.target.value); setPage(1) }} value={filterStatus}>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{optionLabel(option)}</option>
        ))}
      </select>
    </div>
  )

  const columns = [
    { key: 'payment_number', label: tr('رقم الدفع', 'Payment #') },
    { key: 'order_number', label: tr('رقم الطلب', 'Order #') },
    { key: 'customer_name', label: tr('العميل', 'Customer') },
    { key: 'payment_type_label', label: tr('النوع', 'Type') },
    { key: 'method_label', label: tr('طريقة الدفع', 'Method') },
    {
      key: 'status',
      label: tr('الحالة', 'Status'),
      render: (row) => <StatusBadge status={statusMap[row.status] || row.status} />,
    },
    {
      key: 'amount',
      label: tr('المبلغ', 'Amount'),
      render: (row) => `${row.amount} ${row.currency || 'JOD'}`,
    },
    { key: 'created_at', label: tr('التاريخ', 'Date'), render: (row) => formatDateTime(row.created_at) },
    {
      key: 'actions',
      label: tr('الإجراءات', 'Actions'),
      render: (row) => (
        <button className="btn-secondary px-3 py-2 text-xs" onClick={() => openEditForm(row.id)} type="button">
          {tr('تعديل الحالة', 'Update status')}
        </button>
      ),
    },
  ]

  return (
    <div className="page-section space-y-6">
      <PageHeader
        description={tr(
          'استعرض سجل الدفعات وحدّث حالة أي عملية من نافذة واضحة بدلاً من بطاقة جانبية ضيقة.',
          'Review the payment log and update any transaction status from a clear dialog instead of a narrow side card.',
        )}
        eyebrow={tr('إدارة المدفوعات', 'Payments management')}
        icon={CreditCard}
        title={tr('المدفوعات', 'Payments')}
      />

      <section className="glass-panel p-5">
        <p className="text-sm leading-7 text-slate-600">
          {tr(
            'افتح أي دفعة من الجدول لتحديث حالتها أو إضافة المرجع والملاحظات. تم نقل نموذج التعديل إلى نافذة مستقلة حتى تبقى القائمة أسهل في المراجعة والمتابعة.',
            'Open any payment from the table to update its status or add a reference and notes. The edit form moved to a dedicated dialog so the list stays easy to review and follow.',
          )}
        </p>
      </section>

      <DataTable
        columns={columns}
        emptyDescription={tr('لا توجد مدفوعات مسجلة بعد أو لا تطابق أي نتيجة المرشحات الحالية.', 'No payments recorded yet, or none match the current filters.')}
        emptyTitle={tr('لا توجد مدفوعات', 'No payments')}
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
        description={tr(
          'حدّث الحالة وأضف المرجع أو الملاحظات عند الحاجة. استخدم سبب الفشل فقط للحالات الفاشلة أو الملغاة.',
          'Update the status and add a reference or notes when needed. Use the failure reason only for failed or cancelled states.',
        )}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="btn-secondary" onClick={closeForm} type="button">
              {tr('إلغاء', 'Cancel')}
            </button>
            <button className="btn-primary min-w-40" disabled={submitting} form="payment-status-form" type="submit">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {tr('تحديث الحالة', 'Update status')}
            </button>
          </div>
        }
        onClose={closeForm}
        open={isFormOpen}
        size="md"
        title={selectedPayment ? tr(`تعديل ${selectedPayment.payment_number}`, `Edit ${selectedPayment.payment_number}`) : tr('تعديل حالة الدفع', 'Edit payment status')}
      >
        {selectedPayment ? (
          <form className="space-y-5" id="payment-status-form" onSubmit={statusForm.handleSubmit(handleStatusUpdate)}>
            <div className="rounded-3xl border border-border bg-slate-50 p-4 text-sm space-y-2">
              <p>{tr('رقم الطلب:', 'Order number:')} <span className="font-semibold">{selectedPayment.order_number}</span></p>
              <p>{tr('العميل:', 'Customer:')} <span className="font-semibold">{selectedPayment.customer_name}</span></p>
              <p>{tr('المبلغ:', 'Amount:')} <span className="font-semibold">{selectedPayment.amount} {selectedPayment.currency}</span></p>
              <p>{tr('طريقة الدفع:', 'Payment method:')} <span className="font-semibold">{selectedPayment.method_label}</span></p>
            </div>

            <Field label={tr('الحالة الجديدة', 'New status')}>
              <select className="field" {...statusForm.register('status', { required: true })}>
                <option value="">{tr('اختر الحالة الجديدة', 'Select the new status')}</option>
                {statusOptions.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>{optionLabel(option)}</option>
                ))}
              </select>
            </Field>

            <Field label={tr('المرجع أو رقم الإيصال', 'Reference or receipt number')}>
              <input className="field" placeholder={tr('المرجع أو رقم الإيصال', 'Reference or receipt number')} {...statusForm.register('reference_number')} />
            </Field>

            <Field label={tr('ملاحظات', 'Notes')}>
              <textarea className="field min-h-24" placeholder={tr('ملاحظات إضافية', 'Additional notes')} {...statusForm.register('notes')} />
            </Field>

            <Field label={tr('سبب الفشل', 'Failure reason')}>
              <input className="field" placeholder={tr('يستخدم عند الحاجة فقط', 'Used only when needed')} {...statusForm.register('failure_reason')} />
            </Field>
          </form>
        ) : null}
      </FormModal>
    </div>
  )
}

export default PaymentsManagementPage
