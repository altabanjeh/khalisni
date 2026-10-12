import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerOrderDetailsPage from './CustomerOrderDetailsPage'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

// KHS-037: the customer order page is complete in Arabic and in English and
// never prints internal identifiers.

const ARABIC = /[؀-ۿ]/

function order(overrides = {}) {
  return {
    id: 31,
    order_number: 'KH-2026-000031',
    status: 'WAITING_CUSTOMER',
    city: 'Amman',
    final_price: '35.00',
    expected_delivery_date: '2026-11-01',
    customer_notes: '',
    service: { id: 4, name_ar: 'تجديد رخصة', name_en: 'Licence renewal', slug: 'licence-renewal' },
    missing_document_types: ['legal_authorization'],
    required_documents: [
      { document_type: 'legal_authorization', name_ar: 'كتاب تفويض', name_en: 'Authorization letter', is_required: true },
      { document_type: 'national_id', name_ar: 'هوية', name_en: 'National ID', is_required: true },
    ],
    documents: [
      { id: 1, document_type: 'national_id', original_filename: 'id.pdf', status: 'approved', is_final_document: false },
    ],
    status_logs: [{ id: 1, old_status: '', new_status: 'NEW', note: '', created_at: '2026-10-01T10:00:00Z' }],
    notes: [],
    allowed_actions: {
      can_view_missing_documents_form: true,
      can_upload_customer_document: true,
      can_cancel: true,
      can_submit_rating: false,
    },
    ...overrides,
  }
}

function renderPage(language) {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/customer/orders/31']}>
        <Routes>
          <Route path="/customer/orders/:id" element={<CustomerOrderDetailsPage />} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue(order())
  vi.spyOn(api, 'getService').mockResolvedValue({ slug: 'licence-renewal', required_documents: [] })
})

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

test('English mode has no Arabic interface text and no internal identifiers', async () => {
  const { container } = renderPage('en')
  await waitFor(() => expect(screen.getByText('KH-2026-000031')).toBeInTheDocument())

  expect(screen.getByRole('heading', { level: 1, name: 'Action needed from you' })).toBeInTheDocument()
  expect(screen.getAllByText('Licence renewal').length).toBeGreaterThan(0)
  expect(screen.getByRole('option', { name: 'Authorization letter' })).toBeInTheDocument()
  expect(screen.getByText('National ID')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Upload document' })).toBeInTheDocument()

  const text = container.textContent
  expect(text).not.toMatch(ARABIC)
  expect(text).not.toContain('legal_authorization')
  expect(text).not.toContain('national_id')
  expect(text).not.toContain('WAITING_CUSTOMER')
})

test('Arabic mode shows Arabic labels and no internal identifiers', async () => {
  const { container } = renderPage('ar')
  await waitFor(() => expect(screen.getByText('KH-2026-000031')).toBeInTheDocument())

  expect(screen.getByRole('heading', { level: 1, name: 'إجراء مطلوب منك' })).toBeInTheDocument()
  expect(screen.getAllByText('تجديد رخصة').length).toBeGreaterThan(0)
  expect(screen.getByRole('option', { name: 'كتاب تفويض' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'إلغاء الطلب' })).toBeInTheDocument()

  const text = container.textContent
  expect(text).not.toContain('legal_authorization')
  expect(text).not.toContain('national_id')
  expect(text).not.toContain('WAITING_CUSTOMER')
  expect(text).not.toContain('Action needed from you')
})

test('the order number keeps its own direction inside right-to-left text', async () => {
  renderPage('ar')
  const number = await screen.findByText('KH-2026-000031')
  expect(number.tagName).toBe('BDI')
  expect(number).toHaveAttribute('dir', 'ltr')
})

test('a failed load explains itself instead of spinning', async () => {
  api.getCustomerOrder.mockRejectedValue(Object.assign(new Error('gone'), { displayMessage: 'The requested item was not found.' }))
  renderPage('en')

  expect(await screen.findByText('The requested item was not found.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Back to my requests' })).toBeInTheDocument()
})

test('cancelling asks first and a double click cancels once', async () => {
  let resolve
  const cancelSpy = vi.spyOn(api, 'cancelCustomerOrder').mockReturnValue(new Promise((res) => { resolve = res }))
  renderPage('en')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Cancel request' }))
  expect(cancelSpy).not.toHaveBeenCalled()

  await user.dblClick(screen.getByRole('button', { name: 'Yes, cancel it' }))
  await waitFor(() => expect(cancelSpy).toHaveBeenCalledTimes(1))
  resolve({ status: 'CANCELLED' })
})
