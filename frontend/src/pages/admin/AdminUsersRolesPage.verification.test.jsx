import { render, screen, within } from '@testing-library/react'
import AdminUsersRolesPage from './AdminUsersRolesPage'
import { api } from '../../api/services'

afterEach(() => vi.restoreAllMocks())

const base = { phone: '', role: 'employee', national_id: '', is_super_admin: false, role_options: ['employee'], current_permissions: [] }
const users = [
  { ...base, id: 1, full_name: 'Active Unverified', email: 'a@example.test', is_active: true, is_verified: false, is_email_verified: false, is_phone_verified: false },
  { ...base, id: 2, full_name: 'Inactive Email Confirmed', email: 'b@example.test', is_active: false, is_verified: false, is_email_verified: true, is_phone_verified: false },
  { ...base, id: 3, full_name: 'Active Verified', email: 'c@example.test', is_active: true, is_verified: true, is_email_verified: false, is_phone_verified: true },
]

function rowOf(name) {
  return screen.getByText(name).closest('tr')
}

function facts(row) {
  return Object.fromEntries(
    [...within(row).getByTestId('user-verification').querySelectorAll('li')].map((item) => [item.dataset.field, item.textContent]),
  )
}

test('an active user is not shown as verified, and each verification fact is separate', async () => {
  vi.spyOn(api, 'getAdminUsers').mockResolvedValue(users)
  render(<AdminUsersRolesPage />)
  await screen.findByText('Active Unverified')

  // 11. active + not verified
  const active = rowOf('Active Unverified')
  expect(within(active).getByTestId('user-account-state')).toHaveTextContent('نشط')
  expect(facts(active)).toEqual({
    is_verified: 'الحساب موثّق:لا',
    is_email_verified: 'البريد الإلكتروني مؤكَّد:لا',
    is_phone_verified: 'رقم الهاتف مؤكَّد:لا',
  })

  // 12. inactive
  const inactive = rowOf('Inactive Email Confirmed')
  expect(within(inactive).getByTestId('user-account-state')).toHaveTextContent('غير نشط')
  // 13. verification shown independently of the account state
  expect(facts(inactive).is_email_verified).toBe('البريد الإلكتروني مؤكَّد:نعم')
  expect(facts(inactive).is_verified).toBe('الحساب موثّق:لا')

  const verified = rowOf('Active Verified')
  expect(facts(verified)).toEqual({
    is_verified: 'الحساب موثّق:نعم',
    is_email_verified: 'البريد الإلكتروني مؤكَّد:لا',
    is_phone_verified: 'رقم الهاتف مؤكَّد:نعم',
  })
  expect(document.body.textContent).not.toMatch(/تم التحقق/)
})

test('a missing verification field is reported as not available, never as verified', async () => {
  vi.spyOn(api, 'getAdminUsers').mockResolvedValue([{ ...base, id: 9, full_name: 'Old Payload', email: 'd@example.test', is_active: true }])
  render(<AdminUsersRolesPage />)
  await screen.findByText('Old Payload')
  expect(facts(rowOf('Old Payload')).is_email_verified).toBe('البريد الإلكتروني مؤكَّد:غير متاح')
})
