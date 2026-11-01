import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ordersApi } from '../../api/orders.api';
import { getDisplayError, normalizeApiError } from '../../api/client';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { theme } from '../../theme';
import type { OrderNote } from '../../types/order';
import { formatDateTime } from '../../utils/format';
import {
  MESSAGE_MAX_LENGTH,
  buildMessagePayload,
  isMessagingUnavailable,
  loadOrderMessages,
  messageAuthorLabel,
  validateMessage,
} from '../../utils/orderMessages';
import { BRAND_AR } from '../../utils/brand';

/**
 * Messages with support on an order (client sitemap CN-MAP-02):
 * GET/POST /api/customer/orders/<id>/messages/. The thread is the order's
 * customer-visible notes, so when the endpoint is not deployed (404/405) the
 * card falls back to those notes, read only, and hides the send box.
 */
export function OrderMessagesCard({
  orderId,
  fallbackNotes,
  canSend,
}: {
  orderId: number;
  fallbackNotes?: OrderNote[] | null;
  canSend: boolean;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['client-order-messages', orderId],
    queryFn: () => loadOrderMessages(orderId, (id) => ordersApi.getOrderMessages(id)),
  });
  const send = useMutation({
    mutationFn: () => ordersApi.sendOrderMessage(orderId, buildMessagePayload(text)),
    onSuccess: async () => {
      setText('');
      await queryClient.invalidateQueries({ queryKey: ['client-order-messages', orderId] });
    },
    onError: (sendError) => {
      if (isMessagingUnavailable(sendError)) {
        void queryClient.invalidateQueries({ queryKey: ['client-order-messages', orderId] });
        setError('خدمة المراسلة غير متاحة حالياً. يرجى المحاولة لاحقاً.');
        return;
      }
      const apiError = normalizeApiError(sendError);
      setError(apiError.fieldErrors?.message?.[0] || getDisplayError(sendError));
    },
  });

  const submit = () => {
    const validation = validateMessage(text);
    if (validation) {
      setError(validation);
      return;
    }
    setError('');
    send.mutate();
  };

  if (query.isLoading) {
    return (
      <AppCard>
        <Text style={styles.title}>المراسلات مع الدعم</Text>
        <Text style={styles.muted}>جاري تحميل الرسائل...</Text>
      </AppCard>
    );
  }

  if (query.isError) {
    return (
      <AppCard>
        <Text style={styles.title}>المراسلات مع الدعم</Text>
        <Text style={styles.error}>{getDisplayError(query.error)}</Text>
        <AppButton label="إعادة المحاولة" variant="secondary" onPress={() => void query.refetch()} />
      </AppCard>
    );
  }

  // Endpoint not deployed: the customer-visible notes from the order payload.
  if (query.data?.state === 'unavailable') {
    const notes = fallbackNotes ?? [];
    return (
      <AppCard>
        <Text style={styles.title}>ملاحظات فريق العمل</Text>
        {!notes.length ? <Text style={styles.muted}>لا توجد ملاحظات من فريق العمل على هذا الطلب.</Text> : null}
        {notes.map((note) => (
          <View key={note.id} style={[styles.bubble, styles.staffBubble]}>
            <Text style={styles.author}>{note.user_name || `فريق ${BRAND_AR}`}</Text>
            <Text style={styles.body}>{note.note}</Text>
            {note.created_at ? <Text style={styles.time}>{formatDateTime(note.created_at)}</Text> : null}
          </View>
        ))}
      </AppCard>
    );
  }

  const messages = query.data?.state === 'ok' ? query.data.messages : [];
  return (
    <AppCard>
      <Text style={styles.title}>المراسلات مع الدعم</Text>
      <Text style={styles.muted}>اكتب استفسارك عن هذا الطلب وسيرد عليك فريق الدعم هنا.</Text>
      {!messages.length ? <Text style={styles.muted}>لا توجد رسائل بعد.</Text> : null}
      {messages.map((message) => (
        <View
          key={message.id}
          style={[styles.bubble, message.author_role === 'customer' ? styles.customerBubble : styles.staffBubble]}
        >
          <Text style={styles.author}>{messageAuthorLabel(message)}</Text>
          <Text style={styles.body}>{message.message}</Text>
          {message.created_at ? <Text style={styles.time}>{formatDateTime(message.created_at)}</Text> : null}
        </View>
      ))}
      {canSend ? (
        <>
          <AppInput
            label="رسالة جديدة"
            value={text}
            onChangeText={(value) => { setText(value); if (error) setError(''); }}
            multiline
            maxLength={MESSAGE_MAX_LENGTH}
            error={error}
          />
          <AppButton label="إرسال الرسالة" onPress={submit} loading={send.isPending} />
        </>
      ) : (
        <Text style={styles.muted}>لا يمكن إرسال رسائل جديدة على طلب مؤرشف.</Text>
      )}
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
  muted: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  bubble: {
    borderRadius: theme.spacing.radiusMd,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    maxWidth: '88%',
  },
  // The customer's own messages on the right (the reading start), support on the left.
  customerBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.surfaceMuted,
  },
  staffBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.backgroundSoft,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  author: {
    color: theme.colors.primaryDark,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  body: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.md,
    lineHeight: theme.typography.lineHeight.md,
    textAlign: 'right',
  },
  time: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.xs,
    textAlign: 'right',
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
});
