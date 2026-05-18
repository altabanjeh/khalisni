import type { PropsWithChildren } from 'react';

import { useAuthStore } from '../state/authStore';
import type { AppRole } from '../constants/roles';

export function RoleGuard({ allow, children }: PropsWithChildren<{ allow: AppRole[] }>) {
  const role = useAuthStore((state) => state.role);
  if (!role || !allow.includes(role)) return null;
  return children;
}
