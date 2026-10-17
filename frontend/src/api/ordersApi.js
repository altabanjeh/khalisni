import { buildQuery, fetchAllPages, http, unwrapList } from './client'

// One server page plus what a pager needs, and the per-chip counts the server
// adds when asked (include_status_counts): counts over every row, not one page.
export async function fetchPageWithCounts(path, params = {}) {
  const data = await http.get(`${path}${buildQuery(params)}`)
  if (Array.isArray(data)) return { results: data, count: data.length, hasNext: false, hasPrevious: false, statusCounts: null }
  return {
    results: data?.results || [],
    count: Number(data?.count ?? 0),
    hasNext: Boolean(data?.next),
    hasPrevious: Boolean(data?.previous),
    statusCounts: data?.status_counts || null,
  }
}

// Chips map to ?status_group= on the server; "all" means no group.
export function statusGroupParams({ page = 1, statusGroup = 'all', search = '' } = {}) {
  return {
    page,
    status_group: statusGroup && statusGroup !== 'all' ? statusGroup : '',
    search: String(search || '').trim(),
    include_status_counts: true,
  }
}

export const ordersApi = {
  createOrder(formData, submissionKey) {
    return http.post('/orders/', formData, submissionKey ? { headers: { 'Idempotency-Key': submissionKey } } : {})
  },

  trackOrder(payload) {
    return http.get(`/orders/track/${buildQuery(payload)}`)
  },

  // Every order of the signed-in customer (dashboard summaries).
  async getCustomerOrders() {
    return fetchAllPages('/customer/orders/')
  },

  // One page of "My requests"; chip, search and counts are answered by the server.
  getCustomerOrdersPage(params = {}) {
    return fetchPageWithCounts('/customer/orders/', statusGroupParams(params))
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

  // One page of the admin requests table; chip, search and counts are answered by the server.
  getAdminOrdersPage(params = {}) {
    return fetchPageWithCounts('/admin/orders/', statusGroupParams(params))
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

  cancelAdminOrder(id, payload) {
    return http.post(`/admin/orders/${id}/cancel/`, payload)
  },

  recoverMissingDocumentRequest(id, payload) {
    return http.post(`/admin/orders/${id}/recover-missing-documents/`, payload)
  },
}

export default ordersApi
