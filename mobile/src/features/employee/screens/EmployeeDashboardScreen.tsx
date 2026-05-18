import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { MetricCard } from '../../../components/MetricCard';
import { OrderCard } from '../../../components/OrderCard';
import { reportsApi } from '../../../api/reports.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function EmployeeDashboardScreen({ navigation }: { navigation: any }) {
  const query = useQuery({ queryKey: ['employee-dashboard'], queryFn: () => reportsApi.getEmployeeDashboard() });

  return (
    <AppScreen title="لوحة الموظف" subtitle="مراجعة الطلبات والتحقق من المستندات وإدارة النواقص.">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="بانتظار المراجعة" value={query.data.summary.waiting_review} />
            <MetricCard label="نواقص راجعة" value={query.data.summary.missing_documents_returned} />
          </View>
          <View style={styles.metrics}>
            <MetricCard label="العمل المكلّف" value={query.data.summary.assigned_workload} />
            <MetricCard label="قريب من الموعد" value={query.data.summary.near_deadline} />
          </View>
          <AppButton label="فتح قائمة المراجعة" onPress={() => navigation.navigate('ReviewOrders')} />
          {(query.data.queues?.waiting_review ?? []).slice(0, 3).map((order) => (
            <OrderCard key={order.id} order={order} onPress={() => navigation.navigate('EmployeeOrderDetail', { orderId: order.id })} />
          ))}
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: theme.spacing.md },
});
