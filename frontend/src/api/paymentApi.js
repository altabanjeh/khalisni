import { buildQuery, http, unwrapList } from './client'

export const paymentApi = {
  async getAdminPayments(params = {}) {
    return unwrapList(await http.get(`/admin/payments/${buildQuery(params)}`))
  },

  getAdminPayment(id) {
    return http.get(`/admin/payments/${id}/`)
  },

  updateAdminPaymentStatus(id, payload) {
    return http.post(`/admin/payments/${id}/status/`, payload)
  },
}

export default paymentApi
