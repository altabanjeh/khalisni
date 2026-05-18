import { Pressable, Text, View, StyleSheet } from 'react-native';

import { AppCard } from './AppCard';
import { StatusBadge } from './StatusBadge';
import { formatDate } from '../utils/format';
import type { Order } from '../types/order';
import { theme } from '../theme';

export function OrderCard({ order, onPress }: { order: Order; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <AppCard style={styles.card}>
        <View style={styles.topRow}>
          <StatusBadge status={order.status} />
          <View style={styles.topText}>
            <Text style={styles.orderNumber}>{order.order_number}</Text>
            <Text style={styles.serviceName}>{order.service?.name_ar ?? 'خدمة غير محددة'}</Text>
          </View>
        </View>
        <Text style={styles.meta}>المدينة: {order.city ?? 'غير محددة'}</Text>
        <Text style={styles.meta}>آخر تحديث: {formatDate(order.updated_at)}</Text>
      </AppCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing.sm },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.md },
  topText: { flex: 1, gap: theme.spacing.xs },
  orderNumber: { color: theme.colors.primaryDark, fontFamily: theme.typography.fontFamily.extraBold, fontSize: theme.typography.size.lg, textAlign: 'right' },
  serviceName: { color: theme.colors.text, fontSize: theme.typography.size.md, textAlign: 'right', fontFamily: theme.typography.fontFamily.medium },
  meta: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, textAlign: 'right', fontFamily: theme.typography.fontFamily.regular },
});
