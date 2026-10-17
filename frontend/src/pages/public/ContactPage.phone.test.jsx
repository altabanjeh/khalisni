import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ContactPage from './ContactPage'
import RegisterPage from './RegisterPage'
import { getPhoneFormatHint } from '../../utils/phoneInput'

// U04: the contact phone field is a telephone input with the same format
// guidance as the register page.

test('contact phone field is a tel input with the register-page guidance', () => {
  render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  )
  const input = screen.getByRole('textbox', { name: /الهاتف/ })
  expect(input).toHaveAttribute('type', 'tel')
  expect(input).toHaveAttribute('inputmode', 'tel')
  expect(input).toHaveAttribute('autocomplete', 'tel')
  expect(input).toHaveAccessibleDescription(getPhoneFormatHint(true))
})

test('register and contact pages show identical phone guidance', () => {
  const { unmount } = render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
  const registerHint = document.getElementById('reg-phone-hint').textContent
  unmount()

  render(
    <MemoryRouter>
      <ContactPage />
    </MemoryRouter>,
  )
  expect(document.getElementById('contact-phone-hint').textContent).toBe(registerHint)
  expect(registerHint).toBe(getPhoneFormatHint(true))
})
