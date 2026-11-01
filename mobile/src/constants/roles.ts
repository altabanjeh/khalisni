export const roleLabels = {
  client: 'العميل',
  employee: 'الموظف',
  provider: 'المزوّد',
  admin: 'الإدارة',
} as const;

export type AppRole = keyof typeof roleLabels;
export type BackendRole = 'customer' | 'employee' | 'support' | 'provider' | 'admin';

/**
 * App role for a backend role code, or null when the code is missing or not
 * one the app knows. A null role shows an explicit error screen
 * (RootNavigator -> UnknownRoleScreen), never the customer UI (audit M-29).
 */
export function normalizeRole(role?: string | null): AppRole | null {
  switch ((role ?? '').trim().toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'provider':
      return 'provider';
    case 'employee':
    case 'support':
      return 'employee';
    case 'customer':
      return 'client';
    default:
      return null;
  }
}

export function getRoleLabel(role?: AppRole | null) {
  return role ? roleLabels[role] : 'غير معروف';
}
