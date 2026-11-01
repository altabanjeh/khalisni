import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { publicSiteApi } from '../../api/publicSite.api';
import { AppCard } from '../../components/AppCard';
import { AppScreen } from '../../components/AppScreen';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { theme } from '../../theme';
import { formatDate } from '../../utils/format';
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_NOT_PUBLISHED,
  LEGAL_TITLES,
  isLegalKind,
  loadLegalDocument,
  splitLegalBody,
} from '../../utils/legal';

// Privacy policy / terms of use inside the app (route params: { kind:
// "privacy" | "terms" }), loaded from GET /api/public-site/legal/<kind>/.
export function LegalDocumentScreen({ route }: { route: { params?: { kind?: string } } }) {
  const kind = isLegalKind(route.params?.kind) ? route.params.kind : 'privacy';
  const query = useQuery({
    queryKey: ['legal-document', kind],
    queryFn: () => loadLegalDocument(kind, (value) => publicSiteApi.getLegalDocument(value)),
  });
  const result = query.data;

  return (
    <AppScreen
      title={result?.state === 'published' && result.document.title_ar ? result.document.title_ar : LEGAL_TITLES[kind]}
      refreshing={query.isRefetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isLoading ? <LoadingState /> : null}
      {result?.state === 'error' ? <ErrorState message={result.message} onRetry={() => void query.refetch()} /> : null}
      {result?.state === 'not_published' ? (
        <EmptyState title={LEGAL_NOT_PUBLISHED} description={`لم تُنشر ${LEGAL_TITLES[kind]} في التطبيق حتى الآن. يرجى المحاولة لاحقاً.`} />
      ) : null}
      {result?.state === 'published' ? (
        <View style={styles.stack}>
          {result.draft ? (
            <AppCard style={styles.draftBanner} accessibilityRole="alert">
              <Text style={styles.draftText}>{LEGAL_DRAFT_BANNER}</Text>
            </AppCard>
          ) : null}
          <AppCard>
            {result.document.effective_date || result.document.version ? (
              <Text style={styles.meta}>
                {[
                  result.document.effective_date ? `تاريخ السريان: ${formatDate(result.document.effective_date)}` : null,
                  result.document.version ? `الإصدار: ${result.document.version}` : null,
                ].filter(Boolean).join(' — ')}
              </Text>
            ) : null}
            {splitLegalBody(result.document.body_ar).map((block, index) => (
              <Text
                key={index}
                style={block.type === 'heading' ? styles.heading : styles.paragraph}
              >
                {block.type === 'bullet' ? `• ${block.text}` : block.text}
              </Text>
            ))}
          </AppCard>
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: theme.spacing.md },
  draftBanner: {
    backgroundColor: '#fffbeb',
    borderColor: theme.colors.warning,
  },
  draftText: {
    color: '#92400e',
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
  meta: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  heading: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  paragraph: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
});
