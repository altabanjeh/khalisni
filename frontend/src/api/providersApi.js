import { buildQuery, http, unwrapList } from './client'

export const providersApi = {
  async getProviders(params = {}) {
    return unwrapList(await http.get(`/admin/providers/${buildQuery(params)}`))
  },

  createProvider(payload) {
    return http.post('/admin/providers/', payload)
  },

  updateProvider(id, payload) {
    return http.patch(`/admin/providers/${id}/`, payload)
  },

  updateProviderApproval(id, payload) {
    return http.post(`/admin/providers/${id}/approval/`, payload)
  },

  updateProviderActivation(id, payload) {
    return http.post(`/admin/providers/${id}/activation/`, payload)
  },

  getProviderDashboard() {
    return http.get('/provider/dashboard/')
  },

  async getProviderOrders() {
    return unwrapList(await http.get('/provider/orders/'))
  },

  getProviderOrder(id) {
    return http.get(`/provider/orders/${id}/`)
  },

  providerChangeStatus(id, payload) {
    return http.patch(`/provider/orders/${id}/status/`, payload)
  },

  providerAddNote(id, payload) {
    return http.post(`/provider/orders/${id}/notes/`, payload)
  },

  providerUploadFinal(id, formData) {
    return http.post(`/provider/orders/${id}/final-document/`, formData)
  },
}

export default providersApi
