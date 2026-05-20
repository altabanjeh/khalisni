import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../auth/AuthProvider';
import { theme } from '../../theme';
import { getDisplayError } from '../../api/client';

export function LoginScreen({ navigation }: { navigation: any }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', getDisplayError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen scroll={false}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.hero}>
          <Text style={styles.brand}>Khalsni / خلّصني</Text>
          <Text style={styles.subtitle}>إدارة الطلبات والخدمات الحكومية من شاشة واحدة.</Text>
        </View>
        <AppCard style={styles.card}>
          <AppInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
          <AppButton label="دخول" onPress={handleLogin} loading={loading} />
          <AppButton label="نسيت كلمة المرور" variant="secondary" onPress={() => navigation.navigate('ForgotPassword')} />
          <Text style={styles.note}>المصادقة تستخدم JWT من نفس واجهات الويب الحالية.</Text>
        </AppCard>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.section,
  },
  hero: {
    gap: theme.spacing.sm,
  },
  brand: {
    color: theme.colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
    lineHeight: theme.typography.lineHeight.md,
  },
  card: {
    gap: theme.spacing.lg,
  },
  note: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.size.sm,
    textAlign: 'center',
  },
});
