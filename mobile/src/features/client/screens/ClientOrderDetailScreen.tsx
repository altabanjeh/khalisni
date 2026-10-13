import { Alert, Text } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { KeyValueRow } from '../../../components/KeyValueRow';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { DocumentList } from '../../documents/DocumentList';
import { ordersApi } from '../../../api/orders.api';
import { formatCurrency } from '../../../utils/format';
import { getDisplayError } from '../../../api/client';

export function ClientOrderDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['client-order', orderId], queryFn: () => ordersApi.getCustomerOrder(orderId), enabled: !!orderId });
  const [cancelFormVisible, setCancelFormVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');
  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => ordersApi.cancelCustomerOrder(orderId, { reason }),
    onSuccess: async () => {
      setCancelFormVisible(false);
      setCancelReason('');
      Alert.alert('تم', 'تم إلغاء الطلب.');
      await queryClient.invalidateQueries({ queryKey: ['client-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['client-order', orderId] });
    },
    onError: (error) => Alert.alert('تعذر الإلغاء', getDisplayError(error)),
  });

  const submitCancel = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      setCancelReasonError('سبب الإلغاء مطلوب.');
      return;
    }
    setCancelReasonError('');
    cancelMutation.mutate(reason);
  };

  return (
    <AppScreen title="تفاصيل الطلب" refreshing={query.isRefetching} onRefresh={query.refetch}>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <Text style={{ textAlign: 'right', fontSize: 22, fontWeight: '800' }}>{query.data.order_number}</Text>
            <StatusBadge status={query.data.status} />
            <KeyValueRow label="الخدمة" value={query.data.service?.name_ar} />
            <KeyValueRow label="المدينة" value={query.data.city} />
            <KeyValueRow label="السعر النهائي" value={formatCurrency(query.data.final_price)} />
            {query.data.missing_document_types?.length ? (
              <Text style={{ textAlign: 'right' }}>النواقص: {query.data.missing_document_types.join('، ')}</Text>
            ) : null}
          </AppCard>
          <DocumentList documents={query.data.documents} />
          {query.data.status === 'WAITING_CUSTOMER' ? (
            <AppButton label="الرد على طلب النواقص" onPress={() => navigation.navigate('RespondToMissingDocument', { orderId })} />
          ) : null}
          {(query.data.documents ?? []).some((document) => document.is_final_document) ? (
            <AppButton label="عرض المستند النهائي" variant="secondary" onPress={() => navigation.navigate('FinalDocument', { orderId })} />
          ) : null}
          {query.data.allowed_actions?.can_cancel && !cancelFormVisible ? (
            <AppButton label="إلغاء الطلب" variant="danger" onPress={() => setCancelFormVisible(true)} />
          ) : null}
          {query.data.allowed_actions?.can_cancel && cancelFormVisible ? (
            <AppCard>
              <AppInput
                label="سبب الإلغاء"
                value={cancelReason}
                onChangeText={(value) => {
                  setCancelReason(value);
                  if (value.trim()) setCancelReasonError('');
                }}
                multiline
                error={cancelReasonError}
              />
              <AppButton label="تأكيد إلغاء الطلب" variant="danger" onPress={submitCancel} loading={cancelMutation.isPending} />
              <AppButton label="تراجع" variant="secondary" onPress={() => setCancelFormVisible(false)} />
            </AppCard>
          ) : null}
        </>
      ) : null}
    </AppScreen>
  );
}
