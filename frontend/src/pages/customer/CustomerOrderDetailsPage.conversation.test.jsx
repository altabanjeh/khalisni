// Items 13 and 15 on the customer order page: messages and complaints sections.
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, within } from '@testing-library/react'
import CustomerOrderDetailsPage from './CustomerOrderDetailsPage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

function order(overrides = {}) {
  return {
    id: 31,
    order_number: 'KH-2026-000031',
    status: 'IN_PROGRESS',
    city: 'Amman',
    final_price: '35.00',
    service: { id: 4, name_ar: 'تجديد رخصة', name_en: 'Licence renewal', slug: 'licence-renewal' },
    required_documents: [],
    documents: [],
    status_logs: [],
    allowed_actions: {},
    ...overrides,
  }
}

function renderPage(language) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/customer/orders/31']}>
        <Routes><Route path="/customer/orders/:id" element={<CustomerOrderDetailsPage />} /></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getService').mockResolvedValue(null)
})

test('the customer order page has a messages thread and a complaints section (AR)', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue(order())
  const messages = vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue([
    { id: 1, message: 'تم استلام طلبك', author_role: 'staff', created_at: '2026-05-01T10:00:00Z' },
  ])
  const complaints = vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValue([
    { id: 2, description: 'تأخر', is_resolved: true, created_at: '2026-05-01T10:00:00Z', resolved_at: '2026-05-02T10:00:00Z' },
  ])
  renderPage('ar')
  expect(await screen.findByRole('heading', { name: 'الرسائل' })).toBeInTheDocument()
  const thread = await screen.findByTestId('order-messages')
  expect(await within(thread).findByText('فريق خلصني')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'تقديم شكوى' })).toBeInTheDocument()
  expect(await within(screen.getByTestId('order-complaints')).findByText('تمت المعالجة')).toBeInTheDocument()
  expect(messages).toHaveBeenCalledWith(31)
  expect(complaints).toHaveBeenCalledWith(31)
})

test('English headings, and no send box on an archived order', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue(order({ status: 'ARCHIVED' }))
  vi.spyOn(api, 'getCustomerOrderMessages').mockResolvedValue([])
  vi.spyOn(api, 'getCustomerOrderComplaints').mockResolvedValue([])
  renderPage('en')
  expect(await screen.findByRole('heading', { name: 'Messages' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Report a problem' })).toBeInTheDocument()
  expect(within(screen.getByTestId('order-messages')).queryByRole('textbox')).not.toBeInTheDocument()
})
