import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MissingDocumentsResponsePage from './MissingDocumentsResponsePage'
import { api } from '../../api/services'

test('missing documents flow uploads required document types from order details', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue({
    id: 1,
    order_number: 'KH-2026-000123',
    status: 'WAITING_CUSTOMER',
    service: { slug: 'service-with-required-docs' },
    missing_document_types: ['national_id'],
    notes: [{ id: 1, visibility: 'CUSTOMER', note: 'يرجى رفع الهوية.' }],
    allowed_actions: {
      can_view_missing_documents_form: true,
    },
  })
  vi.spyOn(api, 'getService').mockResolvedValue({
    slug: 'service-with-required-docs',
    required_documents: [{ id: 1, document_type: 'national_id', name_ar: 'الهوية الشخصية', allowed_extensions: ['.pdf'] }],
  })
  const uploadSpy = vi.spyOn(api, 'uploadCustomerDocument').mockResolvedValue({})

  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter initialEntries={['/customer/orders/1/missing-docs']}>
      <Routes>
        <Route path="/customer/orders/:id/missing-docs" element={<MissingDocumentsResponsePage />} />
        <Route path="/customer/orders/:id" element={<div>Order Details</div>} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('يرجى رفع الهوية.')).toBeInTheDocument()
  })

  const fileInput = container.querySelector('input[type="file"]')
  const file = new File(['test'], 'national-id.pdf', { type: 'application/pdf' })
  await user.upload(fileInput, file)
  await user.click(screen.getByRole('button', { name: 'رفع المستندات وإعادة الإرسال' }))

  await waitFor(() => {
    expect(uploadSpy).toHaveBeenCalledTimes(1)
  })
  expect(uploadSpy.mock.calls[0][0]).toBe('1')
})
