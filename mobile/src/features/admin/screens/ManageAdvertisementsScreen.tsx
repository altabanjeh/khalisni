import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AdminSoftDeleteModal } from '../../../components/AdminSoftDeleteModal';
import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { SoftDeleteFilter } from '../../../components/SoftDeleteFilter';
import { DeletedBadge, SoftDeleteRowActions } from '../../../components/SoftDeleteRowActions';
import { adminApi } from '../../../api/admin.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';
import type { PublicAdvertisement } from '../../../types/publicSite';
import { useAdminSoftDelete } from '../hooks/useAdminSoftDelete';
import {
  DEFAULT_SOFT_DELETE_STATUS,
  filterBySoftDeleteStatus,
  softDeleteListParams,
  type SoftDeleteFields,
  type SoftDeleteStatus,
} from '../../../utils/softDelete';

type AdminAdvertisementRow = PublicAdvertisement & SoftDeleteFields;

// The admin serializer names the key `advertisement_id` (no `id`).
function advertisementId(item: AdminAdvertisementRow) {
  return item.advertisement_id ?? item.id ?? '';
}

function advertisementName(item: AdminAdvertisementRow | null) {
  return item?.title_ar || item?.title_en || 'إعلان بدون عنوان';
}

export function ManageAdvertisementsScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SoftDeleteStatus>(DEFAULT_SOFT_DELETE_STATUS);
  const query = useQuery({
    queryKey: ['admin-ads', status],
    // The advertisements list is not paginated and does not read `is_deleted`:
    // include_deleted brings deleted rows back and the status is applied here.
    queryFn: async () => filterBySoftDeleteStatus(
      (await adminApi.getAdminAdvertisements(softDeleteListParams(status))) as AdminAdvertisementRow[],
      status,
    ),
  });
  const softDelete = useAdminSoftDelete<AdminAdvertisementRow>({
    entity: 'advertisement',
    deleteRecord: (record, payload) => adminApi.deleteAdminAdvertisement(advertisementId(record), payload.delete_password, payload.delete_reason),
    restoreRecord: (record) => adminApi.restoreAdminAdvertisement(advertisementId(record)),
    invalidateKeys: [['admin-ads']],
  });
  const [titleAr, setTitleAr] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');

  const mutation = useMutation({
    mutationFn: async () => adminApi.createAdminAdvertisement({ title_ar: titleAr, description_ar: descriptionAr, is_active: true }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إنشاء الإعلان.');
      setTitleAr('');
      setDescriptionAr('');
      await queryClient.invalidateQueries({ queryKey: ['admin-ads'] });
    },
    onError: (error) => Alert.alert('تعذر الإنشاء', getDisplayError(error)),
  });

  const rows = query.data ?? [];

  return (
    <AppScreen title="إدارة الإعلانات">
      <AppCard>
        <AppInput label="العنوان" value={titleAr} onChangeText={setTitleAr} />
        <AppInput label="الوصف" value={descriptionAr} onChangeText={setDescriptionAr} multiline />
        <AppButton label="إضافة إعلان" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      <SoftDeleteFilter value={status} onChange={setStatus} accessibilityLabel="تصفية الإعلانات حسب الحالة" />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !rows.length ? (
        <EmptyState title={status === 'deleted' ? 'لا توجد إعلانات محذوفة' : 'لا توجد إعلانات'} />
      ) : null}
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => String(advertisementId(item))}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard variant={item.is_deleted ? 'muted' : 'default'}>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.title_ar ?? item.title_en}</Text>
            <Text style={{ textAlign: 'right' }}>{item.description_ar ?? item.description_en}</Text>
            {item.is_deleted ? <DeletedBadge deletedReason={item.delete_reason} /> : null}
            {softDelete.canSoftDelete ? (
              <SoftDeleteRowActions
                recordName={advertisementName(item)}
                isDeleted={Boolean(item.is_deleted)}
                onDelete={() => softDelete.requestDelete(item)}
                onRestore={() => softDelete.requestRestore(item)}
              />
            ) : null}
          </AppCard>
        )}
      />
      <AdminSoftDeleteModal
        visible={Boolean(softDelete.pendingDelete)}
        title={softDelete.copy.title}
        recordName={advertisementName(softDelete.pendingDelete)}
        impact={softDelete.copy.impact}
        confirmLabel={softDelete.copy.confirmLabel}
        loading={softDelete.deleting}
        serverError={softDelete.deleteError}
        onCancel={softDelete.cancelDelete}
        onConfirm={softDelete.confirmDelete}
      />
      <ConfirmDialog
        visible={Boolean(softDelete.pendingRestore)}
        title={softDelete.copy.restoreTitle}
        message={softDelete.copy.restoreMessage(advertisementName(softDelete.pendingRestore))}
        confirmLabel="استعادة"
        onConfirm={softDelete.confirmRestore}
        onCancel={softDelete.cancelRestore}
      />
    </AppScreen>
  );
}
