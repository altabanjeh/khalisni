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
    return unwrapList(await http.get(`/admin/services/${buildQuery(params)}`)).map(normalizeService)
  },

  async getAdminCategories(params = {}) {
    return unwrapList(await http.get(`/admin/categories/${buildQuery(params)}`)).map(normalizeCategory)
  },

  reorderAdminCategories(items) {
    return http.post('/admin/categories/reorder/', { items })
  },

  async getAdminServiceDocuments(params = {}) {
    return unwrapList(await http.get(`/admin/service-documents/${buildQuery(params)}`))
  },

  async getAdminRequiredDocumentDefinitions(params = {}) {
    return unwrapList(await http.get(`/admin/required-document-definitions/${buildQuery(params)}`))
  },

  createAdminRequiredDocumentDefinition(payload) {
    return http.post('/admin/required-document-definitions/', payload)
  },

  updateAdminRequiredDocumentDefinition(id, payload) {
    return http.patch(`/admin/required-document-definitions/${id}/`, payload)
  },

  deleteAdminRequiredDocumentDefinition(id) {
    return secureAdminDelete(`/admin/required-document-definitions/${id}/`)
  },

  async getAdminServiceRelations(params = {}) {
    return unwrapList(await http.get(`/admin/service-relations/${buildQuery(params)}`)).map(normalizeServiceRelation)
  },

  async createAdminServiceRelation(payload) {
    return normalizeServiceRelation(await http.post('/admin/service-relations/', payload))
  },

  async updateAdminServiceRelation(id, payload) {
    return normalizeServiceRelation(await http.patch(`/admin/service-relations/${id}/`, payload))
  },

  deleteAdminServiceRelation(id) {
    return secureAdminDelete(`/admin/service-relations/${id}/`)
  },

  createAdminServiceDocument(payload) {
    return http.post('/admin/service-documents/', payload)
  },

  updateAdminServiceDocument(id, payload) {
    return http.patch(`/admin/service-documents/${id}/`, payload)
  },

  deleteAdminServiceDocument(id) {
    return secureAdminDelete(`/admin/service-documents/${id}/`)
  },

  async getAdminServiceAssignments(params = {}) {
    return unwrapList(await http.get(`/admin/service-provider-assignments/${buildQuery(params)}`))
  },

  createAdminServiceAssignment(payload) {
    return http.post('/admin/service-provider-assignments/', payload)
  },

  updateAdminServiceAssignment(id, payload) {
    return http.patch(`/admin/service-provider-assignments/${id}/`, payload)
  },

  deleteAdminServiceAssignment(id) {
    return secureAdminDelete(`/admin/service-provider-assignments/${id}/`)
  },

  async createAdminCategory(payload) {
    return normalizeCategory(await http.post('/admin/categories/', payload))
  },

  async updateAdminCategory(id, payload) {
    return normalizeCategory(await http.patch(`/admin/categories/${id}/`, payload))
  },

  deleteAdminCategory(id) {
    return secureAdminDelete(`/admin/categories/${id}/`)
  },

  async createAdminService(payload) {
    return normalizeService(await http.post('/admin/services/', payload))
  },

  async updateAdminService(id, payload) {
    return normalizeService(await http.patch(`/admin/services/${id}/`, payload))
  },

  deleteAdminService(id) {
    return secureAdminDelete(`/admin/services/${id}/`)
  },

  async getAdminUsers() {
    return unwrapList(await http.get('/admin/users/'))
  },

  createAdminUser(payload) {
    return http.post('/admin/users/', payload)
  },

  updateAdminUser(id, payload) {
    return http.patch(`/admin/users/${id}/`, payload)
  },

  deleteAdminUser(id) {
    return secureAdminDelete(`/admin/users/${id}/`)
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
