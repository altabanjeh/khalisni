import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { PublicServiceCard } from '../../../components/public/PublicServiceCard';
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';
import { formatCurrency } from '../../../utils/format';
import { getRequiredDocumentLabel } from '../../../utils/serviceForms';

export function ServiceDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const slug = route.params?.slug;
  const query = useQuery({ queryKey: ['service', slug], queryFn: () => servicesApi.getService(slug), enabled: !!slug });

  const pricing = query.data?.pricing ?? {};
  const deliveryTime = query.data?.delivery_time ?? {};

  return (
    <AppScreen title="تفاصيل الخدمة">
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {query.data ? (
        <View style={styles.stack}>
          <AppCard style={styles.heroCard}>
            <Text style={styles.category}>{query.data.category?.name_ar || 'الخدمة'}</Text>
            <Text style={styles.title}>{query.data.name_ar}</Text>
            <Text style={styles.description}>
              {query.data.description_ar || query.data.description_en || 'لا يوجد وصف مفصل لهذه الخدمة حالياً.'}
            </Text>
            <View style={styles.metricRow}>
              <AppCard variant="muted" style={styles.metricCard}>
                <Text style={styles.metricLabel}>التسليم</Text>
                <Text style={styles.metricValue}>{deliveryTime.label_ar || deliveryTime.label || 'يحدد لاحقاً'}</Text>
              </AppCard>
              <AppCard variant="muted" style={styles.metricCard}>
                <Text style={styles.metricLabel}>السعر الظاهر</Text>
                <Text style={styles.metricValue}>
                  {pricing.total_price != null ? formatCurrency(Number(pricing.total_price)) : pricing.public_note_ar || 'يحدد بعد المراجعة'}
                </Text>
              </AppCard>
              <AppCard variant="muted" style={styles.metricCard}>
                <Text style={styles.metricLabel}>تفاصيل الرسوم</Text>
                <Text style={styles.metricValue}>
                  {pricing.government_fee != null || pricing.company_fee != null
                    ? [
                        pricing.government_fee != null ? `حكومي: ${formatCurrency(Number(pricing.government_fee))}` : null,
                        pricing.company_fee != null ? `خدمة: ${formatCurrency(Number(pricing.company_fee))}` : null,
                      ].filter(Boolean).join(' | ')
                    : 'الرسوم التفصيلية مخفية'}
                </Text>
              </AppCard>
            </View>
            <AppButton
              label="طلب الخدمة"
              onPress={() => navigation.navigate('CreateOrder', { serviceId: query.data?.id, slug })}
            />
          </AppCard>

          <AppCard>
            <Text style={styles.sectionTitle}>الوثائق المطلوبة</Text>
            <View style={styles.stack}>
              {(query.data.required_documents ?? []).map((document, index) => (
                <AppCard key={document.id || `${document.document_type}-${index}`} variant="muted">
                  <Text style={styles.listItemTitle}>{getRequiredDocumentLabel(document)}</Text>
                  <Text style={styles.listItemText}>
                    {document.instructions_ar || (document.is_required === false ? 'ملف اختياري' : 'ملف مطلوب')}
                  </Text>
                </AppCard>
              ))}
              {!query.data.required_documents?.length ? (
                <Text style={styles.emptyText}>لا توجد وثائق محددة لهذه الخدمة حالياً.</Text>
              ) : null}
            </View>
          </AppCard>

          <AppCard>
            <Text style={styles.sectionTitle}>خطوات التنفيذ</Text>
            <View style={styles.stack}>
              {(query.data.steps ?? []).map((step, index) => (
                <AppCard key={`${step}-${index}`} variant="muted" style={styles.stepCard}>
                  <Text style={styles.stepIndex}>0{index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </AppCard>
              ))}
            </View>
          </AppCard>

          {query.data.terms_ar ? (
            <AppCard>
              <Text style={styles.sectionTitle}>شروط وملاحظات</Text>
              <Text style={styles.description}>{query.data.terms_ar}</Text>
            </AppCard>
          ) : null}

          {query.data.related_services?.length ? (
            <View style={styles.stack}>
              <Text style={styles.sectionTitle}>خدمات ذات صلة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedRow}>
                {query.data.related_services.map((service) => (
                  <View key={service.id} style={styles.relatedCard}>
                    <PublicServiceCard
                      service={{
                        ...service,
                        category: service.category || query.data?.category,
                        description_ar: service.description_ar || 'خدمة مرتبطة من نفس التصنيف.',
                      }}
                      onPress={() => navigation.push('ServiceDetail', { slug: service.slug })}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  heroCard: {
    gap: theme.spacing.md,
  },
  category: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xxl,
    textAlign: 'right',
  },
  description: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  metricRow: {
    gap: theme.spacing.sm,
  },
  metricCard: {
    gap: theme.spacing.xs,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.xs,
    textAlign: 'right',
  },
  metricValue: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  listItemTitle: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  listItemText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  stepCard: {
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: theme.spacing.md,
  },
  stepIndex: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.md,
  },
  stepText: {
    color: theme.colors.text,
    flex: 1,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  relatedRow: {
    gap: theme.spacing.md,
  },
  relatedCard: {
    width: 280,
  },
});
