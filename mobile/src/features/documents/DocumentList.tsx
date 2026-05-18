import { Alert, FlatList, Text, View, StyleSheet } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { EmptyState } from '../../components/EmptyState';
import { StatusBadge } from '../../components/StatusBadge';
import { useAuthStore } from '../../state/authStore';
import { downloadAndShareDocument } from '../../utils/file';
import { formatDate } from '../../utils/format';
import type { OrderDocument } from '../../types/document';
import { theme } from '../../theme';

export function DocumentList({ documents, title = 'المستندات' }: { documents?: OrderDocument[]; title?: string }) {
  const accessToken = useAuthStore((state) => state.tokens?.access);

  if (!documents?.length) {
    return <EmptyState title="لا توجد مستندات" description="سيظهر كل ملف مرتبط بالطلب هنا." />;
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={documents}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <View style={styles.header}>
              <StatusBadge status={item.status} />
              <View style={styles.headerText}>
                <Text style={styles.name}>{item.original_filename}</Text>
                <Text style={styles.meta}>{item.document_type} • {formatDate(item.created_at)}</Text>
              </View>
            </View>
            {item.verification_note ? <Text style={styles.note}>ملاحظة التحقق: {item.verification_note}</Text> : null}
            {item.rejection_reason ? <Text style={styles.note}>سبب الرفض: {item.rejection_reason}</Text> : null}
            {item.download_url ? (
              <AppButton
                label="فتح / مشاركة"
                variant="secondary"
                onPress={() => {
                  void downloadAndShareDocument(item.download_url!, item.original_filename, accessToken).catch((error) =>
                    Alert.alert('تعذر تنزيل الملف', error instanceof Error ? error.message : 'حدث خطأ أثناء التنزيل.'),
                  );
                }}
              />
            ) : null}
          </AppCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.md },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    textAlign: 'right',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
  headerText: { flex: 1, gap: theme.spacing.xs },
  name: { color: theme.colors.text, fontSize: theme.typography.size.md, fontWeight: theme.typography.weight.bold, textAlign: 'right' },
  meta: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, textAlign: 'right' },
  note: { color: theme.colors.textMuted, fontSize: theme.typography.size.sm, textAlign: 'right' },
});
