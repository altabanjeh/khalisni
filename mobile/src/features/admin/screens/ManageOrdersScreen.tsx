import { FlatList, View } from 'react-native';

import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { LoadMoreFooter } from '../../../components/LoadMoreFooter';
import { usePagedList } from '../../../hooks/usePagedList';
import { OrderCard } from '../../../components/OrderCard';
import { ADMIN_ORDERS_URL } from '../../../api/orders.api';
import type { Order } from '../../../types/order';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageOrdersScreen({ navigation }: { navigation: any }) {
  // Page by page; LoadMoreFooter below offers the next page while one exists.
  const query = usePagedList<Order>({ queryKey: ['admin-orders'], url: ADMIN_ORDERS_URL });

  return (
    <AppScreen title="إدارة الطلبات" refreshing={query.isRefetching} onRefresh={query.refetch}>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !query.items.length ? <EmptyState title="لا توجد طلبات" /> : null}
      <FlatList
        data={query.items}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate('AdminOrderDetail', { orderId: item.id })} />
        )}
      />
      <LoadMoreFooter
        shown={query.loadedCount}
        total={query.total}
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />
    </AppScreen>
  );
}
