import { FlatList, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { OrderCard } from '../../../components/OrderCard';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageOrdersScreen({ navigation }: { navigation: any }) {
  const query = useQuery({ queryKey: ['admin-orders'], queryFn: () => ordersApi.getAdminOrders() });

  return (
    <AppScreen title="إدارة الطلبات" refreshing={query.isRefetching} onRefresh={query.refetch}>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !(query.data?.length) ? <EmptyState title="لا توجد طلبات" /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate('AdminOrderDetail', { orderId: item.id })} />
        )}
      />
    </AppScreen>
  );
}
