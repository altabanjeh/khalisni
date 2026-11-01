import { Alert, StyleSheet, Text } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { KeyValueRow } from '../../../components/KeyValueRow';
import { LoadingState } from '../../../components/LoadingState';
import { OrderTimeline } from '../../../components/OrderTimeline';
import { StatusBadge } from '../../../components/StatusBadge';
import { DocumentList } from '../../documents/DocumentList';
import { OrderMessagesCard } from '../OrderMessagesCard';
import { OrderRatingCard } from '../OrderRatingCard';
import { OrderResultDeliveryCard } from '../OrderResultDeliveryCard';
import { OrderComplaintsCard } from '../OrderComplaintsCard';
import { ordersApi } from '../../../api/orders.api';
import { servicesApi } from '../../../api/services.api';
import { formatCurrency } from '../../../utils/format';
import { getDisplayError } from '../../../api/client';
import { describeMissingDocuments } from '../../../utils/documentPresentation';
import { describeExpectedDelivery } from '../../../utils/orderDelivery';
import { getClosureReason } from '../../../utils/timelinePresentation';
import { theme } from '../../../theme';

export function ClientOrderDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['client-order', orderId], queryFn: () => ordersApi.getCustomerOrder(orderId), enabled: !!orderId });
  const order = query.data;
  // Only needed when the order has no date: the service's own "confirmed after
  // review" sentence (delivery mode after_review) comes from its public payload.
  const serviceSlug = order?.service?.slug;
  const serviceQuery = useQuery({
    queryKey: ['service', serviceSlug],
    queryFn: () => servicesApi.getService(serviceSlug as string),
    enabled: Boolean(order && !order.expected_delivery_date && serviceSlug),
    retry: false,
  });
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
      {order ? (
        <>
          <AppCard>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <StatusBadge status={order.status} />
            <KeyValueRow label="الخدمة" value={order.service?.name_ar} />
            <KeyValueRow label="المدينة" value={order.city} />
            <KeyValueRow label="السعر النهائي" value={formatCurrency(order.final_price)} />
            <KeyValueRow label="التسليم المتوقع" value={describeExpectedDelivery(order, serviceQuery.data?.delivery_time)} />
            {order.status === 'WAITING_CUSTOMER' && order.missing_document_types?.length ? (
              <Text style={styles.text}>
                المستندات المطلوبة: {describeMissingDocuments(order.missing_document_types, order.required_documents).join('، ')}
              </Text>
            ) : null}
          </AppCard>
          {['REJECTED', 'CANCELLED'].includes(order.status) ? (
            <AppCard style={{ borderColor: theme.colors.danger }}>
              <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>
                {order.status === 'REJECTED' ? 'سبب رفض الطلب' : 'سبب إلغاء الطلب'}
              </Text>
              <Text style={styles.text}>
                {getClosureReason(order) || 'لم يُذكر سبب. يمكنك التواصل مع الدعم لمزيد من التفاصيل.'}
              </Text>
            </AppCard>
          ) : null}
          <AppCard>
            <Text style={styles.sectionTitle}>ملاحظاتك</Text>
            <Text style={styles.text}>{order.customer_notes?.trim() || 'لا توجد ملاحظات مسجلة على هذا الطلب.'}</Text>
          </AppCard>
          <OrderTimeline logs={order.status_logs} />
          <DocumentList documents={order.documents} />
          {order.allowed_actions?.can_view_missing_documents_form ?? order.status === 'WAITING_CUSTOMER' ? (
            <AppButton label="الرد على طلب النواقص" onPress={() => navigation.navigate('RespondToMissingDocument', { orderId })} />
          ) : null}
          {(order.documents ?? []).some((document) => document.is_final_document) ? (
            <AppButton label="عرض المستند النهائي" variant="secondary" onPress={() => navigation.navigate('FinalDocument', { orderId })} />
          ) : null}
          <OrderResultDeliveryCard orderId={order.id} />
          <OrderRatingCard order={order} />
          <OrderMessagesCard orderId={order.id} fallbackNotes={order.notes} canSend={order.status !== 'ARCHIVED' && !order.is_archived} />
          <OrderComplaintsCard orderId={order.id} />
          {order.allowed_actions?.can_cancel && !cancelFormVisible ? (
            <AppButton label="إلغاء الطلب" variant="danger" onPress={() => setCancelFormVisible(true)} />
          ) : null}
          {order.allowed_actions?.can_cancel && cancelFormVisible ? (
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

const styles = StyleSheet.create({
  orderNumber: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  text: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
});
