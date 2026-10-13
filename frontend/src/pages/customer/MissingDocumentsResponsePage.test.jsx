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
    required_documents: [{ id: 1, document_type: 'national_id', name_ar: 'الهوية الشخصية', allowed_extensions: ['.pdf'] }],
    notes: [{ id: 1, visibility: 'CUSTOMER', note: 'يرجى رفع الهوية.' }],
    allowed_actions: {
      can_view_missing_documents_form: true,
    },
  })
  const publicServiceSpy = vi.spyOn(api, 'getService')
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
  expect(publicServiceSpy).not.toHaveBeenCalled()
})

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

test('a second submit works after the server rejects the file with a `file` error', async () => {
  vi.spyOn(api, 'getCustomerOrder').mockResolvedValue({
    id: 1,
    order_number: 'KH-2026-000124',
    status: 'WAITING_CUSTOMER',
    missing_document_types: ['national_id'],
    required_documents: [{ id: 1, document_type: 'national_id', name_ar: 'الهوية الشخصية', allowed_extensions: ['.pdf'] }],
    notes: [{ id: 1, visibility: 'CUSTOMER', note: 'يرجى رفع الهوية.' }],
    allowed_actions: { can_view_missing_documents_form: true },
  })
  // The API answers 400 {"file": [...]}: a key that is not an input on this form.
  const rejection = Object.assign(new Error('الملف مرفوض'), {
    displayMessage: 'الملف مرفوض',
    apiError: {
      status: 400,
      fieldErrors: { file: ['الملف مرفوض'], document_type: ['نوع غير صالح'] },
      rawData: { file: ['الملف مرفوض'], document_type: ['نوع غير صالح'] },
    },
  })
  const uploadSpy = vi.spyOn(api, 'uploadCustomerDocument')
    .mockRejectedValueOnce(rejection)
    .mockResolvedValueOnce({})

  const user = userEvent.setup()
  const { container } = renderPage()
  await screen.findByText('يرجى رفع الهوية.')

  await user.upload(container.querySelector('input[type="file"]'), new File(['test'], 'national-id.pdf', { type: 'application/pdf' }))
  await user.click(screen.getByRole('button', { name: 'رفع المستندات وإعادة الإرسال' }))

  await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1))
  // The rejection is shown on the document's own input, not lost.
  expect((await screen.findAllByText(/الملف مرفوض/)).length).toBeGreaterThan(0)

  await user.click(await screen.findByRole('button', { name: 'رفع المستندات وإعادة الإرسال' }))

  await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(2))
  expect(await screen.findByText('Order Details')).toBeInTheDocument()
})

test('a failed load offers a retry instead of saying the order was not found', async () => {
  const orderSpy = vi.spyOn(api, 'getCustomerOrder')
    .mockRejectedValueOnce(Object.assign(new Error('offline'), { displayMessage: 'تعذر الاتصال بالخادم.' }))
    .mockResolvedValueOnce({
      id: 1,
      order_number: 'KH-2026-000125',
      status: 'WAITING_CUSTOMER',
      missing_document_types: ['national_id'],
      required_documents: [],
      notes: [{ id: 1, visibility: 'CUSTOMER', note: 'يرجى رفع الهوية.' }],
      allowed_actions: { can_view_missing_documents_form: true },
    })

  const user = userEvent.setup()
  renderPage()

  expect(await screen.findByRole('alert')).toHaveTextContent('تعذر الاتصال بالخادم.')
  expect(screen.queryByText('الطلب غير متاح')).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }))

  expect(await screen.findByText('يرجى رفع الهوية.')).toBeInTheDocument()
  expect(orderSpy).toHaveBeenCalledTimes(2)
})
