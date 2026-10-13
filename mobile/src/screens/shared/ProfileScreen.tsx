import { Alert } from 'react-native';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../state/authStore';
import { useAuth } from '../../auth/AuthProvider';
import { applyAccessToken, getDisplayError } from '../../api/client';
import { saveSession } from '../../auth/authStorage';

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const { refreshCurrentUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // The backend asks for the current password only when the phone (or email) changes.
  const phoneChanged = phone.trim() !== (user?.phone ?? '').trim();

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (role !== 'client') {
        throw new Error('تحديث الملف الشخصي متاح للعميل فقط حالياً لأن بقية الأدوار لا تملك endpoint مخصصاً بعد.');
      }
      if (phoneChanged && !currentPassword) {
        setPasswordError('أدخل كلمة المرور الحالية لتغيير رقم الهاتف.');
        throw new Error('validation');
      }
      setPasswordError('');
      return authApi.updateCustomerProfile({
        full_name: fullName,
        phone,
        ...(phoneChanged ? { current_password: currentPassword } : {}),
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
      await refreshCurrentUser();
      Alert.alert('تم', 'تم تحديث الملف الشخصي.');
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'validation') return;
      Alert.alert('تعذر الحفظ', getDisplayError(error));
    },
  });

  return (
    <AppScreen title="الملف الشخصي" subtitle="راجع بيانات الحساب المرتبطة بالجلسة الحالية.">
      <AppCard>
        <AppInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} />
        <AppInput label="البريد الإلكتروني" value={user?.email ?? ''} editable={false} />
        <AppInput label="رقم الهاتف" value={phone} onChangeText={setPhone} />
        {phoneChanged ? (
          <AppInput
            label="كلمة المرور الحالية"
            value={currentPassword}
            onChangeText={(value) => {
              setCurrentPassword(value);
              if (value) setPasswordError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            hint="مطلوبة لتأكيد تغيير رقم الهاتف."
            error={passwordError}
          />
        ) : null}
        <AppInput label="الدور" value={role ?? ''} editable={false} />
        <AppButton label="حفظ التغييرات" onPress={() => updateProfileMutation.mutate()} loading={updateProfileMutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
