import type { AppRole, BackendRole } from '../constants/roles';
import type { BaseEntity } from './common';

export interface User extends BaseEntity {
  full_name: string;
  phone: string;
  email: string;
  role: BackendRole;
  national_id?: string;
  is_active: boolean;
  permissions: string[];
}

export interface AdminUser extends BaseEntity {
  full_name: string;
  phone: string;
  email: string;
  role: BackendRole;
  national_id?: string;
  is_active: boolean;
  is_staff?: boolean;
  is_verified?: boolean;
  is_super_admin?: boolean;
  role_options?: BackendRole[];
  current_permissions?: string[];
}

export interface AuthUserContext {
  user: User | null;
  appRole: AppRole | null;
}
