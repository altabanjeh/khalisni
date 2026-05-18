import { Alert, Text, View, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { StatusBadge } from '../../components/StatusBadge';
import { documentsApi } from '../../api/documents.api';
import { getDisplayError } from '../../api/client';
import type { OrderDocument } from '../../types/document';
import { theme } from '../../theme';

export function DocumentVerificationPanel({
  documents,
  onVerified,
}: {
  documents?: OrderDocument[];
  onVerified?: () => void;
}) {
  const verifyMutation = useMutation({
    mutationFn: async ({ id, isVerified }: { id: number; isVerified: boolean }) =>
      documentsApi.verifyStaffDocument(id, {
        is_verified: isVerified,
        note: isVerified ? 'Verified from mobile panel' : 'Rejected from mobile panel',
      }),
    onSuccess: () => {
      Alert.alert('تم', 'تم تحديث حالة المستند.');
      onVerified?.();
    },
    onError: (error) => Alert.alert('تعذر التحقق', getDisplayError(error)),
  });

  if (!documents?.length) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>التحقق من المستندات</Text>
      {documents.map((document) => (
        <AppCard key={document.id}>
          <Text style={styles.name}>{document.original_filename}</Text>
          <StatusBadge status={document.status} />
          <View style={styles.actions}>
            <AppButton
              label="رفض"
              variant="danger"
              onPress={() => verifyMutation.mutate({ id: document.id, isVerified: false })}
              style={styles.action}
              loading={verifyMutation.isPending}
            />
            <AppButton
              label="اعتماد"
              onPress={() => verifyMutation.mutate({ id: document.id, isVerified: true })}
              style={styles.action}
              loading={verifyMutation.isPending}
            />
          </View>
        </AppCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.md },
  title: { color: theme.colors.text, fontSize: theme.typography.size.lg, fontWeight: theme.typography.weight.bold, textAlign: 'right' },
  name: { color: theme.colors.text, fontSize: theme.typography.size.md, fontWeight: theme.typography.weight.bold, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: theme.spacing.md },
  action: { flex: 1 },
});
