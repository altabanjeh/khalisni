import { apiClient } from './client';
import type { LoginPayload, LoginResponse } from '../types/auth';
import type { User } from '../types/user';

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login/', payload).then((res) => res.data);
  },
  logout(refresh?: string | null) {
    return apiClient.post('/auth/logout/', { refresh }).then((res) => res.data);
  },
  me() {
    return apiClient.get<User>('/auth/me/').then((res) => res.data);
  },
  updateCustomerProfile(payload: Partial<User>) {
    return apiClient.patch<User>('/customer/profile/', payload).then((res) => res.data);
  },
};
