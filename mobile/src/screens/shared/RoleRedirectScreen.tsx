import { useEffect } from 'react';

import { useAuthStore } from '../../state/authStore';

export function RoleRedirectScreen({ navigation }: { navigation: any }) {
  const role = useAuthStore((state) => state.role);

  useEffect(() => {
    if (role === 'client') navigation.replace('ClientTabs');
    if (role === 'employee') navigation.replace('EmployeeTabs');
    if (role === 'provider') navigation.replace('ProviderTabs');
    if (role === 'admin') navigation.replace('AdminDrawer');
  }, [navigation, role]);

  return null;
}
