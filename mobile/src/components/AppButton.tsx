import { ActivityIndicator, Pressable, Text, type PressableProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../theme';

interface AppButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
}

export function AppButton({ label, variant = 'primary', loading, disabled, style, ...props }: AppButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style as any,
      ]}
      {...props}
    >
      {variant === 'primary' ? (
        <LinearGradient colors={[theme.colors.publicHeroStart, theme.colors.publicHeroEnd]} style={styles.fill}>
          {loading ? <ActivityIndicator color={theme.colors.textInverse} /> : null}
          <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
        </LinearGradient>
      ) : (
        <>
          {loading ? <ActivityIndicator color={variant === 'secondary' ? theme.colors.text : theme.colors.textInverse} /> : null}
          <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.components.button.minHeight,
    borderRadius: theme.components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    overflow: 'hidden',
  },
  label: {
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.bold,
  },
  fill: {
    minHeight: theme.components.button.minHeight,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.6,
  },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  danger: { backgroundColor: theme.colors.danger },
  ghost: { backgroundColor: 'transparent' },
});

const labelStyles = StyleSheet.create({
  primary: { color: theme.colors.textInverse },
  secondary: { color: theme.colors.text },
  danger: { color: theme.colors.textInverse },
  ghost: { color: theme.colors.primaryDark },
});
