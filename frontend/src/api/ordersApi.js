import { buildQuery, http, unwrapList } from './client'

export const ordersApi = {
  createOrder(formData) {
    return http.post('/orders/', formData)
  },

  trackOrder(payload) {
    return http.get(`/orders/track/${buildQuery(payload)}`)
  },

  async getCustomerOrders() {
    return unwrapList(await http.get('/customer/orders/'))
  },

  getCustomerOrder(id) {
    return http.get(`/customer/orders/${id}/`)
  },

  cancelCustomerOrder(id, payload) {
    return http.post(`/customer/orders/${id}/cancel/`, payload)
  },

  submitRating(id, payload) {
    return http.post(`/customer/orders/${id}/rating/`, payload)
  },

  async getEmployeeOrders(params = {}) {
    return unwrapList(await http.get(`/admin/orders/${buildQuery(params)}`))
  },

  getEmployeeOrder(id) {
    return http.get(`/admin/orders/${id}/`)
  },

  getEmployeeDashboard() {
    return http.get('/employee/dashboard/')
  },

  getEmployeeReports(params = {}) {
    return http.get(`/employee/reports/summary/${buildQuery(params)}`)
  },

  updateEmployeeStatus(id, payload) {
    return http.patch(`/admin/orders/${id}/status/`, payload)
  },

  requestEmployeeDocuments(id, payload) {
    return http.post(`/admin/orders/${id}/request-documents/`, payload)
  },

  assignEmployeeOrder(id, payload) {
    return http.patch(`/admin/orders/${id}/assign/`, payload)
  },

  addEmployeeNote(id, payload) {
    return http.post(`/admin/orders/${id}/notes/`, payload)
  },

  completeEmployeeOrder(id, payload) {
    return http.post(`/admin/orders/${id}/complete/`, payload)
  },

  cancelEmployeeOrder(id, payload) {
    return http.post(`/admin/orders/${id}/cancel/`, payload)
  },

  getAdminDashboard() {
    return http.get('/admin/dashboard/')
  },

  async getAdminOrders() {
    return unwrapList(await http.get('/admin/orders/'))
  },

  getAdminOrder(id) {
    return http.get(`/admin/orders/${id}/`)
  },

  changeOrderStatus(id, payload) {
    return http.patch(`/admin/orders/${id}/status/`, payload)
  },

  assignOrder(id, payload) {
    return http.patch(`/admin/orders/${id}/assign/`, payload)
  },

  requestDocuments(id, payload) {
    return http.post(`/admin/orders/${id}/request-documents/`, payload)
  },

  addAdminNote(id, payload) {
    return http.post(`/admin/orders/${id}/notes/`, payload)
  },

  completeOrder(id, payload) {
    return http.post(`/admin/orders/${id}/complete/`, payload)
  },

  rejectOrder(id, payload) {
    return http.post(`/admin/orders/${id}/reject/`, payload)
  },
}

export default ordersApi
