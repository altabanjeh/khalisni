import { NavigationContainer } from '@react-navigation/native';

import { useAuthStore } from '../state/authStore';
import { SplashScreen } from '../screens/shared/SplashScreen';
import { AuthNavigator } from './AuthNavigator';
import { ClientNavigator } from './ClientNavigator';
import { EmployeeNavigator } from './EmployeeNavigator';
import { ProviderNavigator } from './ProviderNavigator';
import { AdminNavigator } from './AdminNavigator';

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.role);

  return (
    <NavigationContainer>
      {status === 'bootstrapping' ? (
        <SplashScreen />
      ) : status !== 'authenticated' || !role ? (
        <AuthNavigator />
      ) : role === 'client' ? (
        <ClientNavigator />
      ) : role === 'employee' ? (
        <EmployeeNavigator />
      ) : role === 'provider' ? (
        <ProviderNavigator />
      ) : (
        <AdminNavigator />
      )}
    </NavigationContainer>
  );
}
