import { Alert } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';

export function ProviderTaskUpdateScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('IN_PROGRESS');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (note.trim()) {
        await ordersApi.providerAddNote(orderId, { note });
      }
      return ordersApi.providerChangeStatus(orderId, { status, note });
    },
    onSuccess: async () => {
      Alert.alert('تم', 'تم تحديث حالة العمل.');
      await queryClient.invalidateQueries({ queryKey: ['provider-order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['provider-orders'] });
      navigation.goBack();
    },
    onError: (error) => Alert.alert('تعذر التحديث', getDisplayError(error)),
  });

  return (
    <AppScreen title="تحديث حالة العمل">
      <AppCard>
        <AppInput label="الحالة الجديدة" value={status} onChangeText={setStatus} hint="مثال: IN_PROGRESS أو READY_FOR_DELIVERY" />
        <AppInput label="ملاحظة" value={note} onChangeText={setNote} multiline />
        <AppButton label="حفظ" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
