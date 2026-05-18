import { colors } from '../theme/colors';
import { statusLabels } from '../constants/statuses';

export function getStatusLabel(status?: string | null) {
  if (!status) return 'غير معروف';
  return statusLabels[status] ?? status.replace(/_/g, ' ');
}

export function getStatusColor(status?: string | null) {
  if (!status) return colors.textMuted;
  return colors.status[status as keyof typeof colors.status] ?? colors.primary;
}
