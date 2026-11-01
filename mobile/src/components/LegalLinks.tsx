import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { LEGAL_TITLES } from '../utils/legal';
import type { LegalKind } from '../types/publicSite';

// Links to the in-app privacy policy and terms (LegalDocumentScreen). Every
// stack that shows them registers the "LegalDocument" route.
export function LegalLinks({ navigation, prefix }: { navigation: { navigate: (name: string, params?: object) => void }; prefix?: string }) {
  const open = (kind: LegalKind) => navigation.navigate('LegalDocument', { kind });
  return (
    <View style={styles.wrapper}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <View style={styles.row}>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => open('terms')} style={styles.link}>
          <Text style={styles.linkText}>{LEGAL_TITLES.terms}</Text>
        </Pressable>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => open('privacy')} style={styles.link}>
          <Text style={styles.linkText}>{LEGAL_TITLES.privacy}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  prefix: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textDecorationLine: 'underline',
    textAlign: 'right',
  },
});
