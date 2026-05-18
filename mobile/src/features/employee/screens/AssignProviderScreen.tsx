import { Alert, FlatList, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { adminApi } from '../../../api/admin.api';
import { ordersApi } from '../../../api/orders.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function AssignProviderScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const providersQuery = useQuery({ queryKey: ['providers', 'assign', orderId], queryFn: () => adminApi.getProviders({ order: orderId }) });
  const assignMutation = useMutation({
    mutationFn: async (providerId: number) => ordersApi.assignEmployeeOrder(orderId, { provider_id: providerId }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم تعيين المزوّد.');
      await queryClient.invalidateQueries({ queryKey: ['employee-order', orderId] });
      navigation.goBack();
    },
    onError: (error) => Alert.alert('تعذر التعيين', getDisplayError(error)),
  });

  return (
    <AppScreen title="تعيين مزوّد">
      {providersQuery.isLoading ? <LoadingState /> : null}
      {providersQuery.isError ? <ErrorState message={getDisplayError(providersQuery.error)} onRetry={providersQuery.refetch} /> : null}
      {!providersQuery.isLoading && !providersQuery.isError && !(providersQuery.data?.length) ? <EmptyState title="لا يوجد مزوّدون مناسبون حالياً" /> : null}
      <FlatList
        data={providersQuery.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.full_name ?? item.user?.full_name}</Text>
            <Text style={{ textAlign: 'right' }}>{item.provider_type ?? 'مزود خدمة'}</Text>
            <AppButton label="تعيين" onPress={() => assignMutation.mutate(item.id)} loading={assignMutation.isPending} />
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
