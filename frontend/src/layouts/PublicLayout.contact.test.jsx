// D05 validation: the footer renders only the contact details the CMS publishes,
// with valid tel:/mailto: links, and says so when nothing is published.
import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import PublicLayout from './PublicLayout'
import { api } from '../api/services'

vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext')
  return { ...actual, useAuth: () => ({ user: null }) }
})

afterEach(() => vi.restoreAllMocks())

function renderWithContent(content) {
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValue({ content, advertisements: [], important_alert: null })
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes><Route element={<PublicLayout />}><Route index element={<p>home</p>} /></Route></Routes>
    </MemoryRouter>,
  )
}

const blank = { contact_phone: '', whatsapp_number: '', email: '', office_address: '', office_address_en: '' }

test('published phone and email render as valid tel: and mailto: links', async () => {
  renderWithContent({ ...blank, contact_phone: '+962 6 560 9000', email: 'support@khalsni.example.com', office_address: 'عمّان' })
  const phone = await screen.findByText('+962 6 560 9000')
  expect(phone.closest('a')).toHaveAttribute('href', 'tel:+96265609000')
  expect(screen.getByText('support@khalsni.example.com').closest('a')).toHaveAttribute('href', 'mailto:support@khalsni.example.com')
  expect(screen.getByText('عمّان')).toBeInTheDocument()
  expect(screen.queryByText('معلومات التواصل غير منشورة حالياً.')).not.toBeInTheDocument()
})

test('a blank email (as the API sends for a reserved .local address) renders no mail link', async () => {
  renderWithContent({ ...blank, contact_phone: '0791234567' })
  await screen.findByText('0791234567')
  expect(document.querySelector('footer a[href^="mailto:"]')).toBeNull()
  expect(document.querySelector('footer a[href="tel:0791234567"]')).not.toBeNull()
})

test('with no published contact details the footer says they are not published', async () => {
  renderWithContent({ ...blank })
  await waitFor(() => expect(screen.getByText('معلومات التواصل غير منشورة حالياً.')).toBeInTheDocument())
  expect(document.querySelector('footer a[href^="tel:"]')).toBeNull()
  expect(document.querySelector('footer a[href^="mailto:"]')).toBeNull()
})
