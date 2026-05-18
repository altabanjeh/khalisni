import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { adminApi } from '../../../api/admin.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageAdvertisementsScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-ads'], queryFn: () => adminApi.getAdminAdvertisements() });
  const [titleAr, setTitleAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  const mutation = useMutation({
    mutationFn: async () => adminApi.createAdminAdvertisement({ title_ar: titleAr, description_ar: descriptionAr, is_active: true }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إنشاء الإعلان.');
      setTitleAr('');
      setDescriptionAr('');
      await queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
    },
    onError: (error) => Alert.alert('تعذر الإنشاء', getDisplayError(error)),
  });

  return (
    <AppScreen title="إدارة الإعلانات">
      <AppCard>
        <AppInput label="العنوان" value={titleAr} onChangeText={setTitleAr} />
        <AppInput label="الوصف" value={descriptionAr} onChangeText={setDescriptionAr} multiline />
        <AppButton label="إضافة إعلان" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id ?? item.advertisement_id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.title_ar ?? item.title_en}</Text>
            <Text style={{ textAlign: 'right' }}>{item.description_ar ?? item.description_en}</Text>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
