import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AdminSoftDeleteModal } from '../../../components/AdminSoftDeleteModal';
import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { LoadMoreFooter } from '../../../components/LoadMoreFooter';
import { usePagedList } from '../../../hooks/usePagedList';
import { SoftDeleteFilter } from '../../../components/SoftDeleteFilter';
import { DeletedBadge, SoftDeleteRowActions } from '../../../components/SoftDeleteRowActions';
import { ADMIN_USERS_URL, usersApi } from '../../../api/users.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';
import type { AdminUser } from '../../../types/user';
import { useAdminSoftDelete } from '../hooks/useAdminSoftDelete';
import {
  canManageUserRecord,
  DEFAULT_SOFT_DELETE_STATUS,
  filterBySoftDeleteStatus,
  softDeleteListParams,
  type SoftDeleteFields,
  type SoftDeleteStatus,
} from '../../../utils/softDelete';

type AdminUserRow = AdminUser & SoftDeleteFields;

export function ManageUsersScreen() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SoftDeleteStatus>(DEFAULT_SOFT_DELETE_STATUS);
  // Page by page; LoadMoreFooter below offers the next page while one exists.
  const query = usePagedList<AdminUserRow>({
    queryKey: ['admin-users', status],
    url: ADMIN_USERS_URL,
    params: softDeleteListParams(status, true),
    select: (rows) => filterBySoftDeleteStatus(rows, status),
  });
  const softDelete = useAdminSoftDelete<AdminUserRow>({
    entity: 'user',
    deleteRecord: (record, payload) => usersApi.deleteUser(record.id, payload.delete_password, payload.delete_reason),
    restoreRecord: (record) => usersApi.restoreUser(record.id),
    invalidateKeys: [['admin-users']],
  });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => usersApi.createUser({ full_name: fullName, email, phone, role: role as any, password }),
    onSuccess: async () => {
      Alert.alert('تم', 'تم إنشاء المستخدم.');
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error) => Alert.alert('تعذر الإنشاء', getDisplayError(error)),
  });

  const rows = query.items;
  // Same rule as the web users page: the server lists `admin` among the role
  // options only for platform super admins, who may manage admin accounts.
  const canManageAdminUsers = Boolean(rows.find((item) => Array.isArray(item.role_options))?.role_options?.includes('admin'));

  return (
    <AppScreen title="إدارة المستخدمين">
      <AppCard>
        <AppInput label="الاسم" value={fullName} onChangeText={setFullName} />
        <AppInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <AppInput label="الهاتف" value={phone} onChangeText={setPhone} />
        <AppInput label="الدور" value={role} onChangeText={setRole} hint="employee / provider / admin" />
        <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton label="إنشاء مستخدم" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      <SoftDeleteFilter value={status} onChange={setStatus} accessibilityLabel="تصفية المستخدمين حسب الحالة" />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !rows.length ? (
        <EmptyState title={status === 'deleted' ? 'لا يوجد مستخدمون محذوفون' : 'لا يوجد مستخدمون'} />
      ) : null}
      <FlatList
        data={rows}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard variant={item.is_deleted ? 'muted' : 'default'}>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.full_name}</Text>
            <Text style={{ textAlign: 'right' }}>{item.email}</Text>
            <Text style={{ textAlign: 'right' }}>الدور: {item.role}</Text>
            {item.is_deleted ? <DeletedBadge record={item} /> : null}
            {softDelete.canSoftDelete ? (
              <SoftDeleteRowActions
                recordName={item.full_name}
                isDeleted={Boolean(item.is_deleted)}
                deleteLabel="تعطيل"
                onDelete={() => softDelete.requestDelete(item)}
                onRestore={() => softDelete.requestRestore(item)}
                disabled={!canManageUserRecord(item, canManageAdminUsers)}
              />
            ) : null}
          </AppCard>
        )}
      />
      <LoadMoreFooter
        shown={query.loadedCount}
        total={query.total}
        hasMore={Boolean(query.hasNextPage)}
        loading={query.isFetchingNextPage}
        onLoadMore={() => query.fetchNextPage()}
      />
      <AdminSoftDeleteModal
        visible={Boolean(softDelete.pendingDelete)}
        title={softDelete.copy.title}
        recordName={softDelete.pendingDelete?.full_name ?? ''}
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
        message={softDelete.copy.restoreMessage(softDelete.pendingRestore?.full_name ?? '')}
        confirmLabel="استعادة الحساب"
        onConfirm={softDelete.confirmRestore}
        onCancel={softDelete.cancelRestore}
      />
    </AppScreen>
  );
}
