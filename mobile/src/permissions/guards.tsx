import type { PropsWithChildren } from 'react';
import { Text } from 'react-native';

import { useAuthStore } from '../state/authStore';
import { canPerformAction, canViewScreen } from './permissions';

export function ScreenGuard({ screen, children }: PropsWithChildren<{ screen: string }>) {
  const role = useAuthStore((state) => state.role);
  if (!canViewScreen(role, screen)) {
    return <Text>غير مصرح بالوصول إلى هذه الشاشة.</Text>;
  }
  return children;
}

export function ActionGuard({ action, children }: PropsWithChildren<{ action: string }>) {
  const role = useAuthStore((state) => state.role);
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  if (!canPerformAction(role, permissions, action)) {
    return null;
  }
  return children;
}
