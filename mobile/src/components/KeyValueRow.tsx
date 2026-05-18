import { Text, View, StyleSheet } from 'react-native';

import { theme } from '../theme';

export function KeyValueRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.value}>{value === null || value === undefined || value === '' ? 'غير متوفر' : String(value)}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  value: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.size.sm,
    fontWeight: theme.typography.weight.bold,
    textAlign: 'left',
  },
});
