import { FlatList, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { adminApi } from '../../../api/admin.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function AuditLogScreen() {
  const query = useQuery({ queryKey: ['audit-logs'], queryFn: () => adminApi.getAuditLogs() });

  return (
    <AppScreen title="سجل التدقيق">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item, index) => String(item.id ?? index)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.action ?? 'log'}</Text>
            <Text style={{ textAlign: 'right' }}>{item.entity_type} #{item.entity_id}</Text>
            <Text style={{ textAlign: 'right' }}>{item.created_at}</Text>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
