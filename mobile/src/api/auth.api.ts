import { apiClient } from './client';
import type { AuthTokens, LoginPayload, LoginResponse } from '../types/auth';
import type { User } from '../types/user';

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login/', payload).then((res) => res.data);
  },
  forgotPassword(email: string) {
    return apiClient.post<{ detail: string }>('/auth/forgot-password/', { email }).then((res) => res.data);
  },
  logout(refresh?: string | null) {
    return apiClient.post('/auth/logout/', { refresh }).then((res) => res.data);
  },
  me() {
    return apiClient.get<User>('/auth/me/').then((res) => res.data);
  },
  // Changing phone or email requires current_password; an email change returns a fresh token pair.
  updateCustomerProfile(payload: Partial<User> & { current_password?: string }) {
    return apiClient
      .patch<Partial<User> & { tokens?: AuthTokens }>('/customer/profile/', payload)
      .then((res) => res.data);
  },
};
