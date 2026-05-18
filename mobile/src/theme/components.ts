import { colors } from './colors';
import { spacing } from './spacing';

export const componentTheme = {
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radiusLg,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 4,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  button: {
    minHeight: 52,
    borderRadius: spacing.radiusMd,
  },
} as const;
