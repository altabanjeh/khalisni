import { StyleSheet, Text } from 'react-native';
import { useState } from 'react';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppScreen } from '../../components/AppScreen';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../auth/AuthProvider';
import { getRoleLabel } from '../../constants/roles';
import { LegalLinks } from '../../components/LegalLinks';
import { useAuthStore } from '../../state/authStore';
import { theme } from '../../theme';

// Account hub, reachable from the "حسابي" tab of every role navigator: opens
// the profile and signs out. Signing out clears the stored tokens, the session
// store and the query cache (AuthProvider.signOut); RootNavigator then shows
// the sign-in stack because the session status is no longer "authenticated".
export function SettingsScreen({ navigation }: { navigation: any }) {
  const { signOut } = useAuth();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setConfirmVisible(false);
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AppScreen title="حسابي" subtitle="بيانات حسابك وإدارة الجلسة على هذا الجهاز.">
      <AppCard>
        <Text style={styles.name}>{user?.full_name || 'مستخدم'}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
        <Text style={styles.meta}>نوع الحساب: {getRoleLabel(role)}</Text>
        <AppButton label="الملف الشخصي" variant="secondary" onPress={() => navigation.navigate('Profile')} />
      </AppCard>
      <AppCard>
        <Text style={styles.name}>الشروط والخصوصية</Text>
        <LegalLinks navigation={navigation} />
      </AppCard>
      <AppCard>
        <Text style={styles.meta}>عند تسجيل الخروج تُحذف بيانات الدخول المحفوظة على هذا الجهاز.</Text>
        <AppButton label="تسجيل الخروج" variant="danger" loading={signingOut} onPress={() => setConfirmVisible(true)} />
      </AppCard>
      <ConfirmDialog
        visible={confirmVisible}
        title="تسجيل الخروج"
        message="هل تريد تسجيل الخروج من التطبيق؟"
        confirmLabel="تسجيل الخروج"
        destructive
        onConfirm={() => void handleSignOut()}
        onCancel={() => setConfirmVisible(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  name: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  meta: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
});
