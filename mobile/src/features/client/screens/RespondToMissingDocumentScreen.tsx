import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { documentsApi } from '../../../api/documents.api';
import { DocumentUploadWidget } from '../../documents/DocumentUploadWidget';
import { getDisplayError } from '../../../api/client';

export function RespondToMissingDocumentScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();

  return (
    <AppScreen title="الرد على النواقص" subtitle="ارفع المستند المطلوب ثم حدّث تفاصيل الطلب.">
      <DocumentUploadWidget
        onSubmit={async ({ documentType, file }) => {
          const formData = new FormData();
          formData.append('document_type', documentType);
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType ?? 'application/octet-stream',
          } as any);
          try {
            await documentsApi.uploadCustomerDocument(orderId, formData);
            await queryClient.invalidateQueries({ queryKey: ['client-order', orderId] });
            await queryClient.invalidateQueries({ queryKey: ['client-orders'] });
            Alert.alert('تم', 'تم رفع المستند المطلوب.');
            navigation.goBack();
          } catch (error) {
            Alert.alert('تعذر الرفع', getDisplayError(error));
            throw error;
          }
        }}
      />
    </AppScreen>
  );
}
