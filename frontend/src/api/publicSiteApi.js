import { http, secureAdminDelete, unwrapList, withId } from './client'

function normalizeTheme(record) {
  return withId(record, 'theme_id')
}

function normalizeContent(record) {
  return withId(record, 'content_id')
}

function normalizeAdvertisement(record) {
  return withId(record, 'advertisement_id')
}

function normalizeMissingServiceRequest(record) {
  return withId(record, 'request_id')
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

function appendFormDataValue(formData, key, value) {
  if (value == null) return
  if (typeof FileList !== 'undefined' && value instanceof FileList) {
    if (value[0]) formData.append(key, value[0])
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => appendFormDataValue(formData, key, item))
    return
  }
  if (typeof value === 'boolean') {
    formData.append(key, value ? 'true' : 'false')
    return
  }
  formData.append(key, value)
}

function toFormData(payload) {
  const formData = new FormData()
  Object.entries(payload || {}).forEach(([key, value]) => appendFormDataValue(formData, key, value))
  return formData
}

export const publicSiteApi = {
  async getPublicHomepage() {
    return http.get('/public-site/homepage/')
  },

  async getPublicTheme() {
    return normalizeTheme(await http.get('/public-site/theme/'))
  },

  async getPublicAdvertisements() {
    return unwrapList(await http.get('/public-site/advertisements/')).map(normalizeAdvertisement)
  },

  async createPublicMissingServiceRequest(payload) {
    return normalizeMissingServiceRequest(await http.post('/public-site/missing-service-requests/', payload))
  },

  async getAdminPublicSiteContent() {
    return normalizeContent(await http.get('/admin/public-site/content/'))
  },

  async updateAdminPublicSiteContent(payload) {
    return normalizeContent(await http.put('/admin/public-site/content/', toFormData(payload)))
  },

  async getAdminPublicSiteTheme() {
    return normalizeTheme(await http.get('/admin/public-site/theme/'))
  },

  async updateAdminPublicSiteTheme(payload) {
    return normalizeTheme(await http.put('/admin/public-site/theme/', toFormData(payload)))
  },

  async getAdminPublicSiteAdvertisements(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const query = new URLSearchParams()
    Object.entries(normalized.params || {}).forEach(([key, value]) => {
      if (value != null && value !== '') query.append(key, String(value))
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    const records = unwrapList(await http.get(`/admin/public-site/advertisements/${suffix}`)).map(normalizeAdvertisement)
    return filterSoftDeleted(records, normalized.status)
  },

  async createAdminPublicSiteAdvertisement(payload) {
    return normalizeAdvertisement(await http.post('/admin/public-site/advertisements/', toFormData(payload)))
  },

  async updateAdminPublicSiteAdvertisement(id, payload) {
    return normalizeAdvertisement(await http.patch(`/admin/public-site/advertisements/${id}/`, toFormData(payload)))
  },

  deleteAdminPublicSiteAdvertisement(id, payload = {}) {
    return secureAdminDelete(`/admin/public-site/advertisements/${id}/`, { data: payload })
  },

  restoreAdminPublicSiteAdvertisement(id) {
    return http.post(`/admin/public-site/advertisements/${id}/restore/`)
  },

  async getMissingServiceRequests(params = {}) {
    const query = new URLSearchParams()
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value != null && value !== '') query.append(key, String(value))
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''
    return unwrapList(await http.get(`/admin/public-site/missing-service-requests/${suffix}`)).map(normalizeMissingServiceRequest)
  },

  async getMissingServiceRequest(id) {
    return normalizeMissingServiceRequest(await http.get(`/admin/public-site/missing-service-requests/${id}/`))
  },

  async updateMissingServiceRequest(id, payload) {
    return normalizeMissingServiceRequest(await http.patch(`/admin/public-site/missing-service-requests/${id}/`, payload))
  },
}

export default publicSiteApi
