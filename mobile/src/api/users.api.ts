import { apiClient, buildQuery, secureAdminDelete, unwrapListData } from './client';
import type { ApiListParams } from '../types/common';
import type { AdminUser, User } from '../types/user';

export interface AvailablePermission {
  id: number;
  codename: string;
  full_codename: string;
  name: string;
}

export const usersApi = {
  getUsers(params: ApiListParams = {}) {
    return apiClient.get<AdminUser[]>('/admin/users/', { params: buildQuery(params) }).then((res) => unwrapListData(res.data));
  },
  createUser(payload: Partial<AdminUser> & { password: string }) {
    return apiClient.post<AdminUser>('/admin/users/', payload).then((res) => res.data);
  },
  updateUser(userId: number | string, payload: Partial<AdminUser>) {
    return apiClient.patch<AdminUser>(`/admin/users/${userId}/`, payload).then((res) => res.data);
  },
  deleteUser(userId: number | string, deletePassword: string) {
    return secureAdminDelete(`/admin/users/${userId}/`, deletePassword);
  },
  getAvailablePermissions() {
    return apiClient.get<Record<string, AvailablePermission[]>>('/admin/available-permissions/').then((res) => res.data);
  },
  getUserPermissions(userId: number | string) {
    return apiClient.get<{ permissions: string[] }>(`/admin/users/${userId}/permissions/`).then((res) => res.data);
  },
  setUserPermissions(userId: number | string, permissions: string[]) {
    return apiClient.patch(`/admin/users/${userId}/permissions/`, { permissions }).then((res) => res.data);
  },
  updateCustomerProfile(payload: Partial<User>) {
    return apiClient.patch<User>('/customer/profile/', payload).then((res) => res.data);
  },
};
