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
import { servicesApi } from '../../../api/services.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';
import type { Service } from '../../../types/service';
import { useAdminSoftDelete } from '../hooks/useAdminSoftDelete';
import {
  DEFAULT_SOFT_DELETE_STATUS,
  filterBySoftDeleteStatus,
  softDeleteListParams,
  type SoftDeleteFields,
  type SoftDeleteStatus,
} from '../../../utils/softDelete';

type AdminServiceRow = Service & SoftDeleteFields;

export function ManageServicesScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SoftDeleteStatus>(DEFAULT_SOFT_DELETE_STATUS);
  const query = useQuery({
    queryKey: ['admin-services', status],
    // ServiceAdminViewSet narrows `is_deleted` itself; the client filter is a
    // safety net for the "active" view.
    queryFn: async () => filterBySoftDeleteStatus(
      (await servicesApi.getAdminServices(softDeleteListParams(status, true))) as AdminServiceRow[],
      status,
    ),
  });
  const softDelete = useAdminSoftDelete<AdminServiceRow>({
    entity: 'service',
    deleteRecord: (record, payload) => servicesApi.deleteAdminService(record.id, payload.delete_password, payload.delete_reason),
    restoreRecord: (record) => servicesApi.restoreAdminService(record.id),
    invalidateKeys: [['admin-services']],
  });
  const [nameAr, setNameAr] = useState('');
  const [slug, setSlug] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [governmentFee, setGovernmentFee] = useState('');

  const mutation = useMutation({
    mutationFn: async () => servicesApi.createAdminService({
      name_ar: nameAr,
      slug,
      service_fee: Number(serviceFee || 0),
      government_fee: Number(governmentFee || 0),
      is_active: true,
    }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إنشاء الخدمة.');
      setNameAr('');
      setSlug('');
      setServiceFee('');
      setGovernmentFee('');
      await queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
    onError: (error) => Alert.alert('تعذر الإنشاء', getDisplayError(error)),
  });

  const rows = query.data ?? [];

  return (
    <AppScreen title="إدارة الخدمات">
      <AppCard>
        <AppInput label="اسم الخدمة" value={nameAr} onChangeText={setNameAr} />
        <AppInput label="Slug" value={slug} onChangeText={setSlug} autoCapitalize="none" />
        <AppInput label="رسوم الخدمة" value={serviceFee} onChangeText={setServiceFee} keyboardType="numeric" />
        <AppInput label="الرسوم الحكومية" value={governmentFee} onChangeText={setGovernmentFee} keyboardType="numeric" />
        <AppButton label="إضافة خدمة" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      <SoftDeleteFilter value={status} onChange={setStatus} accessibilityLabel="تصفية الخدمات حسب الحالة" />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !rows.length ? (
        <EmptyState title={status === 'deleted' ? 'لا توجد خدمات محذوفة' : 'لا توجد خدمات'} />
      ) : null}
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard variant={item.is_deleted ? 'muted' : 'default'}>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.name_ar}</Text>
            <Text style={{ textAlign: 'right' }}>Slug: {item.slug}</Text>
            {item.is_deleted ? <DeletedBadge deletedReason={item.delete_reason} /> : null}
            {softDelete.canSoftDelete ? (
              <SoftDeleteRowActions
                recordName={item.name_ar}
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
        recordName={softDelete.pendingDelete?.name_ar ?? ''}
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
        message={softDelete.copy.restoreMessage(softDelete.pendingRestore?.name_ar ?? '')}
        confirmLabel="استعادة"
        onConfirm={softDelete.confirmRestore}
        onCancel={softDelete.cancelRestore}
      />
    </AppScreen>
  );
}
