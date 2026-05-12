import { authApi } from './authApi'
import { documentsApi } from './documentsApi'
import { notificationsApi } from './notificationsApi'
import { ordersApi } from './ordersApi'
import { paymentApi } from './paymentApi'
import { publicSiteApi } from './publicSiteApi'
import { providersApi } from './providersApi'
import { servicesApi } from './servicesApi'
import {
  mockAdminDashboard,
  mockAuditLogs,
  mockCategories,
  mockNotifications,
  mockOrders,
  mockProviders,
  mockServices,
} from '../utils/mockData'
import { fallbackHomepagePayload, fallbackPublicTheme } from '../utils/publicSiteDefaults'

const isTestMode = import.meta.env.MODE === 'test'

async function withTestValue(requester, testValue) {
  if (isTestMode) return testValue
  return requester()
}

const reviewStatuses = ['NEW', 'UNDER_REVIEW', 'WAITING_CUSTOMER']
const providerStatuses = ['ASSIGNED', 'IN_PROGRESS', 'READY_FOR_DELIVERY', 'COMPLETED']

const mockCustomerOrders = mockOrders.filter((order) => order.customer?.id === 1)
const mockReviewOrders = mockOrders.filter((order) => reviewStatuses.includes(order.status))
const mockProviderOrders = mockOrders.filter((order) => providerStatuses.includes(order.status))
const mockNotificationCenter = mockNotifications.map((notification, index) => ({
  ...notification,
  message: notification.order_number ? `Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø§Ù„Ø·Ù„Ø¨ ${notification.order_number}` : 'Ø¥Ø´Ø¹Ø§Ø± Ø¹Ø§Ù…',
  is_read: index !== 0,
}))
const mockUsers = [
  {
    id: 1,
    full_name: 'Ù…Ø´Ø±Ù Ø§Ù„Ù†Ø¸Ø§Ù…',
    email: 'admin@khalisni.local',
    phone: '0790000001',
    role: 'admin',
    is_active: true,
  },
  {
    id: 2,
    full_name: 'Ø£Ø­Ù…Ø¯ Ø®Ø§Ù„Ø¯',
    email: 'customer@khalisni.local',
    phone: '0790000002',
    role: 'customer',
    is_active: true,
  },
  {
    id: 3,
    full_name: 'Ù„ÙŠÙ„Ù‰ Ø£Ø­Ù…Ø¯',
    email: 'employee@khalisni.local',
    phone: '0790000004',
    role: 'employee',
    is_active: true,
  },
  {
    id: 4,
    full_name: 'Ù…Ø­Ù…ÙˆØ¯ Ø¹Ù„ÙŠ',
    email: 'provider@khalisni.local',
    phone: '0790000003',
    role: 'provider',
    is_active: true,
  },
]
const mockSystemSettings = [
  {
    id: 1,
    key: 'site.homepage',
    value: {
      hero_title: 'Ø®Ù„ØµÙ†ÙŠ Ù„Ù„Ø®Ø¯Ù…Ø§Øª Ø§Ù„Ø­ÙƒÙˆÙ…ÙŠØ©',
      hero_subtitle: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ø·Ù„Ø¨Ø§Øª ÙˆØ§Ù„ÙˆØ«Ø§Ø¦Ù‚ Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯.',
    },
    description: 'Public homepage content blocks',
    updated_at: '2026-05-01T09:00:00Z',
  },
  {
    id: 2,
    key: 'site.contact',
    value: {
      phone: '+962790000000',
      email: 'info@khalisni.local',
    },
    description: 'Public contact information',
    updated_at: '2026-05-01T09:00:00Z',
  },
]
const mockDocuments = mockOrders.flatMap((order) =>
  (order.documents || []).map((document, index) => ({
    ...document,
    order,
    uploaded_by_name: index === 0 ? order.customer?.full_name : order.assigned_provider?.full_name,
    status: order.status === 'WAITING_CUSTOMER' ? 'WAITING_CUSTOMER' : 'VERIFIED',
  })),
)
const mockEmployeeDashboard = {
  summary: {
    waiting_review: mockReviewOrders.filter((order) => ['NEW', 'UNDER_REVIEW'].includes(order.status)).length,
    missing_documents_returned: mockReviewOrders.filter((order) => order.status === 'UNDER_REVIEW').length,
    waiting_internal_verification: mockOrders.filter((order) => order.status === 'READY_FOR_DELIVERY').length,
    returned_from_provider: mockOrders.filter((order) => order.status === 'READY_FOR_DELIVERY').length,
    near_deadline: mockReviewOrders.length,
    delayed: 1,
    assigned_workload: mockReviewOrders.length,
  },
  queues: {
    waiting_review: mockReviewOrders.slice(0, 5),
    missing_documents_returned: mockReviewOrders.slice(0, 3),
    waiting_internal_verification: mockOrders.filter((order) => order.status === 'READY_FOR_DELIVERY').slice(0, 3),
    returned_from_provider: mockOrders.filter((order) => order.status === 'READY_FOR_DELIVERY').slice(0, 3),
    near_deadline: mockReviewOrders.slice(0, 3),
    delayed: mockReviewOrders.slice(0, 1),
    assigned_workload: mockReviewOrders.slice(0, 4),
  },
}
const mockEmployeeReports = {
  period: { date_from: '2026-04-01', date_to: '2026-04-30' },
  totals: {
    orders_reviewed: 12,
    pending_reviews: mockReviewOrders.length,
    delayed_reviews: 2,
    missing_document_requests: 5,
    provider_returns: 2,
    completed_orders: 8,
  },
  completed_orders_by_day: [
    { day: '2026-04-20', total: 2 },
    { day: '2026-04-21', total: 1 },
    { day: '2026-04-22', total: 3 },
  ],
}
const mockNotificationTemplates = [
  { template_id: 1, key: 'missing_documents_followup', channel: 'system', title_ar: 'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø¨', message_ar: 'ÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ« Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ùƒ.' },
  { template_id: 2, key: 'review_started', channel: 'system', title_ar: 'Ø¨Ø¯Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©', message_ar: 'ØªÙ… Ø¨Ø¯Ø¡ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø·Ù„Ø¨Ùƒ.' },
]
const mockPublicAdvertisements = [
  {
    id: 1,
    advertisement_id: 1,
    title_ar: 'Ø¥Ø¹Ù„Ø§Ù† ØªØ¬Ø±ÙŠØ¨ÙŠ',
    title_en: 'Sample Advertisement',
    description_ar: 'Ø¥Ø¹Ù„Ø§Ù† ØªØ¬Ø±ÙŠØ¨ÙŠ ÙŠØ¸Ù‡Ø± ÙÙŠ Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ© Ø¶Ù…Ù† ÙˆØ¶Ø¹ Ø§Ù„Ø§Ø®ØªØ¨Ø§Ø±.',
    description_en: 'Sample advertisement shown on the homepage in test mode.',
    advertisement_type: 'general',
    button_text_ar: 'Ø§Ø³ØªØ¹Ø±Ø¶ Ø§Ù„Ø®Ø¯Ù…Ø§Øª',
    button_text_en: 'Browse Services',
    button_url: '/services',
    background_color: '#eaf6ff',
    text_color: '#0f3554',
    display_order: 1,
    start_date: '2026-05-01T09:00:00Z',
    end_date: null,
    is_active: true,
    is_currently_public: true,
    image_url: '',
  },
]
const mockPublicHomepage = {
  ...fallbackHomepagePayload,
  advertisements: mockPublicAdvertisements,
  important_alert: null,
}

