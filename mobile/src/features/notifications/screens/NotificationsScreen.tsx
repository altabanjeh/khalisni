import { Alert, FlatList, Text, View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { notificationsApi } from '../../../api/notifications.api';
import { useAuthStore } from '../../../state/authStore';
import { formatDateTime } from '../../../utils/format';
import { getDisplayError } from '../../../api/client';
import { AppButton } from '../../../components/AppButton';
import { theme } from '../../../theme';

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const role = useAuthStore((state) => state.role);
  const query = useQuery({
    queryKey: ['notifications', role],
    queryFn: () => role === 'admin' ? notificationsApi.getAdminNotifications() : notificationsApi.getNotifications(),
  });

  return (
    <AppScreen title="الإشعارات" subtitle="تابع آخر التحديثات والتنبيهات المرتبطة بطلباتك.">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !(query.data?.length) ? <EmptyState title="لا توجد إشعارات حالياً" /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
            <View style={styles.actions}>
              {item.order ? <AppButton label="فتح الطلب" onPress={() => navigation.navigate('OrderDetailResolver', { orderId: item.order })} style={styles.button} /> : null}
              <AppButton
                label="تمييز كمقروء"
                variant="secondary"
                onPress={() => {
                  notificationsApi.markAsRead(item.id).catch((error) => {
                    Alert.alert('غير مدعوم حالياً', getDisplayError(error));
                  });
                }}
                style={styles.button}
              />
            </View>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  message: { color: theme.colors.text, fontSize: theme.typography.size.md, textAlign: 'right' },
  meta: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  button: { flex: 1 },
});
