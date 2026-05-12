import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProviderOrderDetailsPage from './ProviderOrderDetailsPage'
import { api } from '../../api/services'

test('provider upload flow defaults final document type and hides invalid ready status action', async () => {
  vi.spyOn(api, 'getProviderOrder').mockResolvedValue({
    id: 7,
    order_number: 'KH-2026-000007',
    status: 'WAITING_GOVERNMENT',
    expected_delivery_date: '2026-05-06',
    customer: { full_name: 'Customer' },
    service: { name_ar: 'خدمة' },
    documents: [],
    status_logs: [],
    allowed_actions: {
      available_status_transitions: ['IN_PROGRESS'],
      can_add_internal_note: true,
      can_upload_final_document: true,
    },
  })
  vi.spyOn(api, 'providerChangeStatus').mockResolvedValue({ status: 'IN_PROGRESS' })
  vi.spyOn(api, 'providerAddNote').mockResolvedValue({ id: 1 })
  const uploadSpy = vi.spyOn(api, 'providerUploadFinal').mockResolvedValue({ id: 11 })

  const user = userEvent.setup()
  const { container } = render(
    <MemoryRouter initialEntries={['/provider/orders/7']}>
      <Routes>
        <Route path="/provider/orders/:id" element={<ProviderOrderDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('KH-2026-000007')).toBeInTheDocument()
  })

  expect(screen.queryByRole('option', { name: 'تم رفع النتيجة' })).not.toBeInTheDocument()

  const fileInput = container.querySelector('input[type="file"]')
  const file = new File(['result'], 'final.pdf', { type: 'application/pdf' })
  await user.upload(fileInput, file)
  await user.click(screen.getByRole('button', { name: 'رفع النتيجة' }))

  await waitFor(() => {
    expect(uploadSpy).toHaveBeenCalledTimes(1)
  })
  expect(uploadSpy.mock.calls[0][0]).toBe('7')
  expect(uploadSpy.mock.calls[0][1].get('document_type')).toBe('FINAL_RESULT')
})
