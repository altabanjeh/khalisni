import { Image, StyleSheet, Text, View } from 'react-native';

import type { PublicAdvertisement } from '../../types/publicSite';
import { theme } from '../../theme';
import { AppButton } from '../AppButton';
import { AppCard } from '../AppCard';

interface PublicAdvertisementCardProps {
  advertisement: PublicAdvertisement;
  compact?: boolean;
  onPressAction?: () => void;
}

export function PublicAdvertisementCard({
  advertisement,
  compact = false,
  onPressAction,
}: PublicAdvertisementCardProps) {
  const backgroundColor = advertisement.background_color || theme.colors.surface;
  const textColor = advertisement.text_color || theme.colors.text;

  return (
    <AppCard style={[styles.card, compact ? styles.compact : null, { backgroundColor }]}>
      <Text style={[styles.type, { color: textColor }]}>{advertisement.advertisement_type.replace(/_/g, ' ')}</Text>
      <Text style={[styles.title, { color: textColor }]}>
        {advertisement.title_ar || advertisement.title_en || 'إعلان'}
      </Text>
      <Text style={[styles.description, { color: textColor }]}>
        {advertisement.description_ar || advertisement.description_en || 'لا يوجد وصف إضافي.'}
      </Text>
      {advertisement.image_url ? <Image source={{ uri: advertisement.image_url }} style={styles.image} /> : null}
      {onPressAction && (advertisement.button_text_ar || advertisement.button_text_en) ? (
        <AppButton
          label={advertisement.button_text_ar || advertisement.button_text_en || 'عرض'}
          onPress={onPressAction}
          variant="secondary"
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
  },
  compact: {
    padding: theme.spacing.md,
  },
  type: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.xs,
    opacity: 0.75,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.xl,
    textAlign: 'right',
  },
  description: {
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  image: {
    borderRadius: theme.spacing.radiusMd,
    height: 180,
    width: '100%',
  },
});
