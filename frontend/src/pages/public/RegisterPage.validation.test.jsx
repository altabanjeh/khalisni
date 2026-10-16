import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from './RegisterPage'
import { api } from '../../api/services'
import { PASSWORD_RULES } from '../../utils/passwordPolicy'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'
import { LanguageProvider } from '../../context/LanguageContext'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.removeItem(LANGUAGE_STORAGE_KEY)
})

function renderPage() {
  return render(<LanguageProvider><MemoryRouter><RegisterPage /></MemoryRouter></LanguageProvider>)
}

async function fillValidForm(user, phone = '0791234567') {
  await user.type(await screen.findByLabelText(/الاسم الكامل/), 'سارة محمود')
  await user.type(screen.getByLabelText(/رقم الهاتف/), phone)
  await user.type(screen.getByLabelText(/البريد الإلكتروني/), 'sara@example.com')
  await user.type(document.getElementById('reg-password'), 'Khalsni-Reg-2026!')
}

test('phone is labelled required, uses a phone keypad and shows an example', async () => {
  renderPage()
  const phone = await screen.findByLabelText(/رقم الهاتف/)
  expect(phone).toHaveAttribute('type', 'tel')
  expect(phone).toHaveAttribute('inputmode', 'tel')
  expect(phone).toHaveAttribute('aria-required', 'true')
  expect(phone.closest('div')).toHaveTextContent('(مطلوب)')
  expect(document.getElementById(phone.getAttribute('aria-describedby'))).toHaveTextContent('0791234567')
})

test('the server phone error is shown under the field', async () => {
  const message = 'أدخل رقم هاتف صحيحاً من 8 إلى 15 رقماً، مثل 0791234567 أو ‎+962791234567.'
  vi.spyOn(api, 'register').mockRejectedValueOnce({ fieldErrors: { phone: [message] } })
  const user = userEvent.setup()
  renderPage()
  await fillValidForm(user, 'abc')
  await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(screen.getByLabelText(/رقم الهاتف/)).toHaveAttribute('aria-invalid', 'true')
})

test('the customer-facing duplicate-account message is shown, not a model message', async () => {
  const message = 'يوجد حساب مسجّل بهذا البريد الإلكتروني. سجّل الدخول أو استخدم خيار «نسيت كلمة المرور».'
  vi.spyOn(api, 'register').mockRejectedValueOnce({ fieldErrors: { email: [message] } })
  const user = userEvent.setup()
  renderPage()
  await fillValidForm(user)
  await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/النموذج User/)
})

test('password guidance lists every server rule in Arabic', async () => {
  renderPage()
  const rules = await screen.findByTestId('password-rules')
  const items = [...rules.querySelectorAll('li')].map((item) => item.textContent)
  expect(items).toEqual(PASSWORD_RULES.map((rule) => rule.ar))
  expect(items).toHaveLength(4)
  expect(document.getElementById('reg-password')).toHaveAttribute('aria-describedby', 'reg-password-hint')
})

test('password guidance and phone example are in English in English mode', async () => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en')
  renderPage()
  const rules = await screen.findByTestId('password-rules')
  expect([...rules.querySelectorAll('li')].map((item) => item.textContent)).toEqual(PASSWORD_RULES.map((rule) => rule.en))
  expect(screen.getByText(/Example: 0791234567/)).toBeInTheDocument()
})

test('a valid form is still submitted unchanged', async () => {
  const spy = vi.spyOn(api, 'register').mockResolvedValueOnce({ id: 1, email: 'sara@example.com' })
  const user = userEvent.setup()
  renderPage()
  await fillValidForm(user, '+962 79 123 4567')
  await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))
  await waitFor(() => expect(spy).toHaveBeenCalledWith(expect.objectContaining({ phone: '+962 79 123 4567' })))
})
