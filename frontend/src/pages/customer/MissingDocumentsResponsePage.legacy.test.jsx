import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import MissingDocumentsResponsePage from './MissingDocumentsResponsePage'
import { api } from '../../api/services'

// Shape of the original KH-2026-000001 record (audit F02): waiting for the
// customer, but no requested document type and no valid request.
const legacyOrder = {
  id: 1,
  order_number: 'KH-2026-000001',
  status: 'WAITING_CUSTOMER',
  missing_document_types: [],
  required_documents: [{ id: 1, document_type: 'national-id', name_ar: 'هوية شخصية', allowed_extensions: ['.pdf'] }],
  documents: [],
  notes: [{ id: 6, visibility: 'CUSTOMER', note: 'يرجى رفع صورة أوضح للهوية الشخصية' }],
  allowed_actions: { can_view_missing_documents_form: true, missing_document_request_valid: false },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/customer/orders/1/missing-docs']}>
      <Routes>
        <Route path="/customer/orders/:id/missing-docs" element={<MissingDocumentsResponsePage />} />
        <Route path="/customer/orders/:id" element={<div>Order Details</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.restoreAllMocks())

test('legacy request with nothing to upload renders a safe blocked state', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue(legacyOrder)
  const upload = vi.spyOn(api, 'uploadCustomerDocument').mockResolvedValue({})
  const { container } = renderPage()

  expect(await screen.findByTestId('missing-documents-unavailable')).toBeInTheDocument()
  expect(screen.getByText(/لا توجد حالياً مستندات قابلة للرفع لهذا الطلب/)).toBeInTheDocument()
  expect(screen.getByText('يرجى رفع صورة أوضح للهوية الشخصية')).toBeInTheDocument()
  // No 0/0 progress, no file field and no resubmit control at all.
  expect(screen.queryByText('0 / 0')).not.toBeInTheDocument()
  expect(container.querySelector('input[type="file"]')).toBeNull()
  expect(screen.queryByRole('button', { name: 'رفع المستندات وإعادة الإرسال' })).not.toBeInTheDocument()
  expect(screen.queryByText('تم رفع المستندات وإعادة إرسال الطلب للمراجعة.')).not.toBeInTheDocument()
  expect(upload).not.toHaveBeenCalled()
})

test('an empty requested list is treated the same even without the server flag', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue({
    ...legacyOrder,
    allowed_actions: { can_view_missing_documents_form: true },
  })
  const upload = vi.spyOn(api, 'uploadCustomerDocument').mockResolvedValue({})
  renderPage()
  expect(await screen.findByTestId('missing-documents-unavailable')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'رفع المستندات وإعادة الإرسال' })).not.toBeInTheDocument()
  expect(upload).not.toHaveBeenCalled()
})

test('a valid request still shows its upload field and resubmit action', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue({
    ...legacyOrder,
    missing_document_types: ['national-id'],
    allowed_actions: { can_view_missing_documents_form: true, missing_document_request_valid: true },
  })
  const { container } = renderPage()
  expect(await screen.findByRole('button', { name: 'رفع المستندات وإعادة الإرسال' })).toBeEnabled()
  expect(container.querySelector('input[type="file"]')).not.toBeNull()
  expect(screen.getByText('0 / 1')).toBeInTheDocument()
})
