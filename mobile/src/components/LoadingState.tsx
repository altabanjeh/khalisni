import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

import { theme } from '../theme';

export function LoadingState({ label = 'جاري التحميل...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.section, alignItems: 'center', gap: theme.spacing.md },
  label: { color: theme.colors.textMuted, fontFamily: theme.typography.fontFamily.regular, fontSize: theme.typography.size.sm },
});
