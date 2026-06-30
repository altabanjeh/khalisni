import { authApi } from './authApi'
import { documentsApi } from './documentsApi'
import { helpGuidesApi } from './helpGuidesApi'
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
  mockMissingServiceRequests,
  mockNotifications,
  mockOrders,
  mockProviders,
  mockRequiredDocumentDefinitions,
  mockServices,
} from '../utils/mockData'
import { HELP_SCREEN_REGISTRY } from '../help/screenRegistry'
import { fallbackHomepagePayload, fallbackPublicTheme } from '../utils/publicSiteDefaults'

const isTestMode = import.meta.env.MODE === 'test'

async function withTestValue(requester, testValue) {
  if (isTestMode) return testValue
  return requester()
}

function filterSoftDeleted(records, params = {}) {
  const status = String(params?.status || '').trim().toLowerCase()
  if (status === 'deleted') return records.filter((record) => record?.is_deleted)
  if (status === 'active') return records.filter((record) => !record?.is_deleted)
  return records
}

function softDeleteMockRecord(records, id, extra = {}) {
  return records.map((record) =>
    Number(record.id) === Number(id)
      ? {
          ...record,
          ...extra,
          is_deleted: true,
          deleted_at: new Date().toISOString(),
        }
      : record,
  )
}

function restoreMockRecord(records, id, extra = {}) {
  return records.map((record) =>
    Number(record.id) === Number(id)
      ? {
          ...record,
          ...extra,
          is_deleted: false,
          deleted_at: null,
          delete_reason: '',
        }
      : record,
  )
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
let mockPublicMissingServiceRequests = [...mockMissingServiceRequests]
const mockRoleOptions = ['admin', 'customer', 'employee', 'support', 'provider']
let mockUsers = [
  {
    id: 1,
    full_name: 'Ù…Ø´Ø±Ù Ø§Ù„Ù†Ø¸Ø§Ù…',
    email: 'admin@khalisni.local',
    phone: '0790000001',
    role: 'admin',
    is_active: true,
    is_verified: true,
    is_super_admin: true,
    role_options: mockRoleOptions,
    current_permissions: [],
  },
  {
    id: 2,
    full_name: 'Ø£Ø­Ù…Ø¯ Ø®Ø§Ù„Ø¯',
    email: 'customer@khalisni.local',
    phone: '0790000002',
    role: 'customer',
    is_active: true,
    is_verified: true,
    is_super_admin: false,
    role_options: mockRoleOptions,
    current_permissions: [],
  },
  {
    id: 3,
    full_name: 'Ù„ÙŠÙ„Ù‰ Ø£Ø­Ù…Ø¯',
    email: 'employee@khalisni.local',
    phone: '0790000004',
    role: 'employee',
    is_active: true,
    is_verified: true,
    is_super_admin: false,
    role_options: mockRoleOptions,
    current_permissions: ['orders.review_order', 'documents.view_document'],
  },
  {
    id: 4,
    full_name: 'Ù…Ø­Ù…ÙˆØ¯ Ø¹Ù„ÙŠ',
    email: 'provider@khalisni.local',
    phone: '0790000003',
    role: 'provider',
    is_active: true,
    is_verified: false,
    is_super_admin: false,
    role_options: mockRoleOptions,
    current_permissions: [],
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
let mockNotificationTemplates = [
  { template_id: 1, key: 'missing_documents_followup', channel: 'system', title_ar: 'Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø·Ù„Ø¨', message_ar: 'ÙŠØ±Ø¬Ù‰ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ« Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ùƒ.' },
  { template_id: 2, key: 'review_started', channel: 'system', title_ar: 'Ø¨Ø¯Ø¡ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©', message_ar: 'ØªÙ… Ø¨Ø¯Ø¡ Ù…Ø±Ø§Ø¬Ø¹Ø© Ø·Ù„Ø¨Ùƒ.' },
]
const mockDeleteGuard = {
  key: 'security.delete_guard',
  label: 'Delete protection',
  description: 'Extra password required before any admin delete or deactivate action.',
  is_configured: false,
  updated_at: null,
}
let mockHelpGuides = [
  {
    id: 1,
    slug: 'customer-orders-guide',
    screen_key: 'customer_orders',
    screen_label: 'طلباتي',
    route_path: '/customer/orders',
    category: 'customer',
    role: 'customer',
    role_label: 'Customer',
    workflow_status: '',
    workflow_status_label: '',
    title: 'متابعة الطلبات',
    short_description: 'دليل سريع لمراجعة الطلبات والبحث عنها.',
    purpose: 'يساعدك على الوصول السريع إلى الطلب الصحيح ومعرفة حالته الحالية.',
    before_you_start: 'استخدم البحث إذا كان لديك أكثر من طلب مفتوح.',
    step_by_step_guide: '1. افتح شاشة طلباتي\n2. ابحث عن الطلب\n3. افتح التفاصيل',
    steps: ['افتح شاشة طلباتي', 'ابحث عن الطلب', 'افتح التفاصيل'],
    expected_result: 'تصل إلى الطلب المطلوب وتعرف حالته الحالية.',
    common_errors: 'فتح طلب مشابه بالخطأ',
    common_error_items: ['فتح طلب مشابه بالخطأ'],
    troubleshooting: 'جرّب البحث برقم الطلب ثم أعد فتح القائمة إذا لم يظهر الطلب المتوقع.',
    troubleshooting_items: ['جرّب البحث برقم الطلب ثم أعد فتح القائمة إذا لم يظهر الطلب المتوقع.'],
    related_screen: 'customer_order_details',
    related_permission: '',
    related_pages: [],
    screenshots: [
      {
        id: 1,
        caption: 'Customer orders list',
        image_url: '',
        placeholder_label: 'Screenshot required: Customer orders list',
        alt_text: 'Customer orders list',
        step_reference: 'overview',
        is_placeholder: true,
        display_order: 1,
      },
    ],
    display_order: 10,
    permission_key: '',
    is_quick_link: true,
    is_active: true,
  },
]
let mockHelpScreenshots = [
  {
    id: 1,
    help_guide: 1,
    help_guide_title: 'متابعة الطلبات',
    help_guide_slug: 'customer-orders-guide',
    caption: 'Customer orders list',
    image: null,
    static_path: '',
    placeholder_label: 'Screenshot required: Customer orders list',
    alt_text: 'Customer orders list',
    step_reference: 'overview',
    display_order: 1,
    is_active: true,
  },
]
let mockHelpActions = [
  {
    id: 1,
    screen_key: 'customer_orders',
    button_key: 'open_order',
    button_label: 'فتح التفاصيل',
    role: 'customer',
    role_label: 'Customer',
    purpose: 'يفتح شاشة تفاصيل الطلب.',
    when_to_use: 'استخدمه عند اختيار الطلب الصحيح.',
    action_result: 'ينتقل المستخدم إلى شاشة تفاصيل الطلب.',
    warning_message: '',
    display_order: 10,
    source: 'registry',
  },
]
let mockHelpFields = [
  {
    id: 1,
    screen_key: 'customer_create_order',
    field_key: 'service',
    field_label: 'الخدمة',
    role: 'customer',
    role_label: 'Customer',
    required: true,
    purpose: 'تحدد الخدمة المطلوب تنفيذها.',
    accepted_format: 'اختر خدمة فعالة من القائمة.',
    valid_example: 'تجديد سجل تجاري',
    error_explanation: 'اختيار خدمة غير مناسبة يؤدي إلى مستندات أو سعر غير صحيح.',
    tooltip_text: 'اختر الخدمة الدقيقة لأن المتطلبات تعتمد عليها.',
    display_order: 10,
    source: 'registry',
  },
]
let mockHelpWorkflows = [
  {
    id: 1,
    screen_key: 'employee_order_review',
    workflow_key: 'under_review__assign_provider',
    current_status: 'UNDER_REVIEW',
    current_status_label: 'Under review',
    action_key: 'assign_provider',
    action_label: 'Assign provider',
    next_status: 'ASSIGNED',
    next_status_label: 'Assigned',
    role: 'employee',
    role_label: 'Employee',
    required_fields: ['Provider', 'Approved documents'],
    system_effect: 'Order is assigned to a provider.',
    notification_effect: 'Provider notification is triggered.',
    blocked_cases: ['Missing approved required documents'],
    correction_process: ['Approve documents first, then retry assignment.'],
    display_order: 10,
    source: 'registry',
  },
]
const mockHelpGuideMetadata = {
  screens: HELP_SCREEN_REGISTRY.map((item) => ({
    screen_key: item.screen_key,
    route_path: '',
    label: item.label,
  })),
  roles: [
    { value: 'all_users', label: 'All users' },
    { value: 'admin', label: 'Admin' },
    { value: 'customer', label: 'Customer' },
    { value: 'employee', label: 'Employee' },
    { value: 'support', label: 'Support' },
    { value: 'provider', label: 'Provider' },
  ],
  categories: [
    { value: 'navigation', label: 'Navigation' },
    { value: 'account', label: 'Account access' },
    { value: 'customer', label: 'Customer' },
    { value: 'employee', label: 'Employee' },
    { value: 'provider', label: 'Provider' },
    { value: 'admin', label: 'Admin' },
    { value: 'reports', label: 'Reports' },
    { value: 'settings', label: 'Settings' },
    { value: 'manual', label: 'Manual maintenance' },
    { value: 'general', label: 'General' },
  ],
  workflow_statuses: [
    { value: 'NEW', label: 'New' },
    { value: 'UNDER_REVIEW', label: 'Under review' },
    { value: 'WAITING_CUSTOMER', label: 'Waiting customer' },
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'READY_FOR_DELIVERY', label: 'Ready for delivery' },
    { value: 'COMPLETED', label: 'Completed' },
  ],
  can_manage_help_guides: true,
}
let mockPublicAdvertisements = [
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
  important_alert: null,
}
let mockProviderRecords = mockProviders.map((provider) => ({ ...provider, is_deleted: Boolean(provider.is_deleted) }))

export const api = {
  register: async (payload) =>
    withTestValue(() => authApi.register(payload), {
      id: Date.now(),
      full_name: payload?.full_name || '',
      phone: payload?.phone || '',
      email: payload?.email || '',
      national_id: payload?.national_id || '',
      role: 'customer',
    }),
  login: authApi.login,
  forgotPassword: async (payload) =>
    withTestValue(() => authApi.forgotPassword(payload), {
      detail: 'If this email is registered, a password reset link has been sent.',
    }),
  resetPassword: async (token, payload) =>
    withTestValue(() => authApi.resetPassword(token, payload), {
      detail: 'Your password has been reset. You can now log in.',
    }),
  logout: authApi.logout,
  me: async () => withTestValue(() => authApi.me(), null),
  updateProfile: authApi.updateProfile,

  getServices: async (params = {}) => withTestValue(() => servicesApi.getServices(params), mockServices),
  getCategories: async () => withTestValue(() => servicesApi.getCategories(), mockCategories),
  getPublicServiceCategories: async () => withTestValue(() => servicesApi.getPublicServiceCategories(), mockCategories),
  getPublicCategoryServices: async (slug) =>
    withTestValue(
      () => servicesApi.getPublicCategoryServices(slug),
      mockServices.filter((item) => item.category?.slug === slug),
    ),
  getService: async (slug) =>
    withTestValue(
      () => servicesApi.getService(slug),
      mockServices.find((item) => item.slug === slug) || mockServices[0],
    ),
  getPublicHomepage: async () =>
    withTestValue(() => publicSiteApi.getPublicHomepage(), {
      ...mockPublicHomepage,
      advertisements: mockPublicAdvertisements.filter((item) => !item.is_deleted),
    }),
  getPublicTheme: async () => withTestValue(() => publicSiteApi.getPublicTheme(), fallbackPublicTheme),
  getPublicAdvertisements: async () =>
    withTestValue(() => publicSiteApi.getPublicAdvertisements(), mockPublicAdvertisements.filter((item) => !item.is_deleted)),
  createPublicMissingServiceRequest: async (payload) =>
    withTestValue(
      () => publicSiteApi.createPublicMissingServiceRequest(payload),
      (() => {
        const nextId = (mockPublicMissingServiceRequests.at(-1)?.id || 0) + 1
        const created = {
          id: nextId,
          request_id: nextId,
          request_number: `MSR-${String(nextId).padStart(6, '0')}`,
          service_name: payload?.service_name || '',
          request_message: payload?.request_message || '',
          requester_name: payload?.requester_name || '',
          requester_phone: payload?.requester_phone || '',
          requester_email: payload?.requester_email || '',
          preferred_contact_channel: payload?.preferred_contact_channel || 'whatsapp',
          source: payload?.source || 'homepage_chat',
          status: 'new',
          assigned_to: null,
          assigned_to_name: '',
          matched_service: payload?.matched_service_id || null,
          matched_service_name: mockServices.find((service) => service.id === payload?.matched_service_id)?.name_ar || '',
          response_message: '',
          internal_notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          resolved_at: null,
        }
        mockPublicMissingServiceRequests = [created, ...mockPublicMissingServiceRequests]
        return created
      })(),
    ),

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

  getAdminServices: async (params = {}) => withTestValue(() => servicesApi.getAdminServices(params), filterSoftDeleted(mockServices, params)),
  getAdminCategories: async (params = {}) => withTestValue(() => servicesApi.getAdminCategories(params), filterSoftDeleted(mockCategories, params)),
  reorderAdminCategories: servicesApi.reorderAdminCategories,
  getAdminServiceDocuments: async (params = {}) => withTestValue(() => servicesApi.getAdminServiceDocuments(params), filterSoftDeleted([], params)),
  getAdminRequiredDocumentDefinitions: async (params = {}) =>
    withTestValue(() => servicesApi.getAdminRequiredDocumentDefinitions(params), filterSoftDeleted(mockRequiredDocumentDefinitions, params)),
  createAdminRequiredDocumentDefinition: async (payload) =>
    withTestValue(() => servicesApi.createAdminRequiredDocumentDefinition(payload), { id: Date.now(), ...payload }),
  updateAdminRequiredDocumentDefinition: async (id, payload) =>
    withTestValue(() => servicesApi.updateAdminRequiredDocumentDefinition(id, payload), { id: Number(id), ...payload }),
  deleteAdminRequiredDocumentDefinition: async (id, payload = {}) =>
    withTestValue(() => servicesApi.deleteAdminRequiredDocumentDefinition(id, payload), null),
  restoreAdminRequiredDocumentDefinition: async (id) =>
    withTestValue(() => servicesApi.restoreAdminRequiredDocumentDefinition(id), null),
  getAdminServiceRelations: async (params = {}) => withTestValue(() => servicesApi.getAdminServiceRelations(params), filterSoftDeleted([], params)),
  createAdminServiceRelation: servicesApi.createAdminServiceRelation,
  updateAdminServiceRelation: servicesApi.updateAdminServiceRelation,
  deleteAdminServiceRelation: servicesApi.deleteAdminServiceRelation,
  restoreAdminServiceRelation: async (id) => withTestValue(() => servicesApi.restoreAdminServiceRelation(id), null),
  createAdminServiceDocument: servicesApi.createAdminServiceDocument,
  updateAdminServiceDocument: servicesApi.updateAdminServiceDocument,
  deleteAdminServiceDocument: servicesApi.deleteAdminServiceDocument,
  restoreAdminServiceDocument: async (id) => withTestValue(() => servicesApi.restoreAdminServiceDocument(id), null),
  getAdminServiceAssignments: async (params = {}) => withTestValue(() => servicesApi.getAdminServiceAssignments(params), filterSoftDeleted([], params)),
  createAdminServiceAssignment: servicesApi.createAdminServiceAssignment,
  updateAdminServiceAssignment: servicesApi.updateAdminServiceAssignment,
  deleteAdminServiceAssignment: servicesApi.deleteAdminServiceAssignment,
  restoreAdminServiceAssignment: async (id) => withTestValue(() => servicesApi.restoreAdminServiceAssignment(id), null),
  createAdminCategory: servicesApi.createAdminCategory,
  updateAdminCategory: servicesApi.updateAdminCategory,
  deleteAdminCategory: servicesApi.deleteAdminCategory,
  restoreAdminCategory: async (id) => withTestValue(() => servicesApi.restoreAdminCategory(id), null),
  createAdminService: servicesApi.createAdminService,
  updateAdminService: servicesApi.updateAdminService,
  deleteAdminService: servicesApi.deleteAdminService,
  restoreAdminService: async (id) => withTestValue(() => servicesApi.restoreAdminService(id), null),
  getAdminUsers: async (params = {}) => withTestValue(() => servicesApi.getAdminUsers(params), filterSoftDeleted(mockUsers, params)),
  createAdminUser: servicesApi.createAdminUser,
  updateAdminUser: servicesApi.updateAdminUser,
  deleteAdminUser: async (id, payload = {}) =>
    withTestValue(
      () => servicesApi.deleteAdminUser(id, payload),
      (() => {
        mockUsers = softDeleteMockRecord(mockUsers, id, { is_active: false, delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminUser: async (id) =>
    withTestValue(
      () => servicesApi.restoreAdminUser(id),
      (() => {
        mockUsers = restoreMockRecord(mockUsers, id, { is_active: true })
        return null
      })(),
    ),
  getSystemSettings: async () => withTestValue(() => servicesApi.getSystemSettings(), mockSystemSettings),
  createSystemSetting: servicesApi.createSystemSetting,
  updateSystemSetting: servicesApi.updateSystemSetting,
  deleteSystemSetting: servicesApi.deleteSystemSetting,
  getDeleteGuardConfig: async () => withTestValue(() => servicesApi.getDeleteGuardConfig(), mockDeleteGuard),
  updateDeleteGuardConfig: async (payload) =>
    withTestValue(
      () => servicesApi.updateDeleteGuardConfig(payload),
      {
        ...mockDeleteGuard,
        is_configured: true,
        updated_at: new Date().toISOString(),
      },
    ),
  getAdminPublicSiteContent: async () =>
    withTestValue(() => publicSiteApi.getAdminPublicSiteContent(), mockPublicHomepage.content),
  updateAdminPublicSiteContent: publicSiteApi.updateAdminPublicSiteContent,
  getAdminPublicSiteTheme: async () => withTestValue(() => publicSiteApi.getAdminPublicSiteTheme(), fallbackPublicTheme),
  updateAdminPublicSiteTheme: publicSiteApi.updateAdminPublicSiteTheme,
  getAdminPublicSiteAdvertisements: async (params = {}) =>
    withTestValue(() => publicSiteApi.getAdminPublicSiteAdvertisements(params), filterSoftDeleted(mockPublicAdvertisements, params)),
  getMissingServiceRequests: async (params = {}) =>
    withTestValue(
      () => publicSiteApi.getMissingServiceRequests(params),
      mockPublicMissingServiceRequests.filter((item) => {
        if (params?.status && item.status !== params.status) return false
        if (params?.assigned_only && !item.assigned_to) return false
        return true
      }),
    ),
  getMissingServiceRequest: async (id) =>
    withTestValue(
      () => publicSiteApi.getMissingServiceRequest(id),
      mockPublicMissingServiceRequests.find((item) => item.id === Number(id)) || null,
    ),
  updateMissingServiceRequest: async (id, payload) =>
    withTestValue(
      () => publicSiteApi.updateMissingServiceRequest(id, payload),
      (() => {
        const index = mockPublicMissingServiceRequests.findIndex((item) => item.id === Number(id))
        if (index === -1) return null
        const current = mockPublicMissingServiceRequests[index]
        const updated = {
          ...current,
          ...payload,
          updated_at: new Date().toISOString(),
          assigned_to_name:
            payload?.assigned_to_name != null
              ? payload.assigned_to_name
              : current.assigned_to_name,
          matched_service_name:
            payload?.matched_service != null
              ? mockServices.find((service) => service.id === Number(payload.matched_service))?.name_ar || ''
              : current.matched_service_name,
        }
        mockPublicMissingServiceRequests = [
          updated,
          ...mockPublicMissingServiceRequests.filter((item) => item.id !== Number(id)),
        ]
        return updated
      })(),
    ),
  createAdminPublicSiteAdvertisement: publicSiteApi.createAdminPublicSiteAdvertisement,
  updateAdminPublicSiteAdvertisement: publicSiteApi.updateAdminPublicSiteAdvertisement,
  deleteAdminPublicSiteAdvertisement: async (id, payload = {}) =>
    withTestValue(
      () => publicSiteApi.deleteAdminPublicSiteAdvertisement(id, payload),
      (() => {
        mockPublicAdvertisements = softDeleteMockRecord(mockPublicAdvertisements, id, { delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminPublicSiteAdvertisement: async (id) =>
    withTestValue(
      () => publicSiteApi.restoreAdminPublicSiteAdvertisement(id),
      (() => {
        mockPublicAdvertisements = restoreMockRecord(mockPublicAdvertisements, id)
        return null
      })(),
    ),
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

  getProviders: async (params = {}) => withTestValue(() => providersApi.getProviders(params), filterSoftDeleted(mockProviderRecords, params)),
  createProvider: providersApi.createProvider,
  updateProvider: providersApi.updateProvider,
  deleteProvider: async (id, payload = {}) =>
    withTestValue(
      () => providersApi.deleteProvider(id, payload),
      (() => {
        mockProviderRecords = softDeleteMockRecord(mockProviderRecords, id, {
          account_active: false,
          delete_reason: payload.delete_reason || '',
        })
        return null
      })(),
    ),
  restoreProvider: async (id) =>
    withTestValue(
      () => providersApi.restoreProvider(id),
      (() => {
        mockProviderRecords = restoreMockRecord(mockProviderRecords, id, { account_active: true })
        return null
      })(),
    ),
  updateProviderApproval: providersApi.updateProviderApproval,
  updateProviderActivation: providersApi.updateProviderActivation,
  getNotifications: async () => withTestValue(() => notificationsApi.getNotifications(), mockNotifications),
  getNotificationCenter: async () => withTestValue(() => notificationsApi.getNotificationCenter(), mockNotificationCenter),
  getAuditLogs: async (params = {}) => withTestValue(() => notificationsApi.getAuditLogs(params), mockAuditLogs),
  getEmployeeNotificationTemplates: async () =>
    withTestValue(() => notificationsApi.getEmployeeNotificationTemplates(), mockNotificationTemplates.filter((item) => !item.is_deleted)),
  getAdminNotificationTemplates: async (params = {}) =>
    withTestValue(() => notificationsApi.getAdminNotificationTemplates(params), filterSoftDeleted(mockNotificationTemplates, params)),
  createAdminNotificationTemplate: notificationsApi.createAdminNotificationTemplate,
  updateAdminNotificationTemplate: notificationsApi.updateAdminNotificationTemplate,
  deleteAdminNotificationTemplate: async (id, payload = {}) =>
    withTestValue(
      () => notificationsApi.deleteAdminNotificationTemplate(id, payload),
      (() => {
        mockNotificationTemplates = softDeleteMockRecord(mockNotificationTemplates, id, {
          is_active: false,
          delete_reason: payload.delete_reason || '',
        })
        return null
      })(),
    ),
  restoreAdminNotificationTemplate: async (id) =>
    withTestValue(
      () => notificationsApi.restoreAdminNotificationTemplate(id),
      (() => {
        mockNotificationTemplates = restoreMockRecord(mockNotificationTemplates, id, { is_active: true })
        return null
      })(),
    ),
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
  getCurrentHelpGuides: async (params = {}) =>
    withTestValue(
      () => helpGuidesApi.getCurrentHelpGuides(params),
      {
        screen_key: params?.screen_key || '',
        screen_label: HELP_SCREEN_REGISTRY.find((item) => item.screen_key === params?.screen_key)?.label || '',
        workflow_status: params?.workflow_status || '',
        fields: mockHelpFields.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
        actions: mockHelpActions.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
        service: null,
        workflows: mockHelpWorkflows.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
        results: mockHelpGuides.filter((guide) => !guide.is_deleted && (!params?.screen_key || guide.screen_key === params.screen_key)),
        screen_guides: mockHelpGuides.filter((guide) => !guide.is_deleted && (!params?.screen_key || guide.screen_key === params.screen_key)),
      },
    ),
  getHelpGuideIndex: async (params = {}) =>
    withTestValue(() => helpGuidesApi.getHelpGuideIndex(params), {
      query: params?.q || params?.search || '',
      category: params?.category || '',
      slug: params?.slug || '',
      preview_role: params?.preview_role || '',
      guides: mockHelpGuides.filter((guide) => {
        if (guide.is_deleted) return false
        if (params?.category && guide.category !== params.category) return false
        if (params?.slug && guide.slug !== params.slug) return false
        const search = String(params?.q || params?.search || '').trim().toLowerCase()
        if (!search) return true
        return [guide.title, guide.short_description, guide.purpose, guide.slug]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      }),
      quick_links: mockHelpGuides.filter((guide) => guide.is_quick_link && !guide.is_deleted),
      ...mockHelpGuideMetadata,
    }),
  searchHelp: async (params = {}) =>
    withTestValue(() => helpGuidesApi.searchHelp(params), {
      query: params?.q || '',
      screens: mockHelpGuides.filter((item) => !item.is_deleted),
      actions: mockHelpActions.filter((item) => !item.is_deleted),
      fields: mockHelpFields.filter((item) => !item.is_deleted),
      services: [],
      workflows: mockHelpWorkflows.filter((item) => !item.is_deleted),
    }),
  getFieldHelp: async (params = {}) =>
    withTestValue(
      () => helpGuidesApi.getFieldHelp(params),
      mockHelpFields.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
    ),
  getActionHelp: async (params = {}) =>
    withTestValue(
      () => helpGuidesApi.getActionHelp(params),
      mockHelpActions.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
    ),
  getWorkflowHelp: async (params = {}) =>
    withTestValue(
      () => helpGuidesApi.getWorkflowHelp(params),
      mockHelpWorkflows.filter((item) => !item.is_deleted && (!params?.screen_key || item.screen_key === params.screen_key)),
    ),
  getServiceHelp: async (serviceId, params = {}) =>
    withTestValue(() => helpGuidesApi.getServiceHelp(serviceId, params), null),
  getHelpGuides: async (params = {}) =>
    withTestValue(
      () => helpGuidesApi.getHelpGuides(params),
      filterSoftDeleted(mockHelpGuides, params).filter((guide) => {
        const screenKey = String(params?.screen_key || '').trim()
        const search = String(params?.search || '').trim().toLowerCase()
        if (screenKey && guide.screen_key !== screenKey) return false
        if (!search) return true
        return [guide.title, guide.screen_label, guide.short_description, guide.purpose]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      }),
    ),
  getHelpGuideMetadata: async () => withTestValue(() => helpGuidesApi.getHelpGuideMetadata(), mockHelpGuideMetadata),
  getAdminHelpScreens: async (params = {}) =>
    withTestValue(() => helpGuidesApi.getAdminHelpScreens(params), filterSoftDeleted(mockHelpGuides, params)),
  createAdminHelpScreen: async (payload) =>
    withTestValue(
      () => helpGuidesApi.createAdminHelpScreen(payload),
      (() => {
        const nextId = (mockHelpGuides.at(-1)?.id || 0) + 1
        const created = {
          ...payload,
          id: nextId,
          screen_label: HELP_SCREEN_REGISTRY.find((item) => item.screen_key === payload?.screen_key)?.label || payload?.screen_key || 'دليل عام',
          role_label: mockHelpGuideMetadata.roles.find((item) => item.value === payload?.role)?.label || payload?.role || '',
          workflow_status_label:
            mockHelpGuideMetadata.workflow_statuses.find((item) => item.value === payload?.workflow_status)?.label || payload?.workflow_status || '',
          steps: String(payload?.step_by_step_guide || '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean),
          common_error_items: String(payload?.common_errors || '')
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean),
        }
        mockHelpGuides = [created, ...mockHelpGuides]
        return created
      })(),
    ),
  updateAdminHelpScreen: async (id, payload) =>
    withTestValue(
      () => helpGuidesApi.updateAdminHelpScreen(id, payload),
      (() => {
        mockHelpGuides = mockHelpGuides.map((guide) =>
          guide.id === Number(id)
            ? {
                ...guide,
                ...payload,
                screen_label: HELP_SCREEN_REGISTRY.find((item) => item.screen_key === payload?.screen_key)?.label || guide.screen_label,
                role_label: mockHelpGuideMetadata.roles.find((item) => item.value === payload?.role)?.label || guide.role_label,
                workflow_status_label:
                  mockHelpGuideMetadata.workflow_statuses.find((item) => item.value === payload?.workflow_status)?.label || payload?.workflow_status || '',
                steps: String((payload?.step_by_step_guide ?? guide.step_by_step_guide) || '')
                  .split(/\r?\n/)
                  .map((item) => item.trim())
                  .filter(Boolean),
                common_error_items: String((payload?.common_errors ?? guide.common_errors) || '')
                  .split(/\r?\n/)
                  .map((item) => item.trim())
                  .filter(Boolean),
              }
            : guide,
        )
        return mockHelpGuides.find((guide) => guide.id === Number(id)) || null
      })(),
    ),
  deleteAdminHelpScreen: async (id) =>
    withTestValue(
      () => helpGuidesApi.deleteAdminHelpScreen(id),
      (() => {
        mockHelpGuides = softDeleteMockRecord(mockHelpGuides, id, { is_active: false })
        return null
      })(),
    ),
  restoreAdminHelpScreen: async (id) =>
    withTestValue(
      () => helpGuidesApi.restoreAdminHelpScreen(id),
      (() => {
        mockHelpGuides = restoreMockRecord(mockHelpGuides, id, { is_active: true })
        return null
      })(),
    ),
  getAdminHelpFields: async (params = {}) => withTestValue(() => helpGuidesApi.getAdminHelpFields(params), filterSoftDeleted(mockHelpFields, params)),
  createAdminHelpField: async (payload) => withTestValue(() => helpGuidesApi.createAdminHelpField(payload), { id: Date.now(), ...payload }),
  updateAdminHelpField: async (id, payload) => withTestValue(() => helpGuidesApi.updateAdminHelpField(id, payload), { id: Number(id), ...payload }),
  deleteAdminHelpField: async (id, payload = {}) =>
    withTestValue(
      () => helpGuidesApi.deleteAdminHelpField(id, payload),
      (() => {
        mockHelpFields = softDeleteMockRecord(mockHelpFields, id, { is_active: false, delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminHelpField: async (id) =>
    withTestValue(
      () => helpGuidesApi.restoreAdminHelpField(id),
      (() => {
        mockHelpFields = restoreMockRecord(mockHelpFields, id, { is_active: true })
        return null
      })(),
    ),
  getAdminHelpActions: async (params = {}) => withTestValue(() => helpGuidesApi.getAdminHelpActions(params), filterSoftDeleted(mockHelpActions, params)),
  createAdminHelpAction: async (payload) => withTestValue(() => helpGuidesApi.createAdminHelpAction(payload), { id: Date.now(), ...payload }),
  updateAdminHelpAction: async (id, payload) => withTestValue(() => helpGuidesApi.updateAdminHelpAction(id, payload), { id: Number(id), ...payload }),
  deleteAdminHelpAction: async (id, payload = {}) =>
    withTestValue(
      () => helpGuidesApi.deleteAdminHelpAction(id, payload),
      (() => {
        mockHelpActions = softDeleteMockRecord(mockHelpActions, id, { is_active: false, delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminHelpAction: async (id) =>
    withTestValue(
      () => helpGuidesApi.restoreAdminHelpAction(id),
      (() => {
        mockHelpActions = restoreMockRecord(mockHelpActions, id, { is_active: true })
        return null
      })(),
    ),
  getAdminHelpServices: async (params = {}) => withTestValue(() => helpGuidesApi.getAdminHelpServices(params), filterSoftDeleted([], params)),
  createAdminHelpService: async (payload) => withTestValue(() => helpGuidesApi.createAdminHelpService(payload), { id: Date.now(), ...payload }),
  updateAdminHelpService: async (id, payload) => withTestValue(() => helpGuidesApi.updateAdminHelpService(id, payload), { id: Number(id), ...payload }),
  deleteAdminHelpService: async (id, payload = {}) => withTestValue(() => helpGuidesApi.deleteAdminHelpService(id, payload), null),
  restoreAdminHelpService: async (id) => withTestValue(() => helpGuidesApi.restoreAdminHelpService(id), null),
  getAdminHelpWorkflows: async (params = {}) => withTestValue(() => helpGuidesApi.getAdminHelpWorkflows(params), filterSoftDeleted(mockHelpWorkflows, params)),
  createAdminHelpWorkflow: async (payload) => withTestValue(() => helpGuidesApi.createAdminHelpWorkflow(payload), { id: Date.now(), ...payload }),
  updateAdminHelpWorkflow: async (id, payload) => withTestValue(() => helpGuidesApi.updateAdminHelpWorkflow(id, payload), { id: Number(id), ...payload }),
  deleteAdminHelpWorkflow: async (id, payload = {}) =>
    withTestValue(
      () => helpGuidesApi.deleteAdminHelpWorkflow(id, payload),
      (() => {
        mockHelpWorkflows = softDeleteMockRecord(mockHelpWorkflows, id, { is_active: false, delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminHelpWorkflow: async (id) =>
    withTestValue(
      () => helpGuidesApi.restoreAdminHelpWorkflow(id),
      (() => {
        mockHelpWorkflows = restoreMockRecord(mockHelpWorkflows, id, { is_active: true })
        return null
      })(),
    ),
  getAdminHelpScreenshots: async (params = {}) => withTestValue(() => helpGuidesApi.getAdminHelpScreenshots(params), filterSoftDeleted(mockHelpScreenshots, params)),
  createAdminHelpScreenshot: async (payload) =>
    withTestValue(
      () => helpGuidesApi.createAdminHelpScreenshot(payload),
      (() => {
        const created = { id: Date.now(), ...payload }
        mockHelpScreenshots = [created, ...mockHelpScreenshots]
        return created
      })(),
    ),
  updateAdminHelpScreenshot: async (id, payload) =>
    withTestValue(
      () => helpGuidesApi.updateAdminHelpScreenshot(id, payload),
      (() => {
        mockHelpScreenshots = mockHelpScreenshots.map((item) => (item.id === Number(id) ? { ...item, ...payload } : item))
        return mockHelpScreenshots.find((item) => item.id === Number(id)) || null
      })(),
    ),
  deleteAdminHelpScreenshot: async (id, payload = {}) =>
    withTestValue(
      () => helpGuidesApi.deleteAdminHelpScreenshot(id, payload),
      (() => {
        mockHelpScreenshots = softDeleteMockRecord(mockHelpScreenshots, id, { is_active: false, delete_reason: payload.delete_reason || '' })
        return null
      })(),
    ),
  restoreAdminHelpScreenshot: async (id) =>
    withTestValue(
      () => helpGuidesApi.restoreAdminHelpScreenshot(id),
      (() => {
        mockHelpScreenshots = restoreMockRecord(mockHelpScreenshots, id, { is_active: true })
        return null
      })(),
    ),

  getAvailablePermissions: async () => withTestValue(() => servicesApi.getAvailablePermissions(), {}),
  getUserPermissions: (userId) => servicesApi.getUserPermissions(userId),
  setUserPermissions: (userId, perms) => servicesApi.setUserPermissions(userId, perms),

  getProviderDashboard: async () =>
    withTestValue(() => providersApi.getProviderDashboard(), {
      assigned_orders: 6,
      in_progress: 3,
      completed: 12,
      delayed: 1,
      provider: mockProviderRecords[0],
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
  helpGuidesApi,
  notificationsApi,
  ordersApi,
  paymentApi,
  publicSiteApi,
  providersApi,
  servicesApi,
}

export default api

