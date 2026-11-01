import { apiClient } from './client';
import type { AuthTokens, LoginPayload, LoginResponse } from '../types/auth';
import type { User } from '../types/user';
import type { RegisterPayload } from '../utils/registration';

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse>('/auth/login/', payload).then((res) => res.data);
  },
  // Creates a customer account (backend accounts/serializers.py RegisterSerializer).
  // Answers 201 with {id, full_name, phone, email, national_id}; field errors are
  // keyed by field name, in Arabic for Accept-Language: ar.
  register(payload: RegisterPayload) {
    return apiClient
      .post<Pick<User, 'id' | 'full_name' | 'phone' | 'email' | 'national_id'>>('/auth/register/', payload)
      .then((res) => res.data);
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
