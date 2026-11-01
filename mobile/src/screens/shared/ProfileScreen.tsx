import { Alert, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../state/authStore';
import { useAuth } from '../../auth/AuthProvider';
import { applyAccessToken, getDisplayError, normalizeApiError } from '../../api/client';
import { saveSession } from '../../auth/authStorage';
import { getRoleLabel } from '../../constants/roles';
import { theme } from '../../theme';
import { PHONE_FORMAT_HINT_AR } from '../../utils/registration';

type ProfileField = 'full_name' | 'phone' | 'email' | 'national_id' | 'current_password';
const PROFILE_FIELDS: ProfileField[] = ['full_name', 'phone', 'email', 'national_id', 'current_password'];

// Self-service profile (PATCH /api/customer/profile/, customers only). The
// backend asks for the current password when the email (login identifier) or
// the phone (second factor of public tracking) changes, and answers an email
// change with a fresh token pair. Staff accounts see their data read only.
export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isCustomer = role === 'client';
  const { refreshCurrentUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [nationalId, setNationalId] = useState(user?.national_id ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const phoneChanged = phone.trim() !== (user?.phone ?? '').trim();
  // Exact comparison, as the server does: a case-only change is a change too.
  const emailChanged = email.trim() !== (user?.email ?? '').trim();
  const identityChanged = phoneChanged || emailChanged;

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const localErrors: Partial<Record<ProfileField, string>> = {};
      if (!fullName.trim()) localErrors.full_name = 'الاسم الكامل مطلوب.';
      if (!email.trim()) localErrors.email = 'البريد الإلكتروني مطلوب.';
      if (identityChanged && !currentPassword) {
        localErrors.current_password = 'أدخل كلمة المرور الحالية لتأكيد تغيير البريد الإلكتروني أو رقم الهاتف.';
      }
      setErrors(localErrors);
      if (Object.keys(localErrors).length) throw new Error('validation');
      return authApi.updateCustomerProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        national_id: nationalId.trim(),
        ...(identityChanged ? { current_password: currentPassword } : {}),
      });
    },
    onSuccess: async (result) => {
      const sessionUser = useAuthStore.getState().user;
      if (result.tokens?.access && result.tokens?.refresh && sessionUser) {
        // An identity change revokes the old tokens; continue with the reissued pair.
        const session = { access: result.tokens.access, refresh: result.tokens.refresh, user: sessionUser };
        useAuthStore.getState().setSession(session);
        applyAccessToken(session.access);
        await saveSession(session);
      }
      setCurrentPassword('');
      setErrors({});
      await refreshCurrentUser();
      Alert.alert('تم', 'تم تحديث الملف الشخصي.');
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'validation') return;
      const apiError = normalizeApiError(error);
      const placed: Partial<Record<ProfileField, string>> = {};
      PROFILE_FIELDS.forEach((field) => {
        const message = apiError.fieldErrors?.[field]?.[0];
        if (message) placed[field] = message;
      });
      setErrors(placed);
      if (!Object.keys(placed).length) Alert.alert('تعذر الحفظ', getDisplayError(error));
    },
  });

  return (
    <AppScreen title="الملف الشخصي" subtitle={isCustomer ? 'راجع بيانات حسابك وعدّلها عند الحاجة.' : 'بيانات حسابك المسجلة لدى الإدارة.'}>
      <AppCard>
        <AppInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} editable={isCustomer} error={errors.full_name} />
        <AppInput
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          editable={isCustomer}
          autoCapitalize="none"
          keyboardType="email-address"
          hint={isCustomer ? 'البريد الإلكتروني هو اسم الدخول إلى حسابك.' : undefined}
          error={errors.email}
        />
        <AppInput
          label="رقم الهاتف"
          value={phone}
          onChangeText={setPhone}
          editable={isCustomer}
          keyboardType="phone-pad"
          hint={isCustomer ? PHONE_FORMAT_HINT_AR : undefined}
          error={errors.phone}
        />
        <AppInput
          label="الرقم الوطني (اختياري)"
          value={nationalId}
          onChangeText={setNationalId}
          editable={isCustomer}
          keyboardType="number-pad"
          error={errors.national_id}
        />
        {isCustomer && identityChanged ? (
          <AppInput
            label="كلمة المرور الحالية"
            value={currentPassword}
            onChangeText={(value) => {
              setCurrentPassword(value);
              if (value) setErrors((current) => ({ ...current, current_password: undefined }));
            }}
            secureTextEntry
            autoCapitalize="none"
            hint="مطلوبة لتأكيد تغيير البريد الإلكتروني أو رقم الهاتف."
            error={errors.current_password}
          />
        ) : null}
        <AppInput label="نوع الحساب" value={getRoleLabel(role)} editable={false} />
        {isCustomer ? (
          <AppButton label="حفظ التغييرات" onPress={() => updateProfileMutation.mutate()} loading={updateProfileMutation.isPending} />
        ) : (
          <Text style={styles.note}>لتحديث بيانات حساب فريق العمل تواصل مع الإدارة.</Text>
        )}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
