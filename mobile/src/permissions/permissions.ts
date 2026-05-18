import type { AppRole } from '../constants/roles';

const screenPermissions: Record<AppRole, string[]> = {
  client: [
    'ClientDashboard',
    'ServiceList',
    'ServiceDetail',
    'CreateOrder',
    'UploadOrderDocuments',
    'MyOrders',
    'ClientOrderDetail',
    'MissingDocumentRequests',
    'RespondToMissingDocument',
    'FinalDocument',
    'Notifications',
    'Profile',
    'Settings',
  ],
  employee: [
    'EmployeeDashboard',
    'ReviewOrders',
    'EmployeeOrderDetail',
    'VerifyDocuments',
    'RequestMissingDocument',
    'AssignProvider',
    'EmployeeTasks',
    'Notifications',
    'Reports',
    'Profile',
    'Settings',
  ],
  provider: [
    'ProviderDashboard',
    'AssignedOrders',
    'ProviderOrderDetail',
    'UploadFinalDocument',
    'ProviderTaskUpdate',
    'Notifications',
    'Profile',
    'Settings',
  ],
  admin: [
    'AdminDashboard',
    'ManageOrders',
    'AdminOrderDetail',
    'ManageUsers',
    'ManageRoles',
    'ManageServices',
    'ManagePrices',
    'ManageAdvertisements',
    'ManagePublicContent',
    'ReportsDashboard',
    'AuditLog',
    'Notifications',
    'Profile',
    'Settings',
  ],
};

const actionPermissions: Record<AppRole, string[]> = {
  client: ['orders.create', 'documents.upload', 'orders.cancel', 'orders.rate'],
  employee: ['orders.review', 'documents.verify', 'orders.assign_provider', 'orders.request_documents'],
  provider: ['orders.provider_update', 'documents.upload_final_document'],
  admin: ['*'],
};

export function hasRole(userRole: AppRole | null | undefined, required: AppRole | AppRole[]) {
  if (!userRole) return false;
  const normalized = Array.isArray(required) ? required : [required];
  return normalized.includes(userRole);
}

export function hasPermission(userPermissions: string[] = [], permission: string) {
  return userPermissions.includes(permission);
}

export function canViewScreen(role: AppRole | null | undefined, screenName: string) {
  if (!role) return false;
  if (role === 'admin') return true;
  return screenPermissions[role].includes(screenName);
}

export function canPerformAction(role: AppRole | null | undefined, userPermissions: string[] = [], action: string) {
  if (!role) return false;
  if (role === 'admin') return true;
  return actionPermissions[role].includes(action) || hasPermission(userPermissions, action);
}
