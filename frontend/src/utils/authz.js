import { normalizeRole } from './format'

export function hasPermission(user, permissionName) {
  return Array.isArray(user?.permissions) && user.permissions.includes(permissionName)
}

export function hasAnyPermission(user, permissionNames = []) {
  return permissionNames.some((permissionName) => hasPermission(user, permissionName))
}

export function getDefaultDashboardPath(user) {
  const role = normalizeRole(user?.role)

  if (role === 'admin') return '/admin'
  if (role === 'employee' || role === 'support') return '/employee'
  if (role === 'provider') return '/provider'
  if (role === 'customer') return '/customer'
  return '/'
}

export function getOrderAllowedActions(order) {
  return order?.allowed_actions || {}
}
