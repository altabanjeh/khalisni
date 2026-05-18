import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';

import { theme } from '../theme';

interface AppScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: ReactNode;
}

export function AppScreen({
  title,
  subtitle,
  scroll = true,
  refreshing,
  onRefresh,
  headerRight,
  children,
}: AppScreenProps) {
  const header = (title || subtitle || headerRight) ? (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={styles.container}>
        <View style={[styles.inner, styles.innerFlex]}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.inner}>
        {header}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    paddingBottom: theme.spacing.section,
  },
  inner: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
  },
  innerFlex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.size.xxl,
    fontFamily: theme.typography.fontFamily.extraBold,
    textAlign: 'right',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily.regular,
  },
});
