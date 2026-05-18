import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { MetricCard } from '../../../components/MetricCard';
import { reportsApi } from '../../../api/reports.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function AdminDashboardScreen({ navigation }: { navigation: any }) {
  const query = useQuery({ queryKey: ['admin-dashboard'], queryFn: () => reportsApi.getAdminDashboard() });

  return (
    <AppScreen title="لوحة الإدارة" subtitle="رؤية تشغيلية سريعة للطلبات والخدمات والاختناقات الحالية.">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <View style={styles.metrics}>
            <MetricCard label="طلبات جديدة اليوم" value={query.data.cards.new_orders_today as number} />
            <MetricCard label="قيد التنفيذ" value={query.data.cards.orders_in_progress as number} />
          </View>
          <View style={styles.metrics}>
            <MetricCard label="بانتظار العميل" value={query.data.cards.waiting_customer as number} />
            <MetricCard label="متأخرة" value={query.data.cards.delayed_orders as number} />
          </View>
          <View style={styles.actions}>
            <AppButton label="إدارة الطلبات" onPress={() => navigation.navigate('ManageOrders')} style={styles.action} />
            <AppButton label="المستخدمون" variant="secondary" onPress={() => navigation.navigate('ManageUsers')} style={styles.action} />
          </View>
          <View style={styles.actions}>
            <AppButton label="الخدمات" variant="secondary" onPress={() => navigation.navigate('ManageServices')} style={styles.action} />
            <AppButton label="الأسعار" variant="secondary" onPress={() => navigation.navigate('ManagePrices')} style={styles.action} />
          </View>
          <View style={styles.actions}>
            <AppButton label="الإعلانات" variant="secondary" onPress={() => navigation.navigate('ManageAdvertisements')} style={styles.action} />
            <AppButton label="المحتوى العام" variant="secondary" onPress={() => navigation.navigate('ManagePublicContent')} style={styles.action} />
          </View>
          <View style={styles.actions}>
            <AppButton label="الصلاحيات" variant="secondary" onPress={() => navigation.navigate('ManageRoles')} style={styles.action} />
            <AppButton label="سجل التدقيق" variant="secondary" onPress={() => navigation.navigate('AuditLog')} style={styles.action} />
          </View>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: theme.spacing.md },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { flex: 1 },
});
