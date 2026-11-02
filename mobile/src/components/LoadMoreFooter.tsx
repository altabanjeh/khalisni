import { Text, View } from 'react-native';

import { AppButton } from './AppButton';
import { theme } from '../theme';
import { pageSummary } from '../utils/pagination';

interface LoadMoreFooterProps {
  shown: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

/** Says how much of the list is shown and loads the next page on demand. */
export function LoadMoreFooter({ shown, total, hasMore, loading, onLoadMore }: LoadMoreFooterProps) {
  if (!total) return null;
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      <Text accessibilityLiveRegion="polite" style={{ textAlign: 'right', color: theme.colors.textMuted }}>
        {pageSummary(shown, total)}
      </Text>
      {hasMore ? (
        <AppButton
          accessibilityHint="يحمّل الصفحة التالية من القائمة"
          label="تحميل المزيد"
          loading={loading}
          onPress={onLoadMore}
          style={{ minHeight: 44 }}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}
