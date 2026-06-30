import { buildQuery, http, secureAdminDelete, unwrapList, withId } from './client'

function normalizeCategory(record) {
  return withId(record, 'category_id')
}

function normalizeService(record) {
  return withId(record, 'service_id')
}

function normalizeServiceRelation(record) {
  return withId(record, 'relation_id')
}

function normalizeSetting(record) {
  return withId(record, 'setting_id')
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

export const servicesApi = {
  async getServices(params = {}) {
    return unwrapList(await http.get(`/services/${buildQuery(params)}`))
  },

  async getCategories() {
    return unwrapList(await http.get('/services/categories/'))
  },

  async getPublicServiceCategories() {
    return unwrapList(await http.get('/public-site/service-categories/'))
  },

  async getPublicCategoryServices(slug) {
    return unwrapList(await http.get(`/public-site/service-categories/${slug}/services/`))
  },

  getService(slug) {
    return http.get(`/services/${slug}/`)
  },

  async getAdminServices(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/services/${buildQuery(normalized.params)}`)).map(normalizeService)
    return filterSoftDeleted(records, normalized.status)
  },

  async getAdminCategories(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/categories/${buildQuery(normalized.params)}`)).map(normalizeCategory)
    return filterSoftDeleted(records, normalized.status)
  },

  reorderAdminCategories(items) {
    return http.post('/admin/categories/reorder/', { items })
  },

  async getAdminServiceDocuments(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/service-documents/${buildQuery(normalized.params)}`))
    return filterSoftDeleted(records, normalized.status)
  },

  async getAdminRequiredDocumentDefinitions(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/required-document-definitions/${buildQuery(normalized.params)}`))
    return filterSoftDeleted(records, normalized.status)
  },

  createAdminRequiredDocumentDefinition(payload) {
    return http.post('/admin/required-document-definitions/', payload)
  },

  updateAdminRequiredDocumentDefinition(id, payload) {
    return http.patch(`/admin/required-document-definitions/${id}/`, payload)
  },

  deleteAdminRequiredDocumentDefinition(id, payload = {}) {
    return secureAdminDelete(`/admin/required-document-definitions/${id}/`, { data: payload })
  },

  restoreAdminRequiredDocumentDefinition(id) {
    return http.post(`/admin/required-document-definitions/${id}/restore/`)
  },

  async getAdminServiceRelations(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/service-relations/${buildQuery(normalized.params)}`)).map(normalizeServiceRelation)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminServiceRelation(payload) {
    return normalizeServiceRelation(await http.post('/admin/service-relations/', payload))
  },

  async updateAdminServiceRelation(id, payload) {
    return normalizeServiceRelation(await http.patch(`/admin/service-relations/${id}/`, payload))
  },

  deleteAdminServiceRelation(id, payload = {}) {
    return secureAdminDelete(`/admin/service-relations/${id}/`, { data: payload })
  },

  restoreAdminServiceRelation(id) {
    return http.post(`/admin/service-relations/${id}/restore/`)
  },

  createAdminServiceDocument(payload) {
    return http.post('/admin/service-documents/', payload)
  },

  updateAdminServiceDocument(id, payload) {
    return http.patch(`/admin/service-documents/${id}/`, payload)
  },

  deleteAdminServiceDocument(id, payload = {}) {
    return secureAdminDelete(`/admin/service-documents/${id}/`, { data: payload })
  },

  restoreAdminServiceDocument(id) {
    return http.post(`/admin/service-documents/${id}/restore/`)
  },

  async getAdminServiceAssignments(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/service-provider-assignments/${buildQuery(normalized.params)}`))
    return filterSoftDeleted(records, normalized.status)
  },

  createAdminServiceAssignment(payload) {
    return http.post('/admin/service-provider-assignments/', payload)
  },

  updateAdminServiceAssignment(id, payload) {
    return http.patch(`/admin/service-provider-assignments/${id}/`, payload)
  },

  deleteAdminServiceAssignment(id, payload = {}) {
    return secureAdminDelete(`/admin/service-provider-assignments/${id}/`, { data: payload })
  },

  restoreAdminServiceAssignment(id) {
    return http.post(`/admin/service-provider-assignments/${id}/restore/`)
  },

  async createAdminCategory(payload) {
    return normalizeCategory(await http.post('/admin/categories/', payload))
  },

  async updateAdminCategory(id, payload) {
    return normalizeCategory(await http.patch(`/admin/categories/${id}/`, payload))
  },

  deleteAdminCategory(id, payload = {}) {
    return secureAdminDelete(`/admin/categories/${id}/`, { data: payload })
  },

  restoreAdminCategory(id) {
    return http.post(`/admin/categories/${id}/restore/`)
  },

  async createAdminService(payload) {
    return normalizeService(await http.post('/admin/services/', payload))
  },

  async updateAdminService(id, payload) {
    return normalizeService(await http.patch(`/admin/services/${id}/`, payload))
  },

  deleteAdminService(id, payload = {}) {
    return secureAdminDelete(`/admin/services/${id}/`, { data: payload })
  },

  restoreAdminService(id) {
    return http.post(`/admin/services/${id}/restore/`)
  },

  async getAdminUsers(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/users/${buildQuery(normalized.params)}`))
    return filterSoftDeleted(records, normalized.status)
  },

  createAdminUser(payload) {
    return http.post('/admin/users/', payload)
  },

  updateAdminUser(id, payload) {
    return http.patch(`/admin/users/${id}/`, payload)
  },

  deleteAdminUser(id, payload = {}) {
    return secureAdminDelete(`/admin/users/${id}/`, { data: payload })
  },

  restoreAdminUser(id) {
    return http.post(`/admin/users/${id}/restore/`)
  },

  async getSystemSettings() {
    return unwrapList(await http.get('/admin/system-settings/')).map(normalizeSetting)
  },

  async createSystemSetting(payload) {
    return normalizeSetting(await http.post('/admin/system-settings/', payload))
  },

  async updateSystemSetting(id, payload) {
    return normalizeSetting(await http.patch(`/admin/system-settings/${id}/`, payload))
  },

  deleteSystemSetting(id) {
    return secureAdminDelete(`/admin/system-settings/${id}/`)
  },

  getDeleteGuardConfig() {
    return http.get('/admin/delete-guard/')
  },

  updateDeleteGuardConfig(payload) {
    return http.put('/admin/delete-guard/', payload)
  },

  getDailyReport() {
    return http.get('/admin/reports/daily/')
  },

  getWeeklyReport() {
    return http.get('/admin/reports/weekly/')
  },

  async getWorkflowRules() {
    return unwrapList(await http.get('/admin/workflow-rules/'))
  },

  getAvailablePermissions() {
    return http.get('/admin/available-permissions/')
  },

  getUserPermissions(userId) {
    return http.get(`/admin/users/${userId}/permissions/`)
  },

  setUserPermissions(userId, permissionFullCodenames) {
    return http.patch(`/admin/users/${userId}/permissions/`, { permissions: permissionFullCodenames })
  },
}

export default servicesApi
