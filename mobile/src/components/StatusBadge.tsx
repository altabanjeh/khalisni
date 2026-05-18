import { Text, View, StyleSheet } from 'react-native';

import { getStatusColor, getStatusLabel } from '../utils/status';
import { theme } from '../theme';

export function StatusBadge({ status }: { status?: string | null }) {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}18`, borderColor: `${color}33` }]}>
      <Text style={[styles.label, { color }]}>{getStatusLabel(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.bold,
  },
});
