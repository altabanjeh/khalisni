import { Text, View, StyleSheet } from 'react-native';

import { AppButton } from './AppButton';
import { theme } from '../theme';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.spacing.radiusLg,
    padding: theme.spacing.section,
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  title: { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.lg },
  description: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, textAlign: 'center' },
});
