import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';

import { AppButton } from './AppButton';
import { theme } from '../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <AppButton label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.action} />
            <AppButton
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.action}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    padding: theme.spacing.screen,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.radiusLg,
    padding: theme.spacing.section,
    gap: theme.spacing.lg,
  },
  title: { color: theme.colors.text, fontSize: theme.typography.size.xl, fontWeight: theme.typography.weight.bold, textAlign: 'right' },
  message: { color: theme.colors.textMuted, fontSize: theme.typography.size.md, textAlign: 'right', lineHeight: theme.typography.lineHeight.md },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { flex: 1 },
});
