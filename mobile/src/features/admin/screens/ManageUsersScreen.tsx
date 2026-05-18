import { Alert, FlatList, Text, View } from 'react-native';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppButton } from '../../../components/AppButton';
import { AppCard } from '../../../components/AppCard';
import { AppInput } from '../../../components/AppInput';
import { AppScreen } from '../../../components/AppScreen';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { LoadingState } from '../../../components/LoadingState';
import { usersApi } from '../../../api/users.api';
import { getDisplayError } from '../../../api/client';
import { theme } from '../../../theme';

export function ManageUsersScreen() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-users'], queryFn: () => usersApi.getUsers() });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
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

  return (
    <AppScreen title="إدارة المستخدمين">
      <AppCard>
        <AppInput label="الاسم" value={fullName} onChangeText={setFullName} />
        <AppInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <AppInput label="الهاتف" value={phone} onChangeText={setPhone} />
        <AppInput label="الدور" value={role} onChangeText={setRole} hint="customer / employee / provider / admin" />
        <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
        <AppButton label="إنشاء مستخدم" onPress={() => mutation.mutate()} loading={mutation.isPending} />
      </AppCard>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={getDisplayError(query.error)} onRetry={query.refetch} /> : null}
      {!query.isLoading && !query.isError && !(query.data?.length) ? <EmptyState title="لا يوجد مستخدمون" /> : null}
      <FlatList
        data={query.data ?? []}
        scrollEnabled={false}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ textAlign: 'right', fontSize: 18, fontWeight: '700' }}>{item.full_name}</Text>
            <Text style={{ textAlign: 'right' }}>{item.email}</Text>
            <Text style={{ textAlign: 'right' }}>الدور: {item.role}</Text>
          </AppCard>
        )}
      />
    </AppScreen>
  );
}
