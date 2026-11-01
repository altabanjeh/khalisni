import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from '../../api/orders.api';
import { getDisplayError, normalizeApiError } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { theme } from '../../theme';
import { formatDateTime } from '../../utils/format';
import {
  COMPLAINT_MAX_LENGTH,
  buildComplaintPayload,
  complaintStatusLabel,
  loadComplaints,
  validateComplaint,
} from '../../utils/complaints';

// Complaints on an order: GET/POST /api/customer/orders/<id>/complaints/.
// Each complaint shows «قيد المتابعة» until staff resolve it («تمت المعالجة»);
// the resolution note arrives as a support message on the same order.
export function OrderComplaintsCard({ orderId }: { orderId: number }) {
  const queryClient = useQueryClient();
  const [formVisible, setFormVisible] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['client-order-complaints', orderId],
    queryFn: () => loadComplaints(orderId, (id) => ordersApi.getOrderComplaints(id)),
  });
  const create = useMutation({
    mutationFn: () => ordersApi.createOrderComplaint(orderId, buildComplaintPayload(text)),
    onSuccess: async () => {
      setText('');
      setFormVisible(false);
      await queryClient.invalidateQueries({ queryKey: ['client-order-complaints', orderId] });
    },
    onError: (createError) => {
      const apiError = normalizeApiError(createError);
      setError(apiError.fieldErrors?.description?.[0] || getDisplayError(createError));
    },
  });

  // Endpoint not deployed on this backend: no complaints section.
  if (query.data?.state === 'unavailable') return null;

  const complaints = query.data?.state === 'ok' ? query.data.complaints : [];
  const submit = () => {
    const validation = validateComplaint(text);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    create.mutate();
  };

  return (
    <AppCard>
      <Text style={styles.title}>الشكاوى</Text>
      {query.isLoading ? <Text style={styles.muted}>جاري التحميل...</Text> : null}
      {query.isError ? (
        <>
          <Text style={styles.error}>{getDisplayError(query.error)}</Text>
          <AppButton label="إعادة المحاولة" variant="secondary" onPress={() => void query.refetch()} />
        </>
      ) : null}
      {query.data?.state === 'ok' && !complaints.length ? (
        <Text style={styles.muted}>إذا واجهت مشكلة في هذا الطلب يمكنك تقديم شكوى وسيتابعها فريق الدعم.</Text>
      ) : null}
      {complaints.map((complaint) => (
        <View key={complaint.id} style={styles.item}>
          <View style={[styles.badge, complaint.is_resolved ? styles.badgeResolved : styles.badgeOpen]}>
            <Text style={[styles.badgeText, complaint.is_resolved ? styles.badgeTextResolved : styles.badgeTextOpen]}>
              {complaintStatusLabel(complaint)}
            </Text>
          </View>
          <Text style={styles.body}>{complaint.description}</Text>
          {complaint.created_at ? <Text style={styles.muted}>قُدّمت في {formatDateTime(complaint.created_at)}</Text> : null}
          {complaint.is_resolved && complaint.resolved_at ? (
            <Text style={styles.muted}>عولجت في {formatDateTime(complaint.resolved_at)}</Text>
          ) : null}
        </View>
      ))}
      {query.data?.state === 'ok' && !formVisible ? (
        <AppButton label="تقديم شكوى" variant="secondary" onPress={() => setFormVisible(true)} />
      ) : null}
      {formVisible ? (
        <>
          <AppInput
            label="تفاصيل الشكوى"
            value={text}
            onChangeText={(value) => { setText(value); if (error) setError(''); }}
            multiline
            maxLength={COMPLAINT_MAX_LENGTH}
            error={error}
          />
          <AppButton label="إرسال الشكوى" onPress={submit} loading={create.isPending} />
          <AppButton label="تراجع" variant="ghost" onPress={() => { setFormVisible(false); setError(''); }} />
        </>
      ) : null}
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
  item: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.radiusMd,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundSoft,
  },
  badge: {
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  badgeOpen: { backgroundColor: '#fef3c7' },
  badgeResolved: { backgroundColor: '#dcfce7' },
  badgeText: {
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.xs,
  },
  badgeTextOpen: { color: '#92400e' },
  badgeTextResolved: { color: '#166534' },
  body: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
  muted: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
