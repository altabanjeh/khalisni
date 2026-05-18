import { View, type ViewProps, StyleSheet } from 'react-native';

import { theme } from '../theme';

interface AppCardProps extends ViewProps {
  variant?: 'default' | 'muted';
}

export function AppCard({ style, variant = 'default', ...props }: AppCardProps) {
  return <View style={[styles.card, variant === 'muted' ? styles.muted : null, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    ...theme.components.card,
    gap: theme.spacing.md,
  },
  muted: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.borderStrong,
  },
});
