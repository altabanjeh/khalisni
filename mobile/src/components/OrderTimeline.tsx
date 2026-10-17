import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from './AppCard';
import { StatusBadge } from './StatusBadge';
import { formatDateTime } from '../utils/format';
import { describeTimelineNote, sortTimeline } from '../utils/timelinePresentation';
import type { OrderStatusLog } from '../types/order';
import { theme } from '../theme';

const NEGATIVE = new Set(['REJECTED', 'CANCELLED']);
const ACTION = new Set(['WAITING_CUSTOMER']);

// Status history of an order, oldest first (mirrors the web OrderTimeline).
export function OrderTimeline({ logs }: { logs?: OrderStatusLog[] | null }) {
  const items = sortTimeline(logs);

  return (
    <AppCard>
      <Text style={styles.title}>مراحل الطلب</Text>
      {!items.length ? <Text style={styles.empty}>لا توجد تحديثات مسجلة على هذا الطلب حتى الآن.</Text> : null}
      {items.map((item, index) => {
        const isCurrent = index === items.length - 1;
        const status = String(item.new_status || '').toUpperCase();
        const negative = isCurrent && NEGATIVE.has(status);
        const action = isCurrent && ACTION.has(status);
        const stageLabel = negative
          ? 'أُغلق الطلب'
          : action
            ? 'بانتظار إجراء منك'
            : isCurrent
              ? 'المرحلة الحالية'
              : 'مرحلة مكتملة';
        const note = describeTimelineNote(item);

        return (
          <View
            key={item.id ?? index}
            style={[
              styles.entry,
              isCurrent ? styles.entryCurrent : null,
              negative ? styles.entryNegative : null,
              action ? styles.entryAction : null,
            ]}
          >
            <View style={styles.entryHeader}>
              <StatusBadge status={item.new_status} />
              <Text style={styles.stage}>{stageLabel}</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            <Text style={[styles.note, negative ? styles.noteNegative : null]}>
              {note || 'لا توجد ملاحظات إضافية لهذا التحديث.'}
            </Text>
          </View>
        );
      })}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.lg,
    textAlign: 'right',
  },
  empty: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  entry: {
    borderRightWidth: 3,
    borderRightColor: theme.colors.success,
    paddingRight: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  entryCurrent: {
    borderRightColor: theme.colors.primary,
  },
  entryNegative: {
    borderRightColor: theme.colors.danger,
  },
  entryAction: {
    borderRightColor: theme.colors.warning,
  },
  entryHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  stage: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.bold,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  date: {
    color: theme.colors.textMuted,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    textAlign: 'right',
  },
  note: {
    color: theme.colors.text,
    fontFamily: theme.typography.fontFamily.regular,
    fontSize: theme.typography.size.sm,
    lineHeight: theme.typography.lineHeight.sm,
    textAlign: 'right',
  },
  noteNegative: {
    color: theme.colors.danger,
  },
});
