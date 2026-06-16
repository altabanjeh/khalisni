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

  const selectedService = (query.data ?? []).find((item) => String(item.id) === serviceId.trim());

  const mutation = useMutation({
    mutationFn: async () =>
      servicesApi.updateAdminService(serviceId.trim(), {
        service_fee: Number(serviceFee),
        government_fee: Number(governmentFee),
      }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم تحديث الأسعار.');
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  function handleSubmit() {
    const normalizedServiceId = serviceId.trim();
    const parsedServiceFee = Number(serviceFee);
    const parsedGovernmentFee = Number(governmentFee);

    if (!normalizedServiceId) {
      Alert.alert('مدخل ناقص', 'اختر خدمة قبل تحديث الأسعار.');
      return;
    }

    if (!selectedService) {
      Alert.alert('معرّف غير صالح', 'الخدمة المحددة غير موجودة في القائمة الحالية.');
      return;
    }

    if (!Number.isFinite(parsedServiceFee) || parsedServiceFee < 0) {
      Alert.alert('رسوم خدمة غير صالحة', 'أدخل رسوم خدمة رقمية صحيحة أكبر من أو تساوي صفرًا.');
      return;
    }

    if (!Number.isFinite(parsedGovernmentFee) || parsedGovernmentFee < 0) {
      Alert.alert('رسوم حكومية غير صالحة', 'أدخل رسومًا حكومية رقمية صحيحة أكبر من أو تساوي صفرًا.');
      return;
    }

    Alert.alert(
      'تأكيد تحديث الأسعار',
      `سيتم تحديث أسعار الخدمة ${selectedService.name_ar}.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تأكيد', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  }

  return (
    <AppScreen title="إدارة الأسعار">
      <AppCard>
        <AppInput
          label="معرّف الخدمة"
          value={serviceId}
          onChangeText={setServiceId}
          keyboardType="number-pad"
          hint="اختر خدمة من القائمة أدناه لتعبئة المعرّف والأسعار الحالية."
        />
        <AppInput label="رسوم الخدمة" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
        <AppInput label="الرسوم الحكومية" value={governmentFee} onChangeText={setGovernmentFee} keyboardType="numeric" />
        {selectedService ? <Text style={{ textAlign: 'right' }}>الخدمة المحددة: {selectedService.name_ar}</Text> : null}
        <AppButton label="تحديث الأسعار" onPress={handleSubmit} loading={mutation.isPending} />
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
            <AppButton
              label="اختيار هذه الخدمة"
              variant="secondary"
              onPress={() => {
                setServiceId(String(item.id));
                setServiceFee(String(item.service_fee ?? 0));
                setGovernmentFee(String(item.government_fee ?? 0));
              }}
            />
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
