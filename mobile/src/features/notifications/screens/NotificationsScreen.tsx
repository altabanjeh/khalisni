import { Alert, FlatList, Text, View, StyleSheet } from 'react-native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { notificationsApi } from '../../../api/notifications.api';
import { useAuthStore } from '../../../state/authStore';
import { formatDateTime } from '../../../utils/format';
import { getDisplayError, pageFromNextLink } from '../../../api/client';
import { AppButton } from '../../../components/AppButton';
import { theme } from '../../../theme';

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const role = useAuthStore((state) => state.role);
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  // The list is paginated server-side; further pages load on demand instead of
  // stopping silently at the first 20.
  const query = useInfiniteQuery({
    queryKey: ['notifications', role],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      role === 'admin'
        ? notificationsApi.getAdminNotificationsPage({ page: pageParam })
        : notificationsApi.getNotificationsPage({ page: pageParam }),
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.next ? pageFromNextLink(lastPage.next) ?? lastPageParam + 1 : undefined,
  });
  const items = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count ?? items.length;
  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  return (
    <AppScreen
      title="الإشعارات"
      subtitle="تابع آخر التحديثات والتنبيهات المرتبطة بطلباتك."
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.isError && !items.length ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !items.length ? <EmptyState title="لا توجد إشعارات حالياً" /> : null}
      {role !== 'admin' && items.some((item) => !item.is_read) ? (
        <AppButton
          label="تمييز الكل كمقروء"
          variant="secondary"
          onPress={() => {
            notificationsApi
              .markAllAsRead()
              .then(invalidateNotifications)
              .catch((error) => Alert.alert('تعذر التحديث', getDisplayError(error)));
          }}
        />
      ) : null}
      <FlatList
        data={items}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
            <View style={styles.actions}>
              {item.order ? <AppButton label="فتح الطلب" onPress={() => navigation.navigate('OrderDetailResolver', { orderId: item.order })} style={styles.button} /> : null}
              {/* Read state is personal: the admin log also lists other users' notifications,
                  which the mark-read endpoint answers with 404. */}
              {!item.is_read && (role !== 'admin' || item.recipient === userId) ? (
                <AppButton
                  label="تمييز كمقروء"
                  variant="secondary"
                  onPress={() => {
                    notificationsApi
                      .markAsRead(item.id)
                      .then(invalidateNotifications)
                      .catch((error) => {
                        Alert.alert('تعذر التحديث', getDisplayError(error));
                      });
                  }}
                  style={styles.button}
                />
              ) : null}
            </View>
          </AppCard>
        )}
      />
      {items.length ? <Text style={styles.meta}>المعروض {items.length} من {total}</Text> : null}
      {query.hasNextPage ? (
        <AppButton
          label="تحميل المزيد"
          variant="secondary"
          loading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
      {query.isError && items.length ? <Text style={styles.error}>{getDisplayError(query.error)}</Text> : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: theme.typography.size.md, fontFamily: theme.typography.fontFamily.bold, textAlign: 'right' },
  error: { color: theme.colors.danger, fontSize: theme.typography.size.sm, textAlign: 'right' },
  message: { color: theme.colors.text, fontSize: theme.typography.size.md, textAlign: 'right' },
  meta: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  button: { flex: 1 },
});
