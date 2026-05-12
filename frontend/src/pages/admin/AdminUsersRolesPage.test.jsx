import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminUsersRolesPage from './AdminUsersRolesPage'
import { api } from '../../api/services'

const fullNamePlaceholder = 'الاسم الكامل'
const emailPlaceholder = 'البريد الإلكتروني'
const passwordPlaceholder = 'كلمة المرور'
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
  vi.spyOn(api, 'getAdminUsers').mockResolvedValue(mockUsers)
  const createUserSpy = vi.spyOn(api, 'createAdminUser').mockResolvedValue({ id: 9 })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  await waitFor(() => {
    expect(screen.getByText('Existing User')).toBeInTheDocument()
  })

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
  vi.spyOn(api, 'getAdminUsers').mockResolvedValue(mockUsers)
  vi.spyOn(api, 'getAvailablePermissions').mockResolvedValue(mockAvailablePermissions)
  const setPermsSpy = vi.spyOn(api, 'setUserPermissions').mockResolvedValue({
    permissions: ['orders.assign_order'],
  })

  const user = userEvent.setup()
  render(<AdminUsersRolesPage />)

  await waitFor(() => {
    expect(screen.getByText('Existing User')).toBeInTheDocument()
  })

  // Select the user by clicking the edit button in the table
  const editButton = screen.getAllByRole('button', { name: /تعديل/ })[0]
  await user.click(editButton)

  // The permissions tab should now appear since a user is selected
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /الصلاحيات/ })).toBeInTheDocument()
  })

  // Switch to the permissions tab
  await user.click(screen.getByRole('button', { name: /الصلاحيات/ }))

  // Wait for available permissions to load and render as checkboxes
  await waitFor(() => {
    expect(screen.getByLabelText('Can review order')).toBeInTheDocument()
  })

  // review_order should be pre-checked (it's in current_permissions)
  expect(screen.getByLabelText('Can review order')).toBeChecked()
  // assign_order should be unchecked
  expect(screen.getByLabelText('Can assign order')).not.toBeChecked()

  // Uncheck review_order and check assign_order
  await user.click(screen.getByLabelText('Can review order'))
  await user.click(screen.getByLabelText('Can assign order'))

  // Save
  await user.click(screen.getByRole('button', { name: /حفظ الصلاحيات/ }))

  await waitFor(() => {
    expect(setPermsSpy).toHaveBeenCalledWith(2, expect.arrayContaining(['orders.assign_order']))
  })
  // review_order must NOT be in the saved list
  const savedPerms = setPermsSpy.mock.calls[0][1]
  expect(savedPerms).not.toContain('orders.review_order')
})

test('permissions tab shows empty state when user has no current permissions', async () => {
  const usersWithNoPerms = [{ ...mockUsers[0], current_permissions: [] }]
  vi.spyOn(api, 'getAdminUsers').mockResolvedValue(usersWithNoPerms)
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

  // All checkboxes should be unchecked when current_permissions is empty
  expect(screen.getByLabelText('Can review order')).not.toBeChecked()
  expect(screen.getByLabelText('Can assign order')).not.toBeChecked()
  expect(screen.getByLabelText('Can verify document')).not.toBeChecked()
})
