export const roleLabels = {
  client: 'العميل',
  employee: 'الموظف',
  provider: 'المزوّد',
  admin: 'الإدارة',
} as const;

export type AppRole = keyof typeof roleLabels;
export type BackendRole = 'customer' | 'employee' | 'support' | 'provider' | 'admin';

export function normalizeRole(role?: string | null): AppRole {
  switch ((role ?? '').toLowerCase()) {
    case 'admin':
      return 'admin';
    case 'provider':
      return 'provider';
    case 'employee':
    case 'support':
      return 'employee';
    case 'customer':
    default:
      return 'client';
  }
}
