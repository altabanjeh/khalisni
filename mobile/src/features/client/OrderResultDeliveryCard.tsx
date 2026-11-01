import { StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { ordersApi } from '../../api/orders.api';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { describeResultDelivery } from '../../utils/orderDelivery';

// How the result reaches the customer: GET /api/customer/orders/<id>/delivery/.
// Hidden for the default electronic delivery without instructions, and when
// the request fails (the final result itself stays available on the screen).
export function OrderResultDeliveryCard({ orderId }: { orderId: number }) {
  const query = useQuery({
    queryKey: ['client-order-delivery', orderId],
    queryFn: () => ordersApi.getOrderDelivery(orderId),
    retry: false,
  });
  const delivery = describeResultDelivery(query.data);
  if (!delivery) return null;

  return (
    <AppCard>
      <Text style={styles.title}>طريقة استلام النتيجة</Text>
      <Text style={styles.label}>{delivery.label}</Text>
      {delivery.instructions ? <Text style={styles.text}>{delivery.instructions}</Text> : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.md,
    textAlign: 'right',
  },
  label: {
    color: theme.colors.primaryDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  text: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
});