export const api = {
  login: authApi.login,
  logout: authApi.logout,
  me: async () => withTestValue(() => authApi.me(), null),
  updateProfile: authApi.updateProfile,

  getServices: async (params = {}) => withTestValue(() => servicesApi.getServices(params), mockServices),
  getCategories: async () => withTestValue(() => servicesApi.getCategories(), mockCategories),
  getService: async (slug) =>
    withTestValue(
      () => servicesApi.getService(slug),
      mockServices.find((item) => item.slug === slug) || mockServices[0],
    ),
  getPublicHomepage: async () => withTestValue(() => publicSiteApi.getPublicHomepage(), mockPublicHomepage),
  getPublicTheme: async () => withTestValue(() => publicSiteApi.getPublicTheme(), fallbackPublicTheme),
  getPublicAdvertisements: async () => withTestValue(() => publicSiteApi.getPublicAdvertisements(), mockPublicAdvertisements),

  createOrder: ordersApi.createOrder,
  trackOrder: async (payload) =>
    withTestValue(() => ordersApi.trackOrder(payload), {
      order_number: payload.order_number || mockOrders[0].order_number,
      status: mockOrders[0].status,
      timeline: mockOrders[0].status_logs,
      missing_documents: [],
      final_documents: mockOrders[0].documents.filter((doc) => doc.is_final_document),
    }),

  getCustomerOrders: async () => withTestValue(() => ordersApi.getCustomerOrders(), mockCustomerOrders),
  getCustomerOrder: async (id) =>
    withTestValue(
      () => ordersApi.getCustomerOrder(id),
      mockCustomerOrders.find((item) => item.id === Number(id)) || mockCustomerOrders[0],
    ),
  uploadCustomerDocument: documentsApi.uploadCustomerDocument,
  cancelCustomerOrder: ordersApi.cancelCustomerOrder,
  submitRating: ordersApi.submitRating,

  getEmployeeOrders: async (params = {}) => withTestValue(() => ordersApi.getEmployeeOrders(params), mockReviewOrders),
  getEmployeeOrder: ordersApi.getEmployeeOrder,
  getEmployeeDashboard: async () => withTestValue(() => ordersApi.getEmployeeDashboard(), mockEmployeeDashboard),
  getEmployeeReports: async (params = {}) => withTestValue(() => ordersApi.getEmployeeReports(params), mockEmployeeReports),
  updateEmployeeStatus: ordersApi.updateEmployeeStatus,
  requestEmployeeDocuments: ordersApi.requestEmployeeDocuments,
  assignEmployeeOrder: ordersApi.assignEmployeeOrder,
  addEmployeeNote: ordersApi.addEmployeeNote,
  completeEmployeeOrder: ordersApi.completeEmployeeOrder,
  cancelEmployeeOrder: ordersApi.cancelEmployeeOrder,
  getStaffDocuments: async (params = {}) => withTestValue(() => documentsApi.getStaffDocuments(params), mockDocuments),
  verifyStaffDocument: documentsApi.verifyStaffDocument,
  getDownloadToken: documentsApi.getDownloadToken,
  downloadDocumentWithToken: documentsApi.downloadDocumentWithToken,

  getAdminDashboard: async () => withTestValue(() => ordersApi.getAdminDashboard(), mockAdminDashboard),
  getAdminOrders: async () => withTestValue(() => ordersApi.getAdminOrders(), mockOrders),
  getAdminOrder: ordersApi.getAdminOrder,
  changeOrderStatus: ordersApi.changeOrderStatus,
  assignOrder: ordersApi.assignOrder,
  requestDocuments: ordersApi.requestDocuments,
  addAdminNote: ordersApi.addAdminNote,
  uploadAdminFinalDocument: documentsApi.uploadAdminFinalDocument,
  completeOrder: ordersApi.completeOrder,
  rejectOrder: ordersApi.rejectOrder,

  getAdminServices: async () => withTestValue(() => servicesApi.getAdminServices(), mockServices),
  getAdminCategories: async () => withTestValue(() => servicesApi.getAdminCategories(), mockCategories),
  getAdminServiceDocuments: async (params = {}) => withTestValue(() => servicesApi.getAdminServiceDocuments(params), []),
  createAdminServiceDocument: servicesApi.createAdminServiceDocument,
  updateAdminServiceDocument: servicesApi.updateAdminServiceDocument,
  deleteAdminServiceDocument: servicesApi.deleteAdminServiceDocument,
  getAdminServiceAssignments: async (params = {}) => withTestValue(() => servicesApi.getAdminServiceAssignments(params), []),
  createAdminServiceAssignment: servicesApi.createAdminServiceAssignment,
  updateAdminServiceAssignment: servicesApi.updateAdminServiceAssignment,
  deleteAdminServiceAssignment: servicesApi.deleteAdminServiceAssignment,
  createAdminCategory: servicesApi.createAdminCategory,
  updateAdminCategory: servicesApi.updateAdminCategory,
  deleteAdminCategory: servicesApi.deleteAdminCategory,
  createAdminService: servicesApi.createAdminService,
  updateAdminService: servicesApi.updateAdminService,
  deleteAdminService: servicesApi.deleteAdminService,
  getAdminUsers: async () => withTestValue(() => servicesApi.getAdminUsers(), mockUsers),
  createAdminUser: servicesApi.createAdminUser,
  updateAdminUser: servicesApi.updateAdminUser,
  deleteAdminUser: servicesApi.deleteAdminUser,
  getSystemSettings: async () => withTestValue(() => servicesApi.getSystemSettings(), mockSystemSettings),
  createSystemSetting: servicesApi.createSystemSetting,
  updateSystemSetting: servicesApi.updateSystemSetting,
  deleteSystemSetting: servicesApi.deleteSystemSetting,
  getAdminPublicSiteContent: async () =>
    withTestValue(() => publicSiteApi.getAdminPublicSiteContent(), mockPublicHomepage.content),
  updateAdminPublicSiteContent: publicSiteApi.updateAdminPublicSiteContent,
  getAdminPublicSiteTheme: async () => withTestValue(() => publicSiteApi.getAdminPublicSiteTheme(), fallbackPublicTheme),
  updateAdminPublicSiteTheme: publicSiteApi.updateAdminPublicSiteTheme,
  getAdminPublicSiteAdvertisements: async () =>
    withTestValue(() => publicSiteApi.getAdminPublicSiteAdvertisements(), mockPublicAdvertisements),
  createAdminPublicSiteAdvertisement: publicSiteApi.createAdminPublicSiteAdvertisement,
  updateAdminPublicSiteAdvertisement: publicSiteApi.updateAdminPublicSiteAdvertisement,
  deleteAdminPublicSiteAdvertisement: publicSiteApi.deleteAdminPublicSiteAdvertisement,
  getDailyReport: async () =>
    withTestValue(() => servicesApi.getDailyReport(), {
      date: '2026-04-24',
      created_orders: 8,
      completed_orders: 4,
      revenue: 152,
      top_services: mockAdminDashboard.top_services,
    }),
  getWeeklyReport: async () =>
    withTestValue(() => servicesApi.getWeeklyReport(), {
      start_date: '2026-04-18',
      end_date: '2026-04-24',
      revenue_summary: 640,
      daily_breakdown: [
        { day: '2026-04-18', total: 5 },
        { day: '2026-04-19', total: 7 },
        { day: '2026-04-20', total: 6 },
      ],
      delayed_orders: 3,
      provider_performance: mockAdminDashboard.provider_performance,
    }),

  getProviders: async (params = {}) => withTestValue(() => providersApi.getProviders(params), mockProviders),
  createProvider: providersApi.createProvider,
  updateProvider: providersApi.updateProvider,
  updateProviderApproval: providersApi.updateProviderApproval,
  updateProviderActivation: providersApi.updateProviderActivation,
  getNotifications: async () => withTestValue(() => notificationsApi.getNotifications(), mockNotifications),
  getNotificationCenter: async () => withTestValue(() => notificationsApi.getNotificationCenter(), mockNotificationCenter),
  getAuditLogs: async (params = {}) => withTestValue(() => notificationsApi.getAuditLogs(params), mockAuditLogs),
  getEmployeeNotificationTemplates: async () => withTestValue(() => notificationsApi.getEmployeeNotificationTemplates(), mockNotificationTemplates),
  getAdminNotificationTemplates: async (params = {}) => withTestValue(() => notificationsApi.getAdminNotificationTemplates(params), mockNotificationTemplates),
  createAdminNotificationTemplate: notificationsApi.createAdminNotificationTemplate,
  updateAdminNotificationTemplate: notificationsApi.updateAdminNotificationTemplate,
  deleteAdminNotificationTemplate: notificationsApi.deleteAdminNotificationTemplate,
  previewNotificationTemplate: async (payload) =>
    withTestValue(() => notificationsApi.previewNotificationTemplate(payload), {
      title_ar: payload?.title_ar || '',
      title_en: payload?.title_en || '',
      message_ar: payload?.message_ar || '',
      message_en: payload?.message_en || '',
      available_placeholders: ['{{customer_name}}', '{{order_number}}', '{{service_name}}', '{{status_label}}'],
    }),
  sendManualOrderNotification: async (orderId, payload) =>
    withTestValue(
      () => notificationsApi.sendManualOrderNotification(orderId, payload),
      {
        notification_id: 999,
        order: Number(orderId),
        template: Number(payload?.template_id || 0),
        title: mockNotificationTemplates.find((template) => template.template_id === Number(payload?.template_id))?.title_ar || 'Ø¥Ø´Ø¹Ø§Ø±',
      },
    ),
  getWorkflowRules: async () => withTestValue(() => servicesApi.getWorkflowRules(), []),
  getAdminPayments: async (params = {}) => withTestValue(() => paymentApi.getAdminPayments(params), []),
  updateAdminPaymentStatus: paymentApi.updateAdminPaymentStatus,

  getAvailablePermissions: async () => withTestValue(() => servicesApi.getAvailablePermissions(), {}),
  getUserPermissions: (userId) => servicesApi.getUserPermissions(userId),
  setUserPermissions: (userId, perms) => servicesApi.setUserPermissions(userId, perms),

  getProviderDashboard: async () =>
    withTestValue(() => providersApi.getProviderDashboard(), {
      assigned_orders: 6,
      in_progress: 3,
      completed: 12,
      delayed: 1,
      provider: mockProviders[0],
    }),
  getProviderOrders: async () => withTestValue(() => providersApi.getProviderOrders(), mockProviderOrders),
  getProviderOrder: providersApi.getProviderOrder,
  providerChangeStatus: providersApi.providerChangeStatus,
  providerAddNote: providersApi.providerAddNote,
  providerUploadFinal: providersApi.providerUploadFinal,
}

export {
  authApi,
  documentsApi,
  notificationsApi,
  ordersApi,
  paymentApi,
  publicSiteApi,
  providersApi,
  servicesApi,
}

export default api

