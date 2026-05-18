import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { KeyValueRow } from '../../../components/KeyValueRow';
import { LoadingState } from '../../../components/LoadingState';
import { StatusBadge } from '../../../components/StatusBadge';
import { ordersApi } from '../../../api/orders.api';
import { DocumentList } from '../../documents/DocumentList';
import { getDisplayError } from '../../../api/client';

export function ProviderOrderDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const orderId = route.params?.orderId;
  const query = useQuery({ queryKey: ['provider-order', orderId], queryFn: () => ordersApi.getProviderOrder(orderId), enabled: !!orderId });

  return (
    <AppScreen title="تفاصيل العمل">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <StatusBadge status={query.data.status} />
            <KeyValueRow label="رقم الطلب" value={query.data.order_number} />
            <KeyValueRow label="الخدمة" value={query.data.service?.name_ar} />
            <KeyValueRow label="المدينة" value={query.data.city} />
            <Text style={{ textAlign: 'right' }}>التعليمات: {(query.data.notes ?? []).map((note) => note.note).join(' | ') || 'لا توجد تعليمات إضافية.'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AppButton label="تحديث الحالة" onPress={() => navigation.navigate('ProviderTaskUpdate', { orderId })} style={{ flex: 1 }} />
              <AppButton label="رفع مستند نهائي" variant="secondary" onPress={() => navigation.navigate('UploadFinalDocument', { orderId })} style={{ flex: 1 }} />
            </View>
          </AppCard>
          <DocumentList documents={query.data.documents} />
        </>
      ) : null}
    </AppScreen>
  );
}
