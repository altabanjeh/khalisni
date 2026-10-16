// Release hardening: latent pagination. The page wrappers ask for one server
// page and pass every filter as a query parameter.
import { http } from './client'
import { authApi } from './authApi'
import { documentsApi } from './documentsApi'
import { notificationsApi } from './notificationsApi'
import { ordersApi } from './ordersApi'
import { providersApi } from './providersApi'

const PAGE = { count: 38, next: 'http://x/?page=3', previous: 'http://x/?page=1', results: [{ id: 21 }] }

afterEach(() => vi.restoreAllMocks())

test('admin orders page sends the chip, the search and asks for the server counts', async () => {
  const get = vi.spyOn(http, 'get').mockResolvedValue({ ...PAGE, status_counts: { all: 38, completed: 4 } })
  const page = await ordersApi.getAdminOrdersPage({ page: 2, statusGroup: 'completed', search: ' KH-1 ' })
  expect(get).toHaveBeenCalledWith('/admin/orders/?page=2&status_group=completed&search=KH-1&include_status_counts=true')
  expect(page).toEqual({ results: [{ id: 21 }], count: 38, hasNext: true, hasPrevious: true, statusCounts: { all: 38, completed: 4 } })
  await ordersApi.getAdminOrdersPage({ page: 1, statusGroup: 'all' })
  expect(get).toHaveBeenLastCalledWith('/admin/orders/?page=1&include_status_counts=true')
})

test('customer and provider order pages send the chip and the search', async () => {
  const get = vi.spyOn(http, 'get').mockResolvedValue(PAGE)
  await ordersApi.getCustomerOrdersPage({ page: 2, statusGroup: 'action', search: 'x' })
  expect(get).toHaveBeenLastCalledWith('/customer/orders/?page=2&status_group=action&search=x&include_status_counts=true')
  await providersApi.getProviderOrdersPage({ page: 3, statusGroup: 'ready' })
  expect(get).toHaveBeenLastCalledWith('/provider/orders/?page=3&status_group=ready&include_status_counts=true')
})

test('dashboard order lists read every page instead of the first one', async () => {
  const get = vi.spyOn(http, 'get')
    .mockResolvedValueOnce({ count: 21, next: 'http://x/?page=2', results: Array.from({ length: 20 }, (_, id) => ({ id })) })
    .mockResolvedValueOnce({ count: 21, next: null, results: [{ id: 20 }] })
  const rows = await ordersApi.getCustomerOrders()
  expect(rows).toHaveLength(21)
  expect(get).toHaveBeenLastCalledWith('/customer/orders/?page=2')
})

test('users and providers pages send the active / deleted / all filter to the server', async () => {
  const get = vi.spyOn(http, 'get').mockResolvedValue(PAGE)
  await authApi.getAdminUsersPage({ page: 2, status: 'deleted', search: 'sam' })
  expect(get).toHaveBeenLastCalledWith('/admin/users/?page=2&search=sam&include_deleted=true&is_deleted=true')
  await authApi.getAdminUsersPage({ page: 1, status: 'active' })
  expect(get).toHaveBeenLastCalledWith('/admin/users/?page=1')
  await providersApi.getProvidersPage({ page: 2, status: 'all' })
  expect(get).toHaveBeenLastCalledWith('/admin/providers/?page=2&include_deleted=true')
})

test('notification log and verification queue ask for one page', async () => {
  const get = vi.spyOn(http, 'get').mockResolvedValue(PAGE)
  const notices = await notificationsApi.getNotificationsPage({ page: 2 })
  expect(get).toHaveBeenLastCalledWith('/admin/notifications/?page=2')
  expect(notices.count).toBe(38)
  await documentsApi.getStaffDocumentsPage({ page: 2, order: '7' })
  expect(get).toHaveBeenLastCalledWith('/staff/documents/?page=2&order=7')
})
