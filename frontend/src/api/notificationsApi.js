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

function withTemplateId(record) {
  if (!record) return record
  if (record.id != null) return record
  if (record.template_id != null) return { ...record, id: record.template_id }
  if (record.notification_id != null) return { ...record, id: record.notification_id }
  return record
}

export const notificationsApi = {
  async getNotifications() {
    return unwrapList(await http.get('/admin/notifications/')).map(withTemplateId)
  },

  async getNotificationCenter() {
    return unwrapList(await http.get('/notifications/'))
  },

  async getAuditLogs(params = {}) {
    return unwrapList(await http.get(`/admin/audit-logs/${buildQuery(params)}`))
  },

  async getEmployeeNotificationTemplates() {
    return unwrapList(await http.get('/employee/notification-templates/')).map(withTemplateId)
  },

  async getAdminNotificationTemplates(params = {}) {
    const normalized = normalizeSoftDeleteParams(params)
    const records = unwrapList(await http.get(`/admin/notification-templates/${buildQuery(normalized.params)}`)).map(withTemplateId)
    return filterSoftDeleted(records, normalized.status)
  },

  createAdminNotificationTemplate(payload) {
    return http.post('/admin/notification-templates/', payload)
  },

  updateAdminNotificationTemplate(id, payload) {
    return http.patch(`/admin/notification-templates/${id}/`, payload)
  },

  deleteAdminNotificationTemplate(id, payload = {}) {
    return secureAdminDelete(`/admin/notification-templates/${id}/`, { data: payload })
  },

  restoreAdminNotificationTemplate(id) {
    return http.post(`/admin/notification-templates/${id}/restore/`)
  },

  previewNotificationTemplate(payload) {
    return http.post('/admin/notification-templates/preview/', payload)
  },

  sendManualOrderNotification(orderId, payload) {
    return http.post(`/orders/${orderId}/manual-notification/`, payload)
  },
}

export default notificationsApi
