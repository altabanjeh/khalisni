// D05: the contact page shows the contact details the CMS publishes (the one
// source shared with the footer), or says they are not published.
import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import ContactPage from './ContactPage'
import { api } from '../../api/services'

afterEach(() => vi.restoreAllMocks())

test('published phone, WhatsApp, email, address and hours are shown with working links', async () => {
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValueOnce({
    content: {
      contact_phone: '+962 6 552 7381', whatsapp_number: '+962 79 552 7381', email: 'support@khalsni.jo',
      office_address: 'عمّان', office_address_en: 'Amman', office_hours_ar: 'الأحد - الخميس', office_hours_en: 'Sunday - Thursday',
    },
  })
  render(<MemoryRouter><ContactPage /></MemoryRouter>)
  const details = await screen.findByTestId('contact-page-details')
  expect(await within(details).findByText('+962 6 552 7381')).toBeInTheDocument()
  expect(within(details).getByText('+962 6 552 7381').closest('a')).toHaveAttribute('href', 'tel:+96265527381')
  expect(within(details).getByText('+962 79 552 7381').closest('a')).toHaveAttribute('href', 'https://wa.me/962795527381')
  expect(within(details).getByText('support@khalsni.jo').closest('a')).toHaveAttribute('href', 'mailto:support@khalsni.jo')
  expect(within(details).getByText('عمّان')).toBeInTheDocument()
  expect(within(details).getByText('الأحد - الخميس')).toBeInTheDocument()
})

test('with nothing published the contact page says so and the form still works', async () => {
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValueOnce({ content: { contact_phone: '', email: '' } })
  render(<MemoryRouter><ContactPage /></MemoryRouter>)
  const details = await screen.findByTestId('contact-page-details')
  expect(await within(details).findByText('معلومات التواصل غير منشورة حالياً.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'إرسال' })).toBeInTheDocument()
})
