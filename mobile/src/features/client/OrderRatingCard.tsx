import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from '../../api/orders.api';
import { getDisplayError } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { theme } from '../../theme';
import type { Order } from '../../types/order';
import { formatDateTime, toArabicDigits } from '../../utils/format';
import { RATING_LABELS_AR, RATING_SCORES, buildRatingPayload, canRateOrder, validateRating } from '../../utils/rating';

function Stars({ score, onSelect }: { score: number; onSelect?: (value: number) => void }) {
  return (
    // row-reverse: the first star is on the right, as Arabic readers expect.
    <View style={styles.stars} accessibilityRole={onSelect ? 'radiogroup' : undefined}>
      {RATING_SCORES.map((value) => {
        const filled = value <= score;
        const icon = <Ionicons name={filled ? 'star' : 'star-outline'} size={34} color={filled ? '#f59e0b' : theme.colors.textSoft} />;
        if (!onSelect) return <View key={value} style={styles.starStatic}>{icon}</View>;
        return (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === score }}
            accessibilityLabel={`${toArabicDigits(value)} من ٥ — ${RATING_LABELS_AR[value]}`}
            onPress={() => onSelect(value)}
            style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
          >
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

// Rating of a completed order (audit M-15): 1-5 stars as 52pt touch targets
// plus an optional comment; once rated, the stored rating is shown instead.
export function OrderRatingCard({ order }: { order: Order }) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => ordersApi.submitRating(order.id, buildRatingPayload(score, comment)),
    onSuccess: async () => {
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['client-order', order.id] });
      await queryClient.invalidateQueries({ queryKey: ['client-order', String(order.id)] });
    },
    onError: (submitError) => setError(getDisplayError(submitError)),
  });

  if (order.rating) {
    return (
      <AppCard>
        <Text style={styles.title}>تقييمك للخدمة</Text>
        <Stars score={order.rating.score} />
        <Text style={styles.muted}>{RATING_LABELS_AR[order.rating.score] ?? ''}</Text>
        {order.rating.comment ? <Text style={styles.comment}>{order.rating.comment}</Text> : null}
        {order.rating.created_at ? <Text style={styles.muted}>{formatDateTime(order.rating.created_at)}</Text> : null}
      </AppCard>
    );
  }

  if (!canRateOrder(order)) return null;

  const submit = () => {
    const validation = validateRating(score);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    mutation.mutate();
  };

  return (
    <AppCard>
      <Text style={styles.title}>قيّم الخدمة</Text>
      <Text style={styles.muted}>كيف كانت تجربتك مع هذا الطلب؟</Text>
      <Stars score={score} onSelect={(value) => { setScore(value); setError(''); }} />
      {score ? <Text style={styles.muted}>{RATING_LABELS_AR[score]}</Text> : null}
      <AppInput label="تعليق (اختياري)" value={comment} onChangeText={setComment} multiline />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="إرسال التقييم" onPress={submit} loading={mutation.isPending} />
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.extraBold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  stars: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    gap: theme.spacing.xs,
  },
  starButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  starStatic: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  muted: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  comment: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
