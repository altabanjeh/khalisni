import { buildQuery, http, unwrapList, withId } from './client'

function normalizeHelpGuide(record) {
  return withId(record, 'help_guide_id')
}

export const helpGuidesApi = {
  async getCurrentHelpGuides(params = {}) {
    return http.get(`/help/current/${buildQuery(params)}`)
  },

  async getHelpGuides(params = {}) {
    return unwrapList(await http.get(`/help/${buildQuery(params)}`)).map(normalizeHelpGuide)
  },

  async getHelpGuide(id) {
    return normalizeHelpGuide(await http.get(`/help/${id}/`))
  },

  async createHelpGuide(payload) {
    return normalizeHelpGuide(await http.post('/help/', payload))
  },

  async updateHelpGuide(id, payload) {
    return normalizeHelpGuide(await http.patch(`/help/${id}/`, payload))
  },

  deleteHelpGuide(id) {
    return http.delete(`/help/${id}/`)
  },

  getHelpGuideMetadata() {
    return http.get('/help/metadata/')
  },
}

export default helpGuidesApi

