import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { componentTheme } from './components';

export const theme = {
  colors,
  spacing,
  typography,
  components: componentTheme,
} as const;

export type AppTheme = typeof theme;
