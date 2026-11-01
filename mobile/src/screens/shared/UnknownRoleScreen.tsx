import { StyleSheet, Text } from 'react-native';
import { useState } from 'react';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../auth/AuthProvider';
import { theme } from '../../theme';

// Shown when the signed-in account has a role the app does not recognise.
// The customer screens are never used as a fallback (audit M-29).
export function UnknownRoleScreen() {
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <AppScreen title="تعذر فتح الحساب" subtitle="نوع هذا الحساب غير مدعوم في تطبيق الجوال.">
      <AppCard>
        <Text style={styles.text}>
          لا يمكن عرض أي شاشة لهذا الحساب لأن نوعه غير معروف للتطبيق. يرجى التواصل مع الدعم أو مسؤول النظام لمراجعة صلاحيات الحساب.
        </Text>
        <AppButton
          label="تسجيل الخروج"
          variant="danger"
          loading={signingOut}
          onPress={() => {
            setSigningOut(true);
            void signOut().finally(() => setSigningOut(false));
          }}
        />
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  text: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
});
