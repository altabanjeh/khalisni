import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { KeyValueRow } from '../../../components/KeyValueRow';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { ordersApi } from '../../../api/orders.api';
import { DocumentList } from '../../documents/DocumentList';
import { getDisplayError } from '../../../api/client';

export function EmployeeOrderDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['employee-order', orderId], queryFn: () => ordersApi.getEmployeeOrder(orderId), enabled: !!orderId });
  const completeMutation = useMutation({
    mutationFn: async () => ordersApi.completeEmployeeOrder(orderId),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إكمال الطلب.');
      await queryClient.invalidateQueries({ queryKey: ['employee-order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['employee-orders'] });
    },
    onError: (error) => Alert.alert('تعذر الإكمال', getDisplayError(error)),
  });

  return (
    <AppScreen title="تفاصيل طلب المراجعة" refreshing={query.isRefetching} onRefresh={query.refetch}>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <StatusBadge status={query.data.status} />
            <KeyValueRow label="رقم الطلب" value={query.data.order_number} />
            <KeyValueRow label="الخدمة" value={query.data.service?.name_ar} />
            <KeyValueRow label="العميل" value={query.data.customer?.full_name} />
            <KeyValueRow label="المزوّد" value={query.data.assigned_provider?.full_name} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AppButton label="التحقق من المستندات" onPress={() => navigation.navigate('VerifyDocuments', { orderId })} style={{ flex: 1 }} />
              <AppButton label="طلب نواقص" variant="secondary" onPress={() => navigation.navigate('RequestMissingDocument', { orderId })} style={{ flex: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AppButton label="تعيين مزوّد" variant="secondary" onPress={() => navigation.navigate('AssignProvider', { orderId })} style={{ flex: 1 }} />
              <AppButton label="إكمال الطلب" onPress={() => completeMutation.mutate()} loading={completeMutation.isPending} style={{ flex: 1 }} />
            </View>
          </AppCard>
          <DocumentList documents={query.data.documents} />
        </>
      ) : null}
    </AppScreen>
  );
}
