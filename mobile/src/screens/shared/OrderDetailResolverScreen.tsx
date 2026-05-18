import { useEffect } from 'react';

import { useAuthStore } from '../../state/authStore';

export function OrderDetailResolverScreen({ route, navigation }: { route: any; navigation: any }) {
  const role = useAuthStore((state) => state.role);
  const orderId = route.params?.orderId;

  useEffect(() => {
    if (!orderId) return;
    if (role === 'client') navigation.replace('ClientOrderDetail', { orderId });
    if (role === 'employee') navigation.replace('EmployeeOrderDetail', { orderId });
    if (role === 'provider') navigation.replace('ProviderOrderDetail', { orderId });
    if (role === 'admin') navigation.replace('AdminOrderDetail', { orderId });
  }, [navigation, orderId, role]);

  return null;
}
