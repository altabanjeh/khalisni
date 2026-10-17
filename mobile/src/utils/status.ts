import { colors } from '../theme/colors';
import { statusLabels } from '../constants/statuses';

export function getStatusLabel(status?: string | null) {
  if (!status) return 'غير معروف';
  // The app is Arabic only: an unknown code is never shown as English text.
  return statusLabels[status] ?? statusLabels[status.toUpperCase()] ?? statusLabels[status.toLowerCase()] ?? 'حالة غير معروفة';
}

export function getStatusColor(status?: string | null) {
  if (!status) return colors.textMuted;
  const documentColors: Record<string, string> = {
    approved: colors.status.COMPLETED,
    safe: colors.status.COMPLETED,
    rejected: colors.status.REJECTED,
    unsafe: colors.status.REJECTED,
    pending_review: colors.status.WAITING_CUSTOMER,
    pending_scan: colors.status.WAITING_CUSTOMER,
    archived: colors.status.ARCHIVED,
    not_uploaded: colors.status.ARCHIVED,
  };
  return colors.status[status as keyof typeof colors.status] ?? documentColors[status] ?? colors.primary;
}
