import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersRolesPage from './AdminUsersRolesPage'
import { api } from '../../api/services'

// The users table reads one server page (release hardening: latent pagination).
function mockAdminUsersPage(rows) {
  return vi.spyOn(api, 'getAdminUsersPage').mockResolvedValue({ results: rows, count: rows.length, hasNext: false, hasPrevious: false })
}

const fullNamePlaceholder = 'الاسم الكامل'
const emailPlaceholder = 'البريد الإلكتروني'
const passwordPlaceholder = 'كلمة المرور'
const openCreateLabel = '+ مستخدم تشغيلي جديد'
const addUserLabel = 'إضافة المستخدم'

const mockUsers = [
  {
    id: 2,
    full_name: 'Existing User',
    email: 'existing@khalisni.local',
    phone: '0790000002',
    role: 'customer',
    national_id: '',
    is_active: true,
    is_verified: false,
    is_super_admin: false,
    role_options: ['customer', 'employee', 'support', 'provider'],
    current_permissions: ['orders.review_order'],
  },
]

const mockAvailablePermissions = {
  orders: [
    { id: 10, codename: 'review_order', full_codename: 'orders.review_order', name: 'Can review order' },
    { id: 11, codename: 'assign_order', full_codename: 'orders.assign_order', name: 'Can assign order' },
  ],
  documents: [
    { id: 20, codename: 'verify_document', full_codename: 'documents.verify_document', name: 'Can verify document' },
  ],
}

test('admin users page can create a new user from the admin flow', async () => {
  mockAdminUsersPage(mockUsers)
  const createUserSpy = vi.spyOn(api, 'createAdminUser').mockResolvedValue({ id: 9 })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  await waitFor(() => {
    expect(screen.getByText('Existing User')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: openCreateLabel }))
  await user.type(screen.getByPlaceholderText(fullNamePlaceholder), 'New Employee')
  await user.type(screen.getByPlaceholderText(emailPlaceholder), 'employee2@khalisni.local')
  await user.type(screen.getByPlaceholderText(passwordPlaceholder), 'Password123')

  const roleSelect = screen.getByRole('combobox')
  await user.selectOptions(roleSelect, 'employee')
  await user.click(screen.getByRole('button', { name: addUserLabel }))

  await waitFor(() => {
    expect(createUserSpy).toHaveBeenCalledWith({
      full_name: 'New Employee',
      email: 'employee2@khalisni.local',
      phone: '',
      password: 'Password123',
      role: 'employee',
      national_id: '',
      is_active: true,
      is_verified: false,
    })
  })
})

test('admin can open permissions tab for an existing user and save permission changes', async () => {
  mockAdminUsersPage(mockUsers)
  vi.spyOn(api, 'getAvailablePermissions').mockResolvedValue(mockAvailablePermissions)
  const setPermsSpy = vi.spyOn(api, 'setUserPermissions').mockResolvedValue({
    permissions: ['orders.assign_order'],
  })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  await waitFor(() => {
    expect(screen.getByText('Existing User')).toBeInTheDocument()
  })

  const editButton = screen.getAllByRole('button', { name: /تعديل/ })[0]
  await user.click(editButton)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /الصلاحيات/ })).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /الصلاحيات/ }))

  await waitFor(() => {
    expect(screen.getByLabelText('Can review order')).toBeInTheDocument()
  })

  expect(screen.getByLabelText('Can review order')).toBeChecked()
  expect(screen.getByLabelText('Can assign order')).not.toBeChecked()

  await user.click(screen.getByLabelText('Can review order'))
  await user.click(screen.getByLabelText('Can assign order'))
  await user.click(screen.getByRole('button', { name: /حفظ الصلاحيات/ }))

  await waitFor(() => {
    expect(setPermsSpy).toHaveBeenCalledWith(2, expect.arrayContaining(['orders.assign_order']))
  })

  const savedPerms = setPermsSpy.mock.calls[0][1]
  expect(savedPerms).not.toContain('orders.review_order')
})

test('permissions tab shows empty state when user has no current permissions', async () => {
  const usersWithNoPerms = [{ ...mockUsers[0], current_permissions: [] }]
  mockAdminUsersPage(usersWithNoPerms)
  vi.spyOn(api, 'getAvailablePermissions').mockResolvedValue(mockAvailablePermissions)
  vi.spyOn(api, 'setUserPermissions').mockResolvedValue({ permissions: [] })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  await waitFor(() => {
    expect(screen.getByText('Existing User')).toBeInTheDocument()
  })

  await user.click(screen.getAllByRole('button', { name: /تعديل/ })[0])

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /الصلاحيات/ })).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /الصلاحيات/ }))

  await waitFor(() => {
    expect(screen.getByLabelText('Can review order')).toBeInTheDocument()
  })

  expect(screen.getByLabelText('Can review order')).not.toBeChecked()
  expect(screen.getByLabelText('Can assign order')).not.toBeChecked()
  expect(screen.getByLabelText('Can verify document')).not.toBeChecked()
})

test('an organization admin creates a user inside the organization they administer', async () => {
  mockAdminUsersPage([
    { ...mockUsers[0], role: 'employee', role_options: ['employee', 'provider'] },
  ])
  vi.spyOn(api, 'getMyMemberships').mockResolvedValue([
    { id: 1, organization: 7, organization_name: 'Partner A', role: 'partner_admin', is_active: true },
    { id: 2, organization: 8, organization_name: 'Partner B', role: 'partner_employee', is_active: true },
  ])
  const createUserSpy = vi.spyOn(api, 'createAdminUser').mockResolvedValue({ id: 9 })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)
  await waitFor(() => expect(screen.getByText('Existing User')).toBeInTheDocument())

  await user.click(screen.getByRole('button', { name: openCreateLabel }))
  await user.type(screen.getByPlaceholderText(fullNamePlaceholder), 'Partner Staff')
  await user.type(screen.getByPlaceholderText(emailPlaceholder), 'staff@partner-a.example')
  await user.type(screen.getByPlaceholderText(passwordPlaceholder), 'Password123')

  // Only the organization the caller administers is offered.
  expect(screen.getByRole('option', { name: 'Partner A' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: 'Partner B' })).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('الدور داخل الجهة'), 'finance')
  await user.click(screen.getByRole('button', { name: addUserLabel }))

  await waitFor(() => {
    expect(createUserSpy).toHaveBeenCalledWith(expect.objectContaining({
      email: 'staff@partner-a.example',
      role: 'employee',
      organization_id: 7,
      membership_role: 'finance',
    }))
  })
})
