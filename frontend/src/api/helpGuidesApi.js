import { buildQuery, http, secureAdminDelete, unwrapList, withId } from './client'

function normalizeScreen(record) {
  return withId(record, 'help_guide_id')
}

function normalizeRecord(record) {
  return withId(record, 'id')
}

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

export const helpGuidesApi = {
  async getCurrentHelpGuides(params = {}) {
    return http.get(`/help/current/${buildQuery(params)}`)
  },

  async getHelpGuideIndex(params = {}) {
    return http.get(`/help/index/${buildQuery(params)}`)
  },

  async searchHelp(params = {}) {
    return http.get(`/help/search/${buildQuery(params)}`)
  },

  async getFieldHelp(params = {}) {
    return unwrapList(await http.get(`/help/fields/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async getActionHelp(params = {}) {
    return unwrapList(await http.get(`/help/actions/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async getWorkflowHelp(params = {}) {
    return unwrapList(await http.get(`/help/workflows/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async getServiceHelp(serviceId, params = {}) {
    return normalizeRecord(await http.get(`/help/services/${serviceId}/${buildQuery(params)}`))
  },

  async getHelpGuides(params = {}) {
    return unwrapList(await http.get(`/help/${buildQuery(params)}`)).map(normalizeScreen)
  },

  async getAdminHelpScreens(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/screens/${buildQuery(normalized.params)}`)).map(normalizeScreen)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpScreen(payload) {
    return normalizeScreen(await http.post('/help/admin/screens/', payload))
  },

  async updateAdminHelpScreen(id, payload) {
    return normalizeScreen(await http.patch(`/help/admin/screens/${id}/`, payload))
  },

  deleteAdminHelpScreen(id, payload = {}) {
    return secureAdminDelete(`/help/admin/screens/${id}/`, { data: payload })
  },

  restoreAdminHelpScreen(id) {
    return http.post(`/help/admin/screens/${id}/restore/`)
  },

  async getAdminHelpFields(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/fields/${buildQuery(normalized.params)}`)).map(normalizeRecord)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpField(payload) {
    return normalizeRecord(await http.post('/help/admin/fields/', payload))
  },

  async updateAdminHelpField(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/fields/${id}/`, payload))
  },

  deleteAdminHelpField(id, payload = {}) {
    return secureAdminDelete(`/help/admin/fields/${id}/`, { data: payload })
  },

  restoreAdminHelpField(id) {
    return http.post(`/help/admin/fields/${id}/restore/`)
  },

  async getAdminHelpActions(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/actions/${buildQuery(normalized.params)}`)).map(normalizeRecord)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpAction(payload) {
    return normalizeRecord(await http.post('/help/admin/actions/', payload))
  },

  async updateAdminHelpAction(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/actions/${id}/`, payload))
  },

  deleteAdminHelpAction(id, payload = {}) {
    return secureAdminDelete(`/help/admin/actions/${id}/`, { data: payload })
  },

  restoreAdminHelpAction(id) {
    return http.post(`/help/admin/actions/${id}/restore/`)
  },

  async getAdminHelpServices(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/services/${buildQuery(normalized.params)}`)).map(normalizeRecord)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpService(payload) {
    return normalizeRecord(await http.post('/help/admin/services/', payload))
  },

  async updateAdminHelpService(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/services/${id}/`, payload))
  },

  deleteAdminHelpService(id, payload = {}) {
    return secureAdminDelete(`/help/admin/services/${id}/`, { data: payload })
  },

  restoreAdminHelpService(id) {
    return http.post(`/help/admin/services/${id}/restore/`)
  },

  async getAdminHelpWorkflows(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/workflows/${buildQuery(normalized.params)}`)).map(normalizeRecord)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpWorkflow(payload) {
    return normalizeRecord(await http.post('/help/admin/workflows/', payload))
  },

  async updateAdminHelpWorkflow(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/workflows/${id}/`, payload))
  },

  deleteAdminHelpWorkflow(id, payload = {}) {
    return secureAdminDelete(`/help/admin/workflows/${id}/`, { data: payload })
  },

  restoreAdminHelpWorkflow(id) {
    return http.post(`/help/admin/workflows/${id}/restore/`)
  },

  async getAdminHelpScreenshots(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/help/admin/screenshots/${buildQuery(normalized.params)}`)).map(normalizeRecord)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminHelpScreenshot(payload) {
    return normalizeRecord(await http.post('/help/admin/screenshots/', payload))
  },

  async updateAdminHelpScreenshot(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/screenshots/${id}/`, payload))
  },

  deleteAdminHelpScreenshot(id, payload = {}) {
    return secureAdminDelete(`/help/admin/screenshots/${id}/`, { data: payload })
  },

  restoreAdminHelpScreenshot(id) {
    return http.post(`/help/admin/screenshots/${id}/restore/`)
  },

  getHelpGuideMetadata() {
    return http.get('/help/metadata/')
  },
}

export default helpGuidesApi
