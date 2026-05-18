import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { usersApi } from '../../../api/users.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageRolesScreen() {
  const usersQuery = useQuery({ queryKey: ['admin-users'], queryFn: () => usersApi.getUsers() });
  const permissionsQuery = useQuery({ queryKey: ['available-permissions'], queryFn: () => usersApi.getAvailablePermissions() });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissionsText, setPermissionsText] = useState('');

  const mutation = useMutation({
    mutationFn: async () => usersApi.setUserPermissions(selectedUserId, permissionsText.split(',').map((item) => item.trim()).filter(Boolean)),
    onSuccess: () => Alert.alert('تم', 'تم تحديث الصلاحيات.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  return (
    <AppScreen title="الأدوار والصلاحيات">
      <AppCard>
        <AppInput label="معرّف المستخدم" value={selectedUserId} onChangeText={setSelectedUserId} />
        <AppInput label="الصلاحيات" value={permissionsText} onChangeText={setPermissionsText} multiline hint="افصل القيم بفاصلة مثل orders.review_order,documents.verify_document" />
        <AppButton label="حفظ الصلاحيات" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      {usersQuery.isLoading || permissionsQuery.isLoading ? <LoadingState /> : null}
      {usersQuery.isError || permissionsQuery.isError ? <ErrorState message={getDisplayError(usersQuery.error ?? permissionsQuery.error)} onRetry={() => { usersQuery.refetch(); permissionsQuery.refetch(); }} /> : null}
      <FlatList
        data={usersQuery.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.full_name} #{item.id}</Text>
            <Text style={{ textAlign: 'right' }}>الحالي: {(item.current_permissions ?? []).join(', ') || 'لا توجد صلاحيات مباشرة'}</Text>
          </AppCard>
        )}
      />
      <AppCard>
        <Text style={{ textAlign: 'right', fontWeight: '700' }}>الصلاحيات المتاحة</Text>
        <Text style={{ textAlign: 'right' }}>{JSON.stringify(permissionsQuery.data ?? {}, null, 2)}</Text>
      </AppCard>
    </AppScreen>
  );
}
