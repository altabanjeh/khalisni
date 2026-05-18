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
import { getCurrentLocale, normalizeLanguage } from './i18n'

export const statusMeta = {
  DRAFT: { label: { ar: 'مسودة', en: 'Draft' }, className: 'bg-slate-100 text-slate-700', icon: PencilLine },
  NEW: { label: { ar: 'جديد', en: 'New' }, className: 'bg-sky-100 text-sky-800', icon: Send },
  SUBMITTED: { label: { ar: 'تم الإرسال', en: 'Submitted' }, className: 'bg-blue-100 text-blue-700', icon: Send },
  UNDER_REVIEW: { label: { ar: 'قيد المراجعة', en: 'Under review' }, className: 'bg-amber-100 text-amber-800', icon: SearchCheck },
  WAITING_CUSTOMER: { label: { ar: 'بانتظار العميل', en: 'Waiting for customer' }, className: 'bg-orange-100 text-orange-800', icon: CircleAlert },
  ASSIGNED: { label: { ar: 'تم التعيين', en: 'Assigned' }, className: 'bg-violet-100 text-violet-700', icon: ShieldCheck },
  IN_PROGRESS: { label: { ar: 'قيد التنفيذ', en: 'In progress' }, className: 'bg-cyan-100 text-cyan-700', icon: Clock3 },
  WAITING_GOVERNMENT: { label: { ar: 'بانتظار جهة حكومية', en: 'Waiting for government' }, className: 'bg-amber-50 text-amber-700', icon: TriangleAlert },
  READY_FOR_DELIVERY: { label: { ar: 'جاهز للتسليم', en: 'Ready for delivery' }, className: 'bg-blue-100 text-blue-700', icon: FileCheck2 },
  COMPLETED: { label: { ar: 'مكتمل', en: 'Completed' }, className: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  VERIFIED: { label: { ar: 'تم التحقق', en: 'Verified' }, className: 'bg-green-100 text-green-700', icon: ShieldCheck },
  REJECTED: { label: { ar: 'مرفوض', en: 'Rejected' }, className: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: { ar: 'ملغي', en: 'Cancelled' }, className: 'bg-red-100 text-red-700', icon: Ban },
  ARCHIVED: { label: { ar: 'مؤرشف', en: 'Archived' }, className: 'bg-stone-200 text-stone-700', icon: Ban },
  uploaded: { label: { ar: 'مرفوع', en: 'Uploaded' }, className: 'bg-sky-100 text-sky-800', icon: Send },
  pending_review: { label: { ar: 'بانتظار التحقق', en: 'Pending review' }, className: 'bg-amber-100 text-amber-800', icon: SearchCheck },
  approved: { label: { ar: 'معتمد', en: 'Approved' }, className: 'bg-green-100 text-green-700', icon: ShieldCheck },
  rejected: { label: { ar: 'مرفوض', en: 'Rejected' }, className: 'bg-red-100 text-red-700', icon: XCircle },
}

export function normalizeRole(role) {
  return (role || '').toLowerCase()
}

export function getStatusLabel(status, language) {
  const normalizedLanguage = normalizeLanguage(language)
  const label = statusMeta[status]?.label

  if (typeof label === 'string') return label
  if (label?.[normalizedLanguage]) return label[normalizedLanguage]
  return status || (normalizedLanguage === 'en' ? 'Unknown' : 'غير محدد')
}

export function formatCurrency(value, language) {
  return new Intl.NumberFormat(getCurrentLocale(language), {
    style: 'currency',
    currency: 'JOD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function formatDate(value, language) {
  if (!value) return normalizeLanguage(language) === 'en' ? 'Not set' : 'غير محدد'
  return new Intl.DateTimeFormat(getCurrentLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value, language) {
  if (!value) return normalizeLanguage(language) === 'en' ? 'Not set' : 'غير محدد'
  return new Intl.DateTimeFormat(getCurrentLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}
