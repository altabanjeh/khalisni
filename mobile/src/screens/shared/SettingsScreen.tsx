import { Text } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppScreen } from '../../components/AppScreen';
import { useAuth } from '../../auth/AuthProvider';
import { env } from '../../config/env';

export function SettingsScreen() {
  const { signOut } = useAuth();

  return (
    <AppScreen title="الإعدادات" subtitle="إدارة الجلسة والإعدادات العامة للتطبيق.">
      <AppCard>
        <Text>عنوان الـ API الحالي: {env.apiBaseUrl}</Text>
        <Text>الإشعارات الفورية تحتاج دعماً خلفياً إضافياً. تم توثيق ذلك في docs/mobile.</Text>
        <AppButton label="تسجيل الخروج" variant="danger" onPress={() => void signOut()} />
      </AppCard>
    </AppScreen>
  );
}
