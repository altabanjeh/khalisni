import { buildQuery, http, secureAdminDelete, unwrapList } from './client'

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
    return unwrapList(await http.get(`/admin/notification-templates/${buildQuery(params)}`)).map(withTemplateId)
  },

  createAdminNotificationTemplate(payload) {
    return http.post('/admin/notification-templates/', payload)
  },

  updateAdminNotificationTemplate(id, payload) {
    return http.patch(`/admin/notification-templates/${id}/`, payload)
  },

  deleteAdminNotificationTemplate(id) {
    return secureAdminDelete(`/admin/notification-templates/${id}/`)
  },

  previewNotificationTemplate(payload) {
    return http.post('/admin/notification-templates/preview/', payload)
  },

  sendManualOrderNotification(orderId, payload) {
    return http.post(`/orders/${orderId}/manual-notification/`, payload)
  },
}

export default notificationsApi
