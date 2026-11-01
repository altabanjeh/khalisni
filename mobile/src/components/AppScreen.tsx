import { useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContext } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '../theme';

interface AppScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: ReactNode;
  // Force the back affordance on or off; by default it shows on every stacked
  // screen that can go back (never on a tab's root screen).
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * Screen frame. Every navigator hides the native header (headerShown: false)
 * and Android runs edge-to-edge (app.json android.edgeToEdgeEnabled), so this
 * component owns the safe area: the content starts below the status bar /
 * notch (top inset), keeps clear of the side insets, and - on stacked screens,
 * which have no tab bar - ends above the home indicator / gesture bar.
 *
 * Layout direction: the app is Arabic only and imitates RTL inside a native LTR
 * layout (README "RTL policy"): rows use row-reverse and text aligns right, so
 * the back button sits at the top right with a right-pointing arrow.
 */
export function AppScreen({
  title,
  subtitle,
  scroll = true,
  refreshing,
  onRefresh,
  headerRight,
  showBack,
  onBack,
  children,
}: AppScreenProps) {
  const insets = useSafeAreaInsets();
  // useContext instead of useNavigation(): the frame is also rendered outside a
  // navigator (unknown-role screen), where there is nothing to go back to.
  const navigation = useContext(NavigationContext);
  const navigatorType = navigation?.getState?.()?.type;
  const inTabNavigator = navigatorType === 'tab';
  const canGoBack = showBack ?? Boolean(navigatorType === 'stack' && navigation?.canGoBack());

  const safePadding = {
    paddingTop: insets.top + theme.spacing.screen,
    paddingLeft: insets.left + theme.spacing.screen,
    paddingRight: insets.right + theme.spacing.screen,
  };
  // The tab bar already keeps clear of the bottom inset on tab screens.
  const bottomInset = inTabNavigator ? 0 : insets.bottom;

  const backButton = canGoBack ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="رجوع"
      hitSlop={12}
      onPress={onBack ?? (() => navigation?.goBack())}
      style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
    >
      <Ionicons name="arrow-forward" size={22} color={theme.colors.primaryDark} />
      <Text style={styles.backLabel}>رجوع</Text>
    </Pressable>
  ) : null;

  const header = (title || subtitle || headerRight || backButton) ? (
    <View style={styles.headerBlock}>
      {backButton ? <View style={styles.backRow}>{backButton}</View> : null}
      {(title || subtitle || headerRight) ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerRight}
        </View>
      ) : null}
    </View>
  ) : null;

  if (!scroll) {
    return (
      <View style={styles.container}>
        <View style={[styles.inner, styles.innerFlex, safePadding, { paddingBottom: theme.spacing.screen + bottomInset }]}>
          {header}
          {children}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: theme.spacing.section + bottomInset }}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} progressViewOffset={insets.top} /> : undefined}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={[styles.inner, safePadding]}>
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
  inner: {
    padding: theme.spacing.screen,
    gap: theme.spacing.lg,
  },
  innerFlex: {
    flex: 1,
  },
  headerBlock: {
    gap: theme.spacing.sm,
  },
  backRow: {
    flexDirection: 'row-reverse',
  },
  backButton: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.spacing.radiusMd,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backPressed: {
    opacity: 0.8,
  },
  backLabel: {
    color: theme.colors.primaryDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
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
