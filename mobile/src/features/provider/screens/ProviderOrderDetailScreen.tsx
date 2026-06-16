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
  const providerInstructions = query.data?.provider_instructions?.trim() || '';

  return (
    <AppScreen title="ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù…Ù„">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <>
          <AppCard>
            <StatusBadge status={query.data.status} />
            <KeyValueRow label="Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨" value={query.data.order_number} />
            <KeyValueRow label="Ø§Ù„Ø®Ø¯Ù…Ø©" value={query.data.service?.name_ar} />
            <KeyValueRow label="Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©" value={query.data.city} />
            <Text style={{ textAlign: 'right' }}>Ø§Ù„ØªØ¹Ù„ÙŠÙ…Ø§Øª: {providerInstructions || 'Ù„Ø§ ØªÙˆØ¬Ø¯ ØªØ¹Ù„ÙŠÙ…Ø§Øª Ù„Ù„Ù…Ø²ÙˆØ¯.'}</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AppButton label="ØªØ­Ø¯ÙŠØ« Ø§Ù„Ø­Ø§Ù„Ø©" onPress={() => navigation.navigate('ProviderTaskUpdate', { orderId })} style={{ flex: 1 }} />
              <AppButton label="Ø±ÙØ¹ Ù…Ø³ØªÙ†Ø¯ Ù†Ù‡Ø§Ø¦ÙŠ" variant="secondary" onPress={() => navigation.navigate('UploadFinalDocument', { orderId })} style={{ flex: 1 }} />
            </View>
          </AppCard>
          <DocumentList documents={query.data.documents} />
        </>
      ) : null}
    </AppScreen>
  );
}
