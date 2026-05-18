import { Text, View, StyleSheet } from 'react-native';

import { AppCard } from './AppCard';
import { theme } from '../theme';

export function MetricCard({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <AppCard style={styles.card}>
      <Text style={styles.value}>{value ?? 0}</Text>
      <Text style={styles.label}>{label}</Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    gap: theme.spacing.sm,
  },
  value: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.size.xl,
    fontFamily: theme.typography.fontFamily.extraBold,
    textAlign: 'right',
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily.regular,
  },
});
