import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { documentsApi } from '../../../api/documents.api';
import { DocumentVerificationPanel } from '../../documents/DocumentVerificationPanel';
import { getDisplayError } from '../../../api/client';

export function VerifyDocumentsScreen({ route }: { route: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['staff-documents'], queryFn: () => documentsApi.getStaffDocuments() });
  const documents = useMemo(() => (query.data ?? []).filter((item) => item.order?.id === orderId), [orderId, query.data]);

  return (
    <AppScreen title="التحقق من المستندات">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      <DocumentVerificationPanel
        documents={documents}
        onVerified={() => {
          void query.refetch();
          void queryClient.invalidateQueries({ queryKey: ['employee-order', orderId] });
        }}
      />
    </AppScreen>
  );
}
