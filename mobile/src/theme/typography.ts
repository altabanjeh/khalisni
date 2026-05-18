export const typography = {
  fontFamily: {
    regular: 'Cairo_400Regular',
    medium: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
    extraBold: 'Cairo_800ExtraBold',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 36,
  },
  lineHeight: {
    sm: 20,
    md: 24,
    lg: 28,
    xl: 34,
    display: 44,
  },
  weight: {
    regular: '400' as const,
    medium: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
} as const;
