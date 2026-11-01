import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';

import { theme } from '../../theme';
import { BRAND_LOCKUP } from '../../utils/brand';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>{BRAND_LOCKUP}</Text>
      <Text style={styles.subtitle}>بوابة الخدمات والطلبات</Text>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  logo: { color: theme.colors.primaryDark, fontSize: 34, fontWeight: '800' },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.typography.size.md },
});
