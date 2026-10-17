// Release hardening: latent pagination. Each list asks the server for the page
// in view (DRF pages by 20) and sends its filters as query parameters, so
// every row is reachable and filtered counts are right across pages.
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { api } from '../api/services'
import OrdersManagementPage from './admin/OrdersManagementPage'
import AdminUsersRolesPage from './admin/AdminUsersRolesPage'
import ProvidersManagementPage from './admin/ProvidersManagementPage'
import NotificationsPage from './admin/NotificationsPage'
import EmployeeVerifyDocumentsPage from './employee/EmployeeVerifyDocumentsPage'
import MyOrdersPage from './customer/MyOrdersPage'
import AssignedOrdersPage from './provider/AssignedOrdersPage'

const TOTAL = 38

// A stand-in for the server: filters, then cuts page `page` of 20.
function serverPages(makeRow, { keep = () => true, statusCounts } = {}) {
  const all = Array.from({ length: TOTAL }, (_, index) => makeRow(index + 1))
  return (params = {}) => {
    const page = params.page || 1
    const rows = all.filter((row) => keep(row, params))
    return Promise.resolve({
      results: rows.slice((page - 1) * 20, page * 20),
      count: rows.length,
      hasNext: page * 20 < rows.length,
      hasPrevious: page > 1,
      ...(statusCounts ? { statusCounts } : {}),
    })
  }
}

function order(index, status = 'NEW') {
  return {
    id: index,
    order_number: `KH-2026-${String(index).padStart(6, '0')}`,
    status,
    city: 'Amman',
    customer: { full_name: `Customer ${index}` },
    service: { id: 1, name_ar: 'خدمة', name_en: 'Service', slug: 'service' },
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    missing_document_types: [],
  }
}

async function goToNextPage(user, spy, extra = {}) {
  await user.click(screen.getByRole('button', { name: 'الصفحة التالية' }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, ...extra })))
}

afterEach(() => vi.restoreAllMocks())

test('admin requests: page 2 comes from the server, chips and search are server params, counts are the server answer', async () => {
  const statusCounts = { all: TOTAL, action: 25, execution: 5, completed: 8 }
  const spy = vi.spyOn(api, 'getAdminOrdersPage').mockImplementation(serverPages(order, { statusCounts }))
  const user = userEvent.setup()
  render(<MemoryRouter><OrdersManagementPage /></MemoryRouter>)

  const table = () => screen.getByRole('region', { name: 'جدول الطلبات' })
  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'all', search: '' })
  // The chip counts are the server's, not counted from the 20 rows on screen.
  expect(screen.getByRole('button', { name: /يحتاج إجراء/ })).toHaveTextContent('25')
  expect(screen.getByRole('button', { name: /مكتملة/ })).toHaveTextContent('8')

  await goToNextPage(user, spy)
  expect(await within(table()).findByText('#KH-2026-000038')).toBeInTheDocument()
  expect(within(table()).queryByText('#KH-2026-000001')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /مكتملة/ }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'completed', search: '' }))

  await user.type(screen.getByRole('searchbox', { name: 'بحث في الطلبات' }), 'KH-2026-000007')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'completed', search: 'KH-2026-000007' }))
})

test('admin users: page 2, search and status filter are server requests', async () => {
  const spy = vi.spyOn(api, 'getAdminUsersPage').mockImplementation(serverPages((index) => ({
    id: index, full_name: `User ${index}`, email: `user${index}@example.test`, phone: '', role: 'employee',
    is_active: true, is_deleted: false, role_options: ['employee'],
  })))
  vi.spyOn(api, 'getMyMemberships').mockResolvedValue([])
  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  const table = () => screen.getByRole('region', { name: 'جدول المستخدمين' })
  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  await goToNextPage(user, spy, { status: 'active' })
  expect(await within(table()).findByText('User 38')).toBeInTheDocument()

  await user.type(screen.getByRole('searchbox', { name: 'بحث' }), 'user7@')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, status: 'active', search: 'user7@' }))

  await user.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب الحالة' }), 'deleted')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, status: 'deleted', search: 'user7@' }))
})

