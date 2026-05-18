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

export function ManagePricesScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-services'], queryFn: () => servicesApi.getAdminServices() });
  const [serviceId, setServiceId] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [governmentFee, setGovernmentFee] = useState('');

  const mutation = useMutation({
    mutationFn: async () => servicesApi.updateAdminService(serviceId, {
      service_fee: Number(serviceFee || 0),
      government_fee: Number(governmentFee || 0),
    }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم تحديث الأسعار.');
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  return (
    <AppScreen title="إدارة الأسعار">
      <AppCard>
        <AppInput label="معرّف الخدمة" value={serviceId} onChangeText={setServiceId} />
        <AppInput label="رسوم الخدمة" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
        <AppInput label="الرسوم الحكومية" value={governmentFee} onChangeText={setGovernmentFee} keyboardType="numeric" />
        <AppButton label="تحديث الأسعار" onPress={() => mutation.mutate()} loading={mutation.isPending} />
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
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.name_ar} #{item.id}</Text>
            <Text style={{ textAlign: 'right' }}>رسوم الخدمة: {String(item.service_fee ?? 0)}</Text>
            <Text style={{ textAlign: 'right' }}>الرسوم الحكومية: {String(item.government_fee ?? 0)}</Text>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
