import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { LegalLinks } from '../../components/LegalLinks';
import { useAuth } from '../../auth/AuthProvider';
import { theme } from '../../theme';
import { getDisplayError } from '../../api/client';
import { BRAND_AR, BRAND_LOCKUP } from '../../utils/brand';

export function LoginScreen({ navigation, route }: { navigation: any; route?: { params?: { email?: string; registered?: boolean } } }) {
  const { signIn } = useAuth();
  // After registration the email arrives prefilled (same as the web ?email=).
  const [email, setEmail] = useState(route?.params?.email ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (route?.params?.email) setEmail(route.params.email);
  }, [route?.params?.email]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await signIn({ email: email.trim(), password });
    } catch (signInError) {
      setError(getDisplayError(signInError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.hero}>
          <Text style={styles.brand}>{BRAND_LOCKUP}</Text>
          <Text style={styles.subtitle}>اطلب خدماتك الحكومية وتابع طلباتك من مكان واحد.</Text>
        </View>
        <AppCard style={styles.card}>
          {route?.params?.registered ? (
            <Text style={styles.success}>تم إنشاء حسابك. سجّل الدخول بكلمة المرور التي اخترتها.</Text>
          ) : null}
          <AppInput
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton label="دخول" onPress={() => void handleLogin()} loading={loading} />
          <AppButton label="نسيت كلمة المرور" variant="secondary" onPress={() => navigation.navigate('ForgotPassword')} />
        </AppCard>
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>جديد في {BRAND_AR}؟</Text>
          <AppButton label="إنشاء حساب جديد" variant="secondary" onPress={() => navigation.navigate('Register')} />
          <AppButton label="تتبع طلب بدون تسجيل الدخول" variant="ghost" onPress={() => navigation.navigate('TrackOrder')} />
          <LegalLinks navigation={navigation} />
        </AppCard>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.section,
  },
  hero: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.lg,
  },
  brand: {
    color: theme.colors.primaryDark,
    fontSize: 34,
    fontFamily: theme.typography.fontFamily.extraBold,
    textAlign: 'right',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.md,
    fontFamily: theme.typography.fontFamily.regular,
    textAlign: 'right',
    lineHeight: theme.typography.lineHeight.md,
  },
  card: {
    gap: theme.spacing.lg,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  success: {
    color: theme.colors.success,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
