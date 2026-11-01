import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';
import { theme } from '../theme';

/** "محذوف" badge for a soft-deleted row. */
export function DeletedBadge({ deletedReason }: { deletedReason?: string | null }) {
  return (
    <View style={styles.badgeRow}>
      <View style={styles.badge} accessibilityLabel="سجل محذوف">
        <Text style={styles.badgeLabel}>محذوف</Text>
      </View>
      {deletedReason ? <Text style={styles.reason}>السبب: {deletedReason}</Text> : null}
    </View>
  );
}

interface SoftDeleteRowActionsProps {
  recordName: string;
  isDeleted: boolean;
  onDelete: () => void;
  onRestore: () => void;
  deleteLabel?: string;
  restoreLabel?: string;
  // Per-row rule (e.g. an admin who cannot manage admin accounts).
  disabled?: boolean;
}

/** Delete on live rows, restore on deleted ones; both 44pt+ targets. */
export function SoftDeleteRowActions({
  recordName,
  isDeleted,
  onDelete,
  onRestore,
  deleteLabel = 'حذف',
  restoreLabel = 'استعادة',
  disabled = false,
}: SoftDeleteRowActionsProps) {
  return (
    <View style={styles.actions}>
      {isDeleted ? (
        <AppButton
          label={restoreLabel}
          variant="secondary"
          onPress={onRestore}
          disabled={disabled}
          accessibilityLabel={`${restoreLabel}: ${recordName}`}
          accessibilityHint="يعيد السجل إلى القوائم النشطة"
          style={styles.button}
        />
      ) : (
        <AppButton
          label={deleteLabel}
          variant="danger"
          onPress={onDelete}
          disabled={disabled}
          accessibilityLabel={`${deleteLabel}: ${recordName}`}
          accessibilityHint="يفتح نافذة تأكيد تطلب السبب وكلمة المرور"
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row-reverse', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  button: { minHeight: 44, minWidth: 110 },
  badgeRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    borderColor: `${theme.colors.danger}33`,
    backgroundColor: `${theme.colors.danger}18`,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeLabel: { color: theme.colors.danger, fontSize: theme.typography.size.xs, fontFamily: theme.typography.fontFamily.bold },
  reason: {
    flexShrink: 1,
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'right',
  },
});
