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
import { getDisplayError } from '../../api/client';

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const { refreshCurrentUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (role !== 'client') {
        throw new Error('تحديث الملف الشخصي متاح للعميل فقط حالياً لأن بقية الأدوار لا تملك endpoint مخصصاً بعد.');
      }
      return authApi.updateCustomerProfile({ full_name: fullName, phone });
    },
    onSuccess: async () => {
      await refreshCurrentUser();
      Alert.alert('تم', 'تم تحديث الملف الشخصي.');
    },
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  return (
    <AppScreen title="الملف الشخصي" subtitle="راجع بيانات الحساب المرتبطة بالجلسة الحالية.">
      <AppCard>
        <AppInput label="الاسم الكامل" value={fullName} onChangeText={setFullName} />
        <AppInput label="البريد الإلكتروني" value={user?.email ?? ''} editable={false} />
        <AppInput label="رقم الهاتف" value={phone} onChangeText={setPhone} />
        <AppInput label="الدور" value={role ?? ''} editable={false} />
        <AppButton label="حفظ التغييرات" onPress={() => updateProfileMutation.mutate()} loading={updateProfileMutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
