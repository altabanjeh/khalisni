import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContactPage from './ContactPage'
import { api } from '../../api/services'

afterEach(() => vi.restoreAllMocks())

async function fillContact() {
  await userEvent.type(screen.getByRole('textbox', { name: /الاسم/ }), 'QA Customer')
  await userEvent.type(screen.getByRole('textbox', { name: /الهاتف/ }), '0791234567')
  await userEvent.type(screen.getByRole('textbox', { name: /الرسالة/ }), 'Please help with my request')
  await userEvent.click(screen.getByRole('button', { name: 'إرسال' }))
}

test('contact form shows required fields and confirms only a persisted submission', async () => {
  const create = vi.spyOn(api, 'createContactInquiry').mockResolvedValueOnce({ inquiry_id: 7 })
  render(<MemoryRouter><ContactPage /></MemoryRouter>)
  expect(screen.getByRole('textbox', { name: /البريد الإلكتروني/ })).toHaveAttribute('aria-required', 'false')
  expect(screen.getByRole('textbox', { name: /الاسم/ })).toHaveAttribute('aria-required', 'true')
  await fillContact()
  expect(await screen.findByText(/تم تسجيل رسالتك/)).toBeInTheDocument()
  expect(create).toHaveBeenCalledWith({ name: 'QA Customer', phone: '0791234567', email: '', message: 'Please help with my request' })
})

test('contact form reports storage failure without a success claim', async () => {
  vi.spyOn(api, 'createContactInquiry').mockRejectedValueOnce(new Error('Storage unavailable'))
  render(<MemoryRouter><ContactPage /></MemoryRouter>)
  await fillContact()
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage unavailable')
  expect(screen.queryByText(/تم تسجيل رسالتك/)).not.toBeInTheDocument()
})
