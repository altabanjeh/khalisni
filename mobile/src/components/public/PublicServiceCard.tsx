import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Service } from '../../types/service';
import { theme } from '../../theme';
import { formatCurrency } from '../../utils/format';
import { AppCard } from '../AppCard';

interface PublicServiceCardProps {
  service: Service;
  onPress?: () => void;
  onPrimaryAction?: () => void;
  primaryLabel?: string;
}

function getPublicPrice(service: Service) {
  if (service.pricing?.total_price != null) return Number(service.pricing.total_price);
  if (service.total_fee != null) return Number(service.total_fee);
  return Number(service.service_fee || 0) + Number(service.government_fee || 0);
}

function getDeliveryLabel(service: Service) {
  return service.delivery_time?.label_ar || service.delivery_time?.label || `المدة: ${service.estimated_duration || 'غير محددة'} يوم`;
}

export function PublicServiceCard({
  service,
  onPress,
  onPrimaryAction,
  primaryLabel = 'عرض التفاصيل',
}: PublicServiceCardProps) {
  const Wrapper = onPress ? Pressable : View;
  const publicPrice = service.pricing?.total_price != null ? formatCurrency(getPublicPrice(service)) : null;
  const priceLabel = publicPrice || service.pricing?.public_note_ar || 'السعر يحدد بعد المراجعة';

  return (
    <Wrapper onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{service.category?.name_ar || 'خدمة'}</Text>
        </View>
        <Text style={styles.title}>{service.name_ar}</Text>
        <Text numberOfLines={3} style={styles.description}>
          {service.description_ar || service.description_en || 'لا يوجد وصف مفصل لهذه الخدمة حالياً.'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{getDeliveryLabel(service)}</Text>
          <Text style={styles.priceText}>{priceLabel}</Text>
        </View>
        {onPrimaryAction ? (
          <Pressable onPress={onPrimaryAction} style={styles.cta}>
            <Text style={styles.ctaText}>{primaryLabel}</Text>
          </Pressable>
        ) : null}
      </AppCard>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  categoryChip: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
  },
  categoryText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.xs,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  description: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  metaText: {
    color: theme.colors.textMuted,
    flex: 1,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  priceText: {
    color: theme.colors.primary,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  cta: {
    alignSelf: 'stretch',
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  ctaText: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'center',
  },
});
