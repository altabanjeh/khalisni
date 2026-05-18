import { Alert, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { KeyValueRow } from '../../../components/KeyValueRow';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { ordersApi } from '../../../api/orders.api';
import { DocumentList } from '../../documents/DocumentList';
import { getDisplayError } from '../../../api/client';

export function AdminOrderDetailScreen({ route }: { route: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-order', orderId], queryFn: () => ordersApi.getAdminOrder(orderId), enabled: !!orderId });
  const [status, setStatus] = useState('UNDER_REVIEW');
  const [reason, setReason] = useState('');

  const statusMutation = useMutation({
    mutationFn: async () => ordersApi.changeOrderStatus(orderId, { status, note: reason }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم تحديث حالة الطلب.');
      await queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => Alert.alert('تعذر التحديث', getDisplayError(error)),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => ordersApi.rejectOrder(orderId, { reason: reason || 'Rejected from mobile admin panel' }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم رفض الطلب.');
      await queryClient.invalidateQueries({ queryKey: ['admin-order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => Alert.alert('تعذر الرفض', getDisplayError(error)),
  });

  return (
    <AppScreen title="تفاصيل طلب الإدارة">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <StatusBadge status={query.data.status} />
            <KeyValueRow label="رقم الطلب" value={query.data.order_number} />
            <KeyValueRow label="الخدمة" value={query.data.service?.name_ar} />
            <KeyValueRow label="العميل" value={query.data.customer?.full_name} />
            <Text style={{ textAlign: 'right' }}>الملاحظات الداخلية: {query.data.internal_notes || 'لا توجد'}</Text>
            <AppInput label="الحالة الجديدة" value={status} onChangeText={setStatus} />
            <AppInput label="ملاحظة / سبب" value={reason} onChangeText={setReason} multiline />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AppButton label="تحديث الحالة" onPress={() => statusMutation.mutate()} loading={statusMutation.isPending} style={{ flex: 1 }} />
              <AppButton label="رفض الطلب" variant="danger" onPress={() => rejectMutation.mutate()} loading={rejectMutation.isPending} style={{ flex: 1 }} />
            </View>
          </AppCard>
          <DocumentList documents={query.data.documents} />
        </>
      ) : null}
    </AppScreen>
  );
}
