import { FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';
import { describeMissingDocuments } from '../../../utils/documentPresentation';
import { theme } from '../../../theme';

export function MissingDocumentRequestsScreen({ navigation }: { navigation: any }) {
  const query = useQuery({ queryKey: ['client-orders'], queryFn: () => ordersApi.getCustomerOrders() });
  const waitingOrders = (query.data ?? []).filter((item) => item.status === 'WAITING_CUSTOMER');

  return (
    <AppScreen title="طلبات النواقص" subtitle="هذه الطلبات بانتظار رفع مستندات أو استكمال بيانات من العميل.">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !waitingOrders.length ? <EmptyState title="لا توجد نواقص حالياً" /> : null}
      <FlatList
        data={waitingOrders}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.order_number}</Text>
            <Text style={{ textAlign: 'right' }}>{item.required_documents?.length
                ? describeMissingDocuments(item.missing_document_types, item.required_documents).join('، ') || 'يرجى مراجعة تفاصيل الطلب.'
                : item.missing_document_types?.length
                  // The list endpoint carries no requirement names; the detail screen shows them.
                  ? `عدد المستندات المطلوبة: ${item.missing_document_types.length}`
                  : 'يرجى مراجعة تفاصيل الطلب.'}</Text>
            <AppButton label="الرد الآن" onPress={() => navigation.navigate('RespondToMissingDocument', { orderId: item.id })} />
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