test('admin providers: page 2 and the status filter are server requests', async () => {
  const spy = vi.spyOn(api, 'getProvidersPage').mockImplementation(serverPages((index) => ({
    id: index, full_name: `Provider ${index}`, email: `p${index}@example.test`, provider_type: 'individual',
    account_active: true, is_approved: true, is_deleted: false, service_categories: [],
  })))
  vi.spyOn(api, 'getAdminServiceAssignments').mockResolvedValue([])
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([])
  const user = userEvent.setup()
  render(<MemoryRouter><ProvidersManagementPage /></MemoryRouter>)

  const table = () => screen.getByRole('region', { name: 'جدول المزودين' })
  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  await goToNextPage(user, spy, { status: 'active' })
  expect(await within(table()).findByText('Provider 38')).toBeInTheDocument()

  await user.selectOptions(screen.getByRole('combobox', { name: 'تصفية حسب الحالة' }), 'all')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, status: 'all' }))
})

test('admin notifications: page 2 comes from the server', async () => {
  const spy = vi.spyOn(api, 'getNotificationsPage').mockImplementation(serverPages((index) => ({
    id: index, title: `Notice ${index}`, recipient_name: 'Customer', status: 'sent', created_at: '2026-10-01T10:00:00Z',
  })))
  const user = userEvent.setup()
  render(<NotificationsPage />)

  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  await goToNextPage(user, spy)
  expect(await within(screen.getByRole('region', { name: 'جدول الإشعارات' })).findByText('Notice 38')).toBeInTheDocument()
})

test('verification queue: page 2 and the order filter are server requests, the count is the whole queue', async () => {
  const spy = vi.spyOn(api, 'getStaffDocumentsPage').mockImplementation(serverPages((index) => ({
    id: index, original_filename: `file-${index}.pdf`, status: 'pending_review', mime_type: 'application/pdf',
    document_type: 'passport', document_type_label: { ar: 'جواز سفر', en: 'Passport' }, order: { order_number: `KH-${index}` },
  })))
  vi.spyOn(api, 'downloadDocumentWithToken').mockResolvedValue(new Blob(['%PDF'], { type: 'application/pdf' }))
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/employee/documents?order=7']}><EmployeeVerifyDocumentsPage /></MemoryRouter>)

  expect(await screen.findByText('بانتظار التحقق (38)')).toBeInTheDocument()
  expect(spy).toHaveBeenLastCalledWith({ page: 1, order: '7' })
  await goToNextPage(user, spy, { order: '7' })
  expect(await screen.findByText('file-38.pdf')).toBeInTheDocument()
  expect(screen.queryByText('file-1.pdf')).not.toBeInTheDocument()
})

test('my requests: page 2, chips and search are server requests, counts are the server answer', async () => {
  const statusCounts = { all: TOTAL, action: 3, active: 33, done: 2 }
  const spy = vi.spyOn(api, 'getCustomerOrdersPage').mockImplementation(serverPages(order, { statusCounts }))
  const user = userEvent.setup()
  render(<MemoryRouter><MyOrdersPage /></MemoryRouter>)

  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: /مطلوب إجراء/ })).toHaveTextContent('3')
  await goToNextPage(user, spy)
  expect(await screen.findByText(/KH-2026-000038/)).toBeInTheDocument()

  await user.click(screen.getByRole('tab', { name: /مكتملة/ }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'done', search: '' }))
  await user.type(screen.getByRole('textbox', { name: 'بحث في الطلبات' }), 'KH-2026-000002')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'done', search: 'KH-2026-000002' }))
})

test('assigned requests: page 2, chips and search are server requests, counts are the server answer', async () => {
  const statusCounts = { all: TOTAL, active: 25, ready: 10, done: 3 }
  const spy = vi.spyOn(api, 'getProviderOrdersPage').mockImplementation(serverPages((index) => order(index, 'ASSIGNED'), { statusCounts }))
  const user = userEvent.setup()
  render(<MemoryRouter><AssignedOrdersPage /></MemoryRouter>)

  const table = () => screen.getByRole('region', { name: 'جدول الطلبات المعيّنة' })
  expect(await screen.findByText('عرض 1 - 20 من 38')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /جاهزة للتسليم/ })).toHaveTextContent('10')
  await goToNextPage(user, spy)
  expect(await within(table()).findByText('#KH-2026-000038')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /جاهزة للتسليم/ }))
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'ready', search: '' }))
  await user.type(screen.getByRole('searchbox', { name: 'بحث في الطلبات' }), 'Amman')
  await waitFor(() => expect(spy).toHaveBeenLastCalledWith({ page: 1, statusGroup: 'ready', search: 'Amman' }))
})
