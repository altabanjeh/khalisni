import { Alert, FlatList, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
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

  const selectedUser = (usersQuery.data ?? []).find((item) => String(item.id) === selectedUserId.trim());
  const parsedPermissions = permissionsText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const availablePermissions = useMemo(
    () => Object.values(permissionsQuery.data ?? {}).flatMap((items) => items ?? []),
    [permissionsQuery.data],
  );
  const invalidPermissions = parsedPermissions.filter((item) => !availablePermissions.includes(item));

  const mutation = useMutation({
    mutationFn: async () => usersApi.setUserPermissions(selectedUserId.trim(), parsedPermissions),
    onSuccess: () => Alert.alert('تم', 'تم تحديث الصلاحيات.'),
    onError: (error) => Alert.alert('تعذر الحفظ', getDisplayError(error)),
  });

  function handleSubmit() {
    if (!selectedUserId.trim()) {
      Alert.alert('مدخل ناقص', 'اختر مستخدمًا قبل تحديث الصلاحيات.');
      return;
    }

    if (!selectedUser) {
      Alert.alert('معرّف غير صالح', 'المستخدم المحدد غير موجود في القائمة الحالية.');
      return;
    }

    if (invalidPermissions.length) {
      Alert.alert('صلاحيات غير معروفة', invalidPermissions.join('\n'));
      return;
    }

    Alert.alert(
      'تأكيد تحديث الصلاحيات',
      parsedPermissions.length
        ? `سيتم حفظ ${parsedPermissions.length} صلاحية مباشرة للمستخدم ${selectedUser.full_name}.`
        : `سيتم إزالة جميع الصلاحيات المباشرة للمستخدم ${selectedUser.full_name}.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تأكيد', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  }

  return (
    <AppScreen title="الأدوار والصلاحيات">
      <AppCard>
        <AppInput
          label="معرّف المستخدم"
          value={selectedUserId}
          onChangeText={setSelectedUserId}
          keyboardType="number-pad"
          hint="اختر المستخدم من القائمة أدناه لتعبئة المعرّف تلقائيًا."
        />
        <AppInput
          label="الصلاحيات المباشرة"
          value={permissionsText}
          onChangeText={setPermissionsText}
          multiline
          hint="افصل الصلاحيات بفاصلة. اترك الحقل فارغًا لإزالة الصلاحيات المباشرة."
        />
        {selectedUser ? <Text style={{ textAlign: 'right' }}>المستخدم المحدد: {selectedUser.full_name}</Text> : null}
        <AppButton label="حفظ الصلاحيات" onPress={handleSubmit} loading={mutation.isPending} />
      </AppCard>
      {usersQuery.isLoading || permissionsQuery.isLoading ? <LoadingState /> : null}
      {usersQuery.isError || permissionsQuery.isError ? (
        <ErrorState
          message={getDisplayError(usersQuery.error ?? permissionsQuery.error)}
          onRetry={() => {
            usersQuery.refetch();
            permissionsQuery.refetch();
          }}
        />
      ) : null}
      <FlatList
        data={usersQuery.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontWeight: '700' }}>{item.full_name} #{item.id}</Text>
            <Text style={{ textAlign: 'right' }}>
              الحالي: {(item.current_permissions ?? []).join(', ') || 'لا توجد صلاحيات مباشرة'}
            </Text>
            <AppButton
              label="اختيار هذا المستخدم"
              variant="secondary"
              onPress={() => {
                setSelectedUserId(String(item.id));
                setPermissionsText((item.current_permissions ?? []).join(', '));
              }}
            />
          </AppCard>
        )}
      />
      <AppCard>
        <Text style={{ textAlign: 'right', fontWeight: '700' }}>الصلاحيات المتاحة</Text>
        <Text style={{ textAlign: 'right' }}>
          {availablePermissions.length
            ? availablePermissions.join(', ')
            : 'لم يتم تحميل أي صلاحيات متاحة بعد.'}
        </Text>
      </AppCard>
    </AppScreen>
  );
}
