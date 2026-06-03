import { http } from './client'

export const authApi = {
  register(payload) {
    return http.post('/auth/register/', payload)
  },

  login(payload) {
    return http.post('/auth/login/', payload)
  },

  forgotPassword(payload) {
    return http.post('/auth/forgot-password/', payload)
  },

  resetPassword(token, payload) {
    return http.post(`/auth/reset-password/${encodeURIComponent(token)}/`, payload)
  },

  logout(refresh) {
    return http.post('/auth/logout/', { refresh })
  },

  me() {
    return http.get('/auth/me/')
  },

  updateProfile(payload) {
    return http.patch('/customer/profile/', payload)
  },
}

export default authApi
