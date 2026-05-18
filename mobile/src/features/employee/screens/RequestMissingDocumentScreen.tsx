import { Alert } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';

export function RequestMissingDocumentScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const [missingTypes, setMissingTypes] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: async () =>
      ordersApi.requestEmployeeDocuments(orderId, {
        missing_document_types: missingTypes.split(',').map((item) => item.trim()).filter(Boolean),
        note,
      }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إرسال طلب النواقص للعميل.');
      await queryClient.invalidateQueries({ queryKey: ['employee-order', orderId] });
      navigation.goBack();
    },
    onError: (error) => Alert.alert('تعذر الإرسال', getDisplayError(error)),
  });

  return (
    <AppScreen title="طلب مستندات ناقصة">
      <AppCard>
        <AppInput label="أنواع المستندات المطلوبة" value={missingTypes} onChangeText={setMissingTypes} hint="افصل القيم بفاصلة مثل: passport,national_id" />
        <AppInput label="ملاحظة للعميل" value={note} onChangeText={setNote} multiline />
        <AppButton label="إرسال الطلب" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
