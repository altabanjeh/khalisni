import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageServicesScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-services'], queryFn: () => servicesApi.getAdminServices() });
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [governmentFee, setGovernmentFee] = useState('');

  const mutation = useMutation({
    mutationFn: async () => servicesApi.createAdminService({
      name_ar: nameAr,
      slug,
      service_fee: Number(serviceFee || 0),
      government_fee: Number(governmentFee || 0),
      is_active: true,
    }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إنشاء الخدمة.');
      setNameAr('');
      setSlug('');
      setServiceFee('');
      setGovernmentFee('');
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (error) => Alert.alert('تعذر الإنشاء', getDisplayError(error)),
  });

  return (
    <AppScreen title="إدارة الخدمات">
      <AppCard>
        <AppInput label="اسم الخدمة" value={nameAr} onChangeText={setNameAr} />
        <AppInput label="Slug" value={slug} onChangeText={setSlug} autoCapitalize="none" />
        <AppInput label="رسوم الخدمة" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
        <AppInput label="الرسوم الحكومية" value={governmentFee} onChangeText={setGovernmentFee} keyboardType="numeric" />
        <AppButton label="إضافة خدمة" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.name_ar}</Text>
            <Text style={{ textAlign: 'right' }}>Slug: {item.slug}</Text>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
