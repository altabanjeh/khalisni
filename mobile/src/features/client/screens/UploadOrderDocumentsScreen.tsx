import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { documentsApi } from '../../../api/documents.api';
import { DocumentUploadWidget } from '../../documents/DocumentUploadWidget';
import { getDisplayError } from '../../../api/client';

export function UploadOrderDocumentsScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();

  return (
    <AppScreen title="رفع مستندات الطلب" subtitle={`الطلب ${route.params?.orderNumber ?? ''}`}>
      <DocumentUploadWidget
        title="رفع مستند جديد"
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
            Alert.alert('تم', 'تم رفع المستند.');
          } catch (error) {
            Alert.alert('تعذر الرفع', getDisplayError(error));
            throw error;
          }
        }}
      />
      <DocumentUploadWidget
        title="إنهاء وفتح تفاصيل الطلب"
        defaultDocumentType="customer_upload"
        onSubmit={async ({ documentType, file }) => {
          const formData = new FormData();
          formData.append('document_type', documentType);
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType ?? 'application/octet-stream',
          } as any);
          await documentsApi.uploadCustomerDocument(orderId, formData);
          await queryClient.invalidateQueries({ queryKey: ['client-order', orderId] });
          navigation.replace('ClientOrderDetail', { orderId });
        }}
      />
    </AppScreen>
  );
}
