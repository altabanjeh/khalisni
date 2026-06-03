import { Alert } from 'react-native';
import { useState } from 'react';

import { authApi } from '../../api/auth.api';
import { getDisplayError } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppScreen } from '../../components/AppScreen';
import { EmptyState } from '../../components/EmptyState';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await authApi.forgotPassword(email);
      Alert.alert('تم الإرسال', response.detail);
    } catch (error) {
      Alert.alert('تعذر الإرسال', getDisplayError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen
      title="استعادة كلمة المرور"
      subtitle="أدخل البريد الإلكتروني المرتبط بحساب العميل وسنرسل رابط إعادة التعيين إذا كان الحساب مسجلاً."
    >
      <AppCard>
        <AppInput
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AppButton label="إرسال رابط إعادة التعيين" onPress={handleSubmit} loading={loading} />
        <EmptyState
          title="الرابط يصل عبر البريد الإلكتروني"
          description="بعد فتح الرابط يمكنك تعيين كلمة مرور جديدة. الرابط صالح لمدة 30 دقيقة ويُستخدم مرة واحدة فقط."
        />
      </AppCard>
    </AppScreen>
  );
}
