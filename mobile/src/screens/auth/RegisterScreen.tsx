import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { authApi } from '../../api/auth.api';
import { normalizeApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthProvider';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { LegalLinks } from '../../components/LegalLinks';
import { theme } from '../../theme';
import {
  PASSWORD_RULES_AR,
  PHONE_FORMAT_HINT_AR,
  PHONE_PLACEHOLDER,
  buildRegisterPayload,
  mapRegisterErrors,
  validateRegisterForm,
  type RegisterField,
  type RegisterForm,
} from '../../utils/registration';

const EMPTY_FORM: RegisterForm = { full_name: '', phone: '', email: '', national_id: '', password: '' };

// Customer self-registration (audit M-05): POST /api/auth/register/, then the
// new account is signed in with the same credentials. If that sign-in fails
// (for example rate limiting), the login screen opens with the email filled in,
// as the web does after registering.
export function RegisterScreen({ navigation }: { navigation: any }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState<RegisterForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field: RegisterField) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const localErrors = validateRegisterForm(form);
    setErrors(localErrors);
    setGeneralError('');
    if (Object.keys(localErrors).length) return;

    setSubmitting(true);
    const payload = buildRegisterPayload(form);
    let createdEmail = payload.email;
    try {
      const created = await authApi.register(payload);
      createdEmail = created?.email || payload.email;
    } catch (error) {
      const mapped = mapRegisterErrors(normalizeApiError(error));
      setErrors(mapped.fieldErrors);
      setGeneralError(mapped.general);
      setSubmitting(false);
      return;
    }
    try {
      // On success RootNavigator switches to the customer screens.
      await signIn({ email: createdEmail, password: payload.password });
    } catch {
      setSubmitting(false);
      navigation.replace('Login', { email: createdEmail, registered: true });
    }
  };

  return (
    <AppScreen title="إنشاء حساب عميل" subtitle="بعد إنشاء الحساب يمكنك طلب الخدمات ورفع المستندات ومتابعة طلباتك من التطبيق.">
      <AppCard style={styles.card}>
        <AppInput
          label="الاسم الكامل (مطلوب)"
          value={form.full_name}
          onChangeText={update('full_name')}
          autoComplete="name"
          textContentType="name"
          error={errors.full_name}
        />
        <AppInput
          label="رقم الهاتف (مطلوب)"
          value={form.phone}
          onChangeText={update('phone')}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder={PHONE_PLACEHOLDER}
          hint={PHONE_FORMAT_HINT_AR}
          error={errors.phone}
        />
        <AppInput
          label="البريد الإلكتروني (مطلوب)"
          value={form.email}
          onChangeText={update('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />
        <AppInput
          label="الرقم الوطني (اختياري)"
          value={form.national_id}
          onChangeText={update('national_id')}
          keyboardType="number-pad"
          error={errors.national_id}
        />
        <AppInput
          label="كلمة المرور (مطلوب)"
          value={form.password}
          onChangeText={update('password')}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          error={errors.password}
        />
        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>يجب أن تكون كلمة المرور:</Text>
          {PASSWORD_RULES_AR.map((rule) => (
            <Text key={rule} style={styles.rule}>• {rule}</Text>
          ))}
        </View>
        {generalError ? <Text style={styles.error}>{generalError}</Text> : null}
        <AppButton label={submitting ? 'جار إنشاء الحساب...' : 'إنشاء الحساب'} onPress={() => void submit()} loading={submitting} />
        <LegalLinks navigation={navigation} prefix="بإنشاء الحساب فإنك تطّلع على:" />
        <AppButton label="لديك حساب بالفعل؟ سجّل الدخول" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.lg,
  },
  rules: {
    gap: theme.spacing.xs,
  },
  rulesTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  rule: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
