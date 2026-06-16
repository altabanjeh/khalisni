import { Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { adminApi } from '../../../api/admin.api';
import { getDisplayError } from '../../../api/client';

function parseJsonObject(label: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    Alert.alert('مدخل ناقص', `لا يمكن ترك ${label} فارغًا.`);
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      Alert.alert('JSON غير صالح', `${label} يجب أن يكون كائن JSON صحيحًا.`);
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    Alert.alert('JSON غير صالح', `تعذر تحليل ${label}. راجع التنسيق قبل الحفظ.`);
    return null;
  }
}

export function ManagePublicContentScreen() {
  const contentQuery = useQuery({ queryKey: ['public-content'], queryFn: () => adminApi.getAdminPublicContent() });
  const themeQuery = useQuery({ queryKey: ['public-theme'], queryFn: () => adminApi.getAdminTheme() });
  const [contentJson, setContentJson] = useState('');
  const [themeJson, setThemeJson] = useState('');

  useEffect(() => {
    if (contentQuery.data && !contentJson) {
      setContentJson(JSON.stringify(contentQuery.data, null, 2));
    }
  }, [contentJson, contentQuery.data]);

  useEffect(() => {
    if (themeQuery.data && !themeJson) {
      setThemeJson(JSON.stringify(themeQuery.data, null, 2));
    }
  }, [themeJson, themeQuery.data]);

  const contentMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => adminApi.updateAdminPublicContent(payload),
    onSuccess: () => Alert.alert('تم', 'تم تحديث محتوى الموقع.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  const themeMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => adminApi.updateAdminTheme(payload),
    onSuccess: () => Alert.alert('تم', 'تم تحديث السمة العامة.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  function handleSaveContent() {
    const payload = parseJsonObject('محتوى الصفحة العامة', contentJson);
    if (!payload) return;

    Alert.alert('تأكيد تحديث المحتوى', 'سيتم تطبيق تغييرات الموقع العام على المستخدمين.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', style: 'destructive', onPress: () => contentMutation.mutate(payload) },
    ]);
  }

  function handleSaveTheme() {
    const payload = parseJsonObject('إعدادات السمة', themeJson);
    if (!payload) return;

    Alert.alert('تأكيد تحديث السمة', 'سيتم تطبيق تغييرات السمة العامة على الواجهة العامة.', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تأكيد', style: 'destructive', onPress: () => themeMutation.mutate(payload) },
    ]);
  }

  return (
    <AppScreen title="إدارة محتوى الموقع العام">
      {contentQuery.isLoading || themeQuery.isLoading ? <LoadingState /> : null}
      {contentQuery.isError || themeQuery.isError ? (
        <ErrorState
          message={getDisplayError(contentQuery.error ?? themeQuery.error)}
          onRetry={() => {
            contentQuery.refetch();
            themeQuery.refetch();
          }}
        />
      ) : null}
      <AppCard>
        <AppInput
          label="محتوى الصفحة العامة JSON"
          value={contentJson}
          onChangeText={setContentJson}
          multiline
          hint="يتم التحقق من JSON قبل الحفظ. استخدم كائن JSON وليس قائمة."
        />
        <AppButton label="حفظ المحتوى" onPress={handleSaveContent} loading={contentMutation.isPending} />
      </AppCard>
      <AppCard>
        <AppInput
          label="إعدادات السمة JSON"
          value={themeJson}
          onChangeText={setThemeJson}
          multiline
          hint="يتم رفض أي JSON غير صالح قبل إرساله إلى الخادم."
        />
        <AppButton label="حفظ السمة" onPress={handleSaveTheme} loading={themeMutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
