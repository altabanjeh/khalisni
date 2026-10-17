import { fetchPage, http } from './client'

export const authApi = {
  // One page of the admin users table (/admin/users/); the active / deleted /
  // all filter and the search are applied by the server.
  getAdminUsersPage({ page = 1, status = 'active', search = '' } = {}) {
    const params = { page, search: String(search || '').trim() }
    if (status === 'all' || status === 'deleted') params.include_deleted = true
    if (status === 'deleted') params.is_deleted = true
    return fetchPage('/admin/users/', params)
  },

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

  logout(refresh, config) {
    return http.post('/auth/logout/', { refresh }, config)
  },

  me() {
    return http.get('/auth/me/')
  },

  updateProfile(payload) {
    return http.patch('/customer/profile/', payload)
  },
}

export default authApi
