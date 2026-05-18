import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { MetricCard } from '../../../components/MetricCard';
import { OrderCard } from '../../../components/OrderCard';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ProviderDashboardScreen({ navigation }: { navigation: any }) {
  const dashboardQuery = useQuery({ queryKey: ['provider-dashboard'], queryFn: () => ordersApi.getProviderDashboard() });
  const ordersQuery = useQuery({ queryKey: ['provider-orders'], queryFn: () => ordersApi.getProviderOrders() });

  if (dashboardQuery.isLoading || ordersQuery.isLoading) {
    return <LoadingState />;
  }

  if (dashboardQuery.isError || ordersQuery.isError) {
    return <ErrorState message={getDisplayError(dashboardQuery.error ?? ordersQuery.error)} onRetry={() => { dashboardQuery.refetch(); ordersQuery.refetch(); }} />;
  }

  return (
    <AppScreen title="لوحة المزوّد" subtitle="تابع الأعمال المسندة وارفع المستندات النهائية عند اكتمال المعاملة.">
      <View style={styles.metrics}>
        <MetricCard label="الطلبات المسندة" value={dashboardQuery.data?.assigned_orders} />
        <MetricCard label="قيد التنفيذ" value={dashboardQuery.data?.in_progress} />
      </View>
      <View style={styles.metrics}>
        <MetricCard label="جاهز للتسليم" value={dashboardQuery.data?.ready_for_delivery} />
        <MetricCard label="مكتمل" value={dashboardQuery.data?.completed} />
      </View>
      <AppButton label="عرض كل الأعمال" onPress={() => navigation.navigate('AssignedOrders')} />
      {(ordersQuery.data ?? []).slice(0, 3).map((order) => (
        <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('ProviderOrderDetail', { orderId: order.id })} />
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: theme.spacing.md },
});
