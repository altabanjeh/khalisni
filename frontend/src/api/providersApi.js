import { buildQuery, http, secureAdminDelete, unwrapList } from './client'

function normalizeSoftDeleteParams(params = {}) {
  const nextParams = { ...params }
  const status = String(nextParams.status || '').trim().toLowerCase()
  delete nextParams.status

  if (status === 'all' || status === 'deleted') {
    nextParams.include_deleted = true
  }

  return {
    params: nextParams,
    status,
  }
}

function filterSoftDeleted(records, status) {
  if (status === 'deleted') {
    return records.filter((record) => record?.is_deleted)
  }

  if (status === 'active') {
    return records.filter((record) => !record?.is_deleted)
  }

  return records
}

export const providersApi = {
  async getProviders(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/providers/${buildQuery(normalized.params)}`))
    return filterSoftDeleted(records, normalized.status)
  },

  createProvider(payload) {
    return http.post('/admin/providers/', payload)
  },

  updateProvider(id, payload) {
    return http.patch(`/admin/providers/${id}/`, payload)
  },

  deleteProvider(id, payload = {}) {
    return secureAdminDelete(`/admin/providers/${id}/`, { data: payload })
  },

  restoreProvider(id) {
    return http.post(`/admin/providers/${id}/restore/`)
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
