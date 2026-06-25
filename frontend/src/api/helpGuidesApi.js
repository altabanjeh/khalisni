import { buildQuery, http, secureAdminDelete, unwrapList, withId } from './client'

function normalizeScreen(record) {
  return withId(record, 'help_guide_id')
}

function normalizeRecord(record) {
  return withId(record, 'id')
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
    return unwrapList(await http.get(`/help/admin/screens/${buildQuery(params)}`)).map(normalizeScreen)
  },

  async createAdminHelpScreen(payload) {
    return normalizeScreen(await http.post('/help/admin/screens/', payload))
  },

  async updateAdminHelpScreen(id, payload) {
    return normalizeScreen(await http.patch(`/help/admin/screens/${id}/`, payload))
  },

  deleteAdminHelpScreen(id) {
    return secureAdminDelete(`/help/admin/screens/${id}/`)
  },

  async getAdminHelpFields(params = {}) {
    return unwrapList(await http.get(`/help/admin/fields/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async createAdminHelpField(payload) {
    return normalizeRecord(await http.post('/help/admin/fields/', payload))
  },

  async updateAdminHelpField(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/fields/${id}/`, payload))
  },

  deleteAdminHelpField(id) {
    return secureAdminDelete(`/help/admin/fields/${id}/`)
  },

  async getAdminHelpActions(params = {}) {
    return unwrapList(await http.get(`/help/admin/actions/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async createAdminHelpAction(payload) {
    return normalizeRecord(await http.post('/help/admin/actions/', payload))
  },

  async updateAdminHelpAction(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/actions/${id}/`, payload))
  },

  deleteAdminHelpAction(id) {
    return secureAdminDelete(`/help/admin/actions/${id}/`)
  },

  async getAdminHelpServices(params = {}) {
    return unwrapList(await http.get(`/help/admin/services/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async createAdminHelpService(payload) {
    return normalizeRecord(await http.post('/help/admin/services/', payload))
  },

  async updateAdminHelpService(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/services/${id}/`, payload))
  },

  deleteAdminHelpService(id) {
    return secureAdminDelete(`/help/admin/services/${id}/`)
  },

  async getAdminHelpWorkflows(params = {}) {
    return unwrapList(await http.get(`/help/admin/workflows/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async createAdminHelpWorkflow(payload) {
    return normalizeRecord(await http.post('/help/admin/workflows/', payload))
  },

  async updateAdminHelpWorkflow(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/workflows/${id}/`, payload))
  },

  deleteAdminHelpWorkflow(id) {
    return secureAdminDelete(`/help/admin/workflows/${id}/`)
  },

  async getAdminHelpScreenshots(params = {}) {
    return unwrapList(await http.get(`/help/admin/screenshots/${buildQuery(params)}`)).map(normalizeRecord)
  },

  async createAdminHelpScreenshot(payload) {
    return normalizeRecord(await http.post('/help/admin/screenshots/', payload))
  },

  async updateAdminHelpScreenshot(id, payload) {
    return normalizeRecord(await http.patch(`/help/admin/screenshots/${id}/`, payload))
  },

  deleteAdminHelpScreenshot(id) {
    return secureAdminDelete(`/help/admin/screenshots/${id}/`)
  },

  getHelpGuideMetadata() {
    return http.get('/help/metadata/')
  },
}

export default helpGuidesApi
