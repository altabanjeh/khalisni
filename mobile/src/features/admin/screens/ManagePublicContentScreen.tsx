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
    mutationFn: async () => adminApi.updateAdminPublicContent(JSON.parse(contentJson)),
    onSuccess: () => Alert.alert('تم', 'تم تحديث محتوى الموقع.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  const themeMutation = useMutation({
    mutationFn: async () => adminApi.updateAdminTheme(JSON.parse(themeJson)),
    onSuccess: () => Alert.alert('تم', 'تم تحديث السمة العامة.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  return (
    <AppScreen title="إدارة محتوى الموقع العام">
      {contentQuery.isLoading || themeQuery.isLoading ? <LoadingState /> : null}
      {contentQuery.isError || themeQuery.isError ? <ErrorState message={getDisplayError(contentQuery.error ?? themeQuery.error)} onRetry={() => { contentQuery.refetch(); themeQuery.refetch(); }} /> : null}
      <AppCard>
        <AppInput label="محتوى الصفحة العامة JSON" value={contentJson} onChangeText={setContentJson} multiline />
        <AppButton label="حفظ المحتوى" onPress={() => contentMutation.mutate()} loading={contentMutation.isPending} />
      </AppCard>
      <AppCard>
        <AppInput label="إعدادات السمة JSON" value={themeJson} onChangeText={setThemeJson} multiline />
        <AppButton label="حفظ السمة" onPress={() => themeMutation.mutate()} loading={themeMutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
