import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { DocumentUploadWidget } from '../../documents/DocumentUploadWidget';
import { documentsApi } from '../../../api/documents.api';
import { getDisplayError } from '../../../api/client';

export function UploadFinalDocumentScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();

  return (
    <AppScreen title="رفع المستند النهائي">
      <DocumentUploadWidget
        defaultDocumentType="final_document"
        onSubmit={async ({ documentType, file }) => {
          const formData = new FormData();
          formData.append('document_type', documentType);
          formData.append('is_final_document', 'true');
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType ?? 'application/octet-stream',
          } as any);
          try {
            await documentsApi.uploadProviderFinalDocument(orderId, formData);
            await queryClient.invalidateQueries({ queryKey: ['provider-order', orderId] });
            await queryClient.invalidateQueries({ queryKey: ['provider-orders'] });
            Alert.alert('تم', 'تم رفع المستند النهائي.');
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
