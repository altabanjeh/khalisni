import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { reportsApi } from '../../../api/reports.api';
import { getDisplayError } from '../../../api/client';

export function ReportsDashboardScreen() {
  const dailyQuery = useQuery({ queryKey: ['daily-report'], queryFn: () => reportsApi.getDailyReport() });
  const weeklyQuery = useQuery({ queryKey: ['weekly-report'], queryFn: () => reportsApi.getWeeklyReport() });
  const summaryQuery = useQuery({ queryKey: ['ops-summary'], queryFn: () => reportsApi.getOperationalSummary() });

  if (dailyQuery.isLoading || weeklyQuery.isLoading || summaryQuery.isLoading) return <LoadingState />;
  if (dailyQuery.isError || weeklyQuery.isError || summaryQuery.isError) {
    return <ErrorState message={getDisplayError(dailyQuery.error ?? weeklyQuery.error ?? summaryQuery.error)} onRetry={() => { dailyQuery.refetch(); weeklyQuery.refetch(); summaryQuery.refetch(); }} />;
  }

  return (
    <AppScreen title="التقارير">
      <AppCard>
        <Text style={{ textAlign: 'right', fontWeight: '700' }}>تقرير اليوم</Text>
        <Text style={{ textAlign: 'right' }}>{JSON.stringify(dailyQuery.data, null, 2)}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ textAlign: 'right', fontWeight: '700' }}>التقرير الأسبوعي</Text>
        <Text style={{ textAlign: 'right' }}>{JSON.stringify(weeklyQuery.data, null, 2)}</Text>
      </AppCard>
      <AppCard>
        <Text style={{ textAlign: 'right', fontWeight: '700' }}>الملخص التشغيلي</Text>
        <Text style={{ textAlign: 'right' }}>{JSON.stringify(summaryQuery.data, null, 2)}</Text>
      </AppCard>
    </AppScreen>
  );
}
