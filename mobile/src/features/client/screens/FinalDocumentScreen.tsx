import { useQuery } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { ordersApi } from '../../../api/orders.api';
import { DocumentList } from '../../documents/DocumentList';
import { getDisplayError } from '../../../api/client';

export function FinalDocumentScreen({ route }: { route: any }) {
  const orderId = route.params?.orderId;
  const query = useQuery({ queryKey: ['client-order', orderId], queryFn: () => ordersApi.getCustomerOrder(orderId), enabled: !!orderId });

  return (
    <AppScreen title="المستند النهائي">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? <DocumentList title="المستندات النهائية" documents={(query.data.documents ?? []).filter((item) => item.is_final_document)} /> : null}
    </AppScreen>
  );
}
