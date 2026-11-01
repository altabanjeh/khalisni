import { NavigationContainer } from '@react-navigation/native';

import { useAuthStore } from '../state/authStore';
import { SplashScreen } from '../screens/shared/SplashScreen';
import { UnknownRoleScreen } from '../screens/shared/UnknownRoleScreen';
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
      ) : status !== 'authenticated' ? (
        <AuthNavigator />
      ) : role === 'client' ? (
        <ClientNavigator />
      ) : role === 'employee' ? (
        <EmployeeNavigator />
      ) : role === 'provider' ? (
        <ProviderNavigator />
      ) : role === 'admin' ? (
        <AdminNavigator />
      ) : (
        // A missing or unrecognised account role never falls back to the
        // customer screens (audit M-29); the backend still enforces permissions.
        <UnknownRoleScreen />
      )}
    </NavigationContainer>
  );
}
