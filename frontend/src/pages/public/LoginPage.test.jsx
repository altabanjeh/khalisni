import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'
import { AuthProvider } from '../../context/AuthContext'
import { api } from '../../api/services'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
}

function renderLoginPage(initialEntry = '/login') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<><LocationProbe /><LoginPage /></>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

afterEach(() => {
  sessionStorage.clear()
  localStorage.clear()
  vi.restoreAllMocks()
})

test('successful customer login redirects to customer dashboard', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)
  vi.spyOn(api, 'login').mockResolvedValueOnce({
    access: 'fake-access-token',
    refresh: 'fake-refresh-token',
    user: { id: 2, full_name: 'أحمد خالد', role: 'customer', email: 'customer@khalisni.local' },
  })

  renderLoginPage('/login')

  await userEvent.type(await screen.findByRole('textbox', { name: /بريد|email/i }), 'customer@khalisni.local')
  await userEvent.type(screen.getByDisplayValue(''), 'Password@123')
  await userEvent.click(screen.getByRole('button', { name: /دخول|sign in/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/customer')
  })

  expect(sessionStorage.getItem('khalisni_access')).toBe('fake-access-token')
  expect(sessionStorage.getItem('khalisni_refresh')).toBe('fake-refresh-token')
  expect(localStorage.getItem('khalisni_access')).toBeNull()
  expect(localStorage.getItem('khalisni_refresh')).toBeNull()
})

test('successful admin login redirects to admin portal', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)
  vi.spyOn(api, 'login').mockResolvedValueOnce({
    access: 'fake-access-token',
    refresh: 'fake-refresh-token',
    user: { id: 1, full_name: 'مشرف النظام', role: 'admin', email: 'admin@khalisni.local' },
  })

  renderLoginPage('/login')

  await userEvent.type(await screen.findByRole('textbox', { name: /بريد|email/i }), 'admin@khalisni.local')
  await userEvent.type(screen.getByDisplayValue(''), 'Admin@123')
  await userEvent.click(screen.getByRole('button', { name: /دخول|sign in/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/admin')
  })
})

test('login respects ?next= redirect parameter', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)
  vi.spyOn(api, 'login').mockResolvedValueOnce({
    access: 'fake-access-token',
    refresh: 'fake-refresh-token',
    user: { id: 2, full_name: 'أحمد خالد', role: 'customer', email: 'customer@khalisni.local' },
  })

  renderLoginPage('/login?next=%2Fcustomer%2Forders%2Fnew%3Fservice%3D5')

  await userEvent.type(await screen.findByRole('textbox', { name: /بريد|email/i }), 'customer@khalisni.local')
  await userEvent.type(screen.getByDisplayValue(''), 'Password@123')
  await userEvent.click(screen.getByRole('button', { name: /دخول|sign in/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/customer/orders/new?service=5')
  })
})

test('remember me stores tokens in localStorage only', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)
  vi.spyOn(api, 'login').mockResolvedValueOnce({
    access: 'remember-access-token',
    refresh: 'remember-refresh-token',
    user: { id: 2, full_name: 'Ø£Ø­Ù…Ø¯ Ø®Ø§Ù„Ø¯', role: 'customer', email: 'customer@khalisni.local' },
  })

  renderLoginPage('/login')

  await userEvent.type(await screen.findByLabelText(/email|البريد/i), 'customer@khalisni.local')
  await userEvent.type(screen.getByLabelText(/password|كلمة/i), 'Password@123')
  await userEvent.click(screen.getByRole('checkbox', { name: /remember me|Ø§Ù„Ø¥Ø¨Ù‚Ø§Ø¡/i }))
  await userEvent.click(screen.getByRole('button', { name: /sign in|دخول/i }))

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/customer')
  })

  expect(localStorage.getItem('khalisni_access')).toBe('remember-access-token')
  expect(localStorage.getItem('khalisni_refresh')).toBe('remember-refresh-token')
  expect(sessionStorage.getItem('khalisni_access')).toBeNull()
  expect(sessionStorage.getItem('khalisni_refresh')).toBeNull()
})

test('wrong credentials show error message', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)
  vi.spyOn(api, 'login').mockRejectedValueOnce({
    response: { status: 401, data: { detail: 'No active account found with the given credentials' } },
  })

  renderLoginPage('/login')

  await userEvent.type(await screen.findByRole('textbox', { name: /بريد|email/i }), 'wrong@example.com')
  await userEvent.type(screen.getByDisplayValue(''), 'wrongpassword')
  await userEvent.click(screen.getByRole('button', { name: /دخول|sign in/i }))

  await waitFor(() => {
    expect(screen.getByText(/No active account/i)).toBeInTheDocument()
  })
})
