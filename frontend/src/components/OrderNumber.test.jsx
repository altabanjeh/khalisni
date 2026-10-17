import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import OrderNumber from './OrderNumber'
import MissingDocumentsResponsePage from '../pages/customer/MissingDocumentsResponsePage'
import { api } from '../api/services'

// DEF-C02: an order number is one LTR, non-breaking token inside RTL text.

afterEach(() => vi.restoreAllMocks())

test('renders an isolated, left-to-right, non-wrapping token', () => {
  render(
    <h1 dir="rtl">
      الطلب <OrderNumber hash value="KH-2026-000005" />
    </h1>,
  )
  const token = screen.getByText('#KH-2026-000005')
  expect(token.tagName).toBe('BDI')
  expect(token).toHaveAttribute('dir', 'ltr')
  expect(token).toHaveClass('whitespace-nowrap')
  expect(token.className).toContain('[unicode-bidi:isolate]')
})

test('renders nothing without a value', () => {
  const { container } = render(<OrderNumber value="" />)
  expect(container).toBeEmptyDOMElement()
})

test('the missing-documents heading keeps the order number in one token', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue({
    id: 5,
    order_number: 'KH-2026-000005',
    status: 'WAITING_CUSTOMER',
    service: { slug: 'svc' },
    missing_document_types: ['national_id'],
    required_documents: [{ id: 1, document_type: 'national_id', name_ar: 'الهوية الشخصية', allowed_extensions: ['.pdf'] }],
    notes: [],
    allowed_actions: { can_view_missing_documents_form: true },
  })
  render(
    <MemoryRouter initialEntries={['/customer/orders/5/missing-docs']}>
      <Routes>
        <Route path="/customer/orders/:id/missing-docs" element={<MissingDocumentsResponsePage />} />
      </Routes>
    </MemoryRouter>,
  )
  const heading = await screen.findByRole('heading', { level: 1, name: /KH-2026-000005/ })
  const token = heading.querySelector('bdi[dir="ltr"]')
  expect(token).toHaveTextContent('KH-2026-000005')
  expect(token).toHaveClass('whitespace-nowrap')
})
