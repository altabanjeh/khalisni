import { Text, View, StyleSheet } from 'react-native';

import { AppButton } from './AppButton';
import { theme } from '../theme';

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>تعذر تحميل البيانات</Text>
      <Text style={styles.description}>{message}</Text>
      {onRetry ? <AppButton label="إعادة المحاولة" onPress={onRetry} /> : null}
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
  title: { color: theme.colors.danger, fontFamily: theme.typography.fontFamily.bold, fontSize: theme.typography.size.lg },
  description: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm, textAlign: 'center' },
});
