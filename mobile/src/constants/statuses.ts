export const orderStatuses = [
  'NEW',
  'UNDER_REVIEW',
  'WAITING_CUSTOMER',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_GOVERNMENT',
  'READY_FOR_DELIVERY',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
  'ARCHIVED',
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const statusLabels: Record<string, string> = {
  NEW: 'جديد',
  UNDER_REVIEW: 'قيد المراجعة',
  WAITING_CUSTOMER: 'بانتظار العميل',
  ASSIGNED: 'مُسند',
  IN_PROGRESS: 'قيد التنفيذ',
  WAITING_GOVERNMENT: 'بانتظار الجهة',
  READY_FOR_DELIVERY: 'جاهز للتسليم',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغي',
  ARCHIVED: 'مؤرشف',
  VERIFIED: 'موثق',
  PENDING: 'معلق',
  FAILED: 'فشل',
  PAID: 'مدفوع',
};
