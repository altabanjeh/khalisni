import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from './RegisterPage'
import { api } from '../../api/services'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
}

function renderRegisterPage(initialEntry = '/register') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="*" element={<><LocationProbe /><RegisterPage /></>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('successful registration redirects to login with registered flag and pre-filled email', async () => {
  vi.spyOn(api, 'register').mockResolvedValueOnce({
    id: 99,
    full_name: 'سارة محمود',
    email: 'sara@example.com',
    phone: '0791234567',
    role: 'customer',
  })

  renderRegisterPage('/register')

  await userEvent.type(await screen.findByRole('textbox', { name: /الاسم|full.name/i }), 'سارة محمود')
  await userEvent.type(screen.getByRole('textbox', { name: /هاتف|phone/i }), '0791234567')
  await userEvent.type(screen.getByRole('textbox', { name: /بريد|email/i }), 'sara@example.com')

  const nationalIdInput = screen.queryByRole('textbox', { name: /هوية|national/i })
  if (nationalIdInput) await userEvent.type(nationalIdInput, '1234567890')

  const passwordInputs = document.querySelectorAll('input[type="password"]')
  if (passwordInputs.length > 0) await userEvent.type(passwordInputs[0], 'Password@123')

  await userEvent.click(screen.getByRole('button', { name: /إنشاء|register|تسجيل/i }))

  await waitFor(() => {
    const probe = screen.getByTestId('location-probe').textContent
    expect(probe).toContain('/login')
    expect(probe).toContain('registered=1')
    expect(probe).toContain('sara%40example.com')
  })
})

test('duplicate email shows field error', async () => {
  vi.spyOn(api, 'register').mockRejectedValueOnce({
    fieldErrors: { email: ['A user with this email already exists.'] },
  })

  renderRegisterPage('/register')

  await userEvent.type(await screen.findByRole('textbox', { name: /الاسم|full.name/i }), 'تجربة')
  await userEvent.type(screen.getByRole('textbox', { name: /هاتف|phone/i }), '0791111111')
  await userEvent.type(screen.getByRole('textbox', { name: /بريد|email/i }), 'existing@example.com')
  await userEvent.type(document.getElementById('reg-password'), 'Password@123')

  await userEvent.click(screen.getByRole('button', { name: /إنشاء|register|تسجيل/i }))

  await waitFor(() => {
    expect(screen.getByText(/already exists|موجود/i)).toBeInTheDocument()
  })
})
