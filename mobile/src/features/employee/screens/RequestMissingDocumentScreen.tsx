import { Alert, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [note, setNote] = useState('');

  // Same key as the order detail screen, so this is normally served from cache.
  const orderQuery = useQuery({ queryKey: ['employee-order', orderId], queryFn: () => ordersApi.getEmployeeOrder(orderId), enabled: !!orderId });
  const requiredDocuments = orderQuery.data?.required_documents ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      if (!note.trim()) {
        throw new Error('الملاحظة للعميل مطلوبة.');
      }
      return ordersApi.requestEmployeeDocuments(orderId, {
        document_types: requiredDocuments.length
          ? selectedTypes
          : missingTypes.split(',').map((item) => item.trim()).filter(Boolean),
        note: note.trim(),
      });
    },
    onSuccess: async () => {
      Alert.alert('تم', 'تم إرسال طلب النواقص للعميل.');
      await queryClient.invalidateQueries({ queryKey: ['employee-order', orderId] });
      navigation.goBack();
    },
    onError: (error) => Alert.alert('تعذر الإرسال', getDisplayError(error)),
  });

  const toggleType = (documentType: string) =>
    setSelectedTypes((current) =>
      current.includes(documentType) ? current.filter((item) => item !== documentType) : [...current, documentType],
    );

  return (
    <AppScreen title="طلب مستندات ناقصة">
      <AppCard>
        {requiredDocuments.length ? (
          <View style={{ gap: 8 }}>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>أنواع المستندات المطلوبة</Text>
            {requiredDocuments.map((document) => (
              <AppButton
                key={document.document_type}
                label={document.name_ar || document.name_en || document.document_type}
                variant={selectedTypes.includes(document.document_type) ? 'primary' : 'secondary'}
                onPress={() => toggleType(document.document_type)}
              />
            ))}
          </View>
        ) : (
          <AppInput label="أنواع المستندات المطلوبة" value={missingTypes} onChangeText={setMissingTypes} hint="افصل رموز أنواع المستندات بفاصلة مثل: passport,national_id" />
        )}
        <AppInput label="ملاحظة للعميل" value={note} onChangeText={setNote} multiline />
        <AppButton label="إرسال الطلب" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
    </AppScreen>
  );
}
