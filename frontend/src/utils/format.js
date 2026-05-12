import {
  Ban,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileCheck2,
  PencilLine,
  SearchCheck,
  Send,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react'

export const statusMeta = {
  DRAFT: { label: 'مسودة', className: 'bg-slate-100 text-slate-700', icon: PencilLine },
  NEW: { label: 'جديد', className: 'bg-sky-100 text-sky-800', icon: Send },
  SUBMITTED: { label: 'تم الإرسال', className: 'bg-blue-100 text-blue-700', icon: Send },
  UNDER_REVIEW: { label: 'قيد المراجعة', className: 'bg-amber-100 text-amber-800', icon: SearchCheck },
  WAITING_CUSTOMER: { label: 'مستندات ناقصة', className: 'bg-orange-100 text-orange-800', icon: CircleAlert },
  ASSIGNED: { label: 'تم التعيين', className: 'bg-violet-100 text-violet-700', icon: ShieldCheck },
  IN_PROGRESS: { label: 'قيد التنفيذ', className: 'bg-cyan-100 text-cyan-700', icon: Clock3 },
  WAITING_GOVERNMENT: { label: 'بانتظار جهة حكومية', className: 'bg-amber-50 text-amber-700', icon: TriangleAlert },
  READY_FOR_DELIVERY: { label: 'تم رفع النتيجة', className: 'bg-blue-100 text-blue-700', icon: FileCheck2 },
  COMPLETED: { label: 'مكتمل', className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  VERIFIED: { label: 'تم التحقق', className: 'bg-green-100 text-green-700', icon: ShieldCheck },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'ملغي', className: 'bg-red-100 text-red-700', icon: Ban },
  ARCHIVED: { label: 'مؤرشف', className: 'bg-stone-200 text-stone-700', icon: Ban },
  uploaded: { label: 'مرفوع', className: 'bg-sky-100 text-sky-800', icon: Send },
  pending_review: { label: 'بانتظار التحقق', className: 'bg-amber-100 text-amber-800', icon: SearchCheck },
  approved: { label: 'معتمد', className: 'bg-green-100 text-green-700', icon: ShieldCheck },
  rejected: { label: 'مرفوض', className: 'bg-red-100 text-red-700', icon: XCircle },
}

export function normalizeRole(role) {
  return (role || '').toLowerCase()
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('ar-JO', {
    style: 'currency',
    currency: 'JOD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function formatDate(value) {
  if (!value) return 'غير محدد'
  return new Intl.DateTimeFormat('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return 'غير محدد'
  return new Intl.DateTimeFormat('ar-JO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getStatusLabel(status) {
  return statusMeta[status]?.label || status || 'غير محدد'
}
