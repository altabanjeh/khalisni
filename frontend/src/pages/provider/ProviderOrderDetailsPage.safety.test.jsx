import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProviderOrderDetailsPage from './ProviderOrderDetailsPage'
import { api } from '../../api/services'

// KHS-036: provider actions cannot be submitted twice from the UI.

afterEach(() => vi.restoreAllMocks())

async function renderPage() {
  vi.spyOn(api, 'getProviderOrder').mockResolvedValue({
    id: 7,
    order_number: 'KH-2026-000007',
    status: 'IN_PROGRESS',
    customer: { full_name: 'Customer' },
    service: { name_ar: 'خدمة' },
    documents: [],
    status_logs: [],
    allowed_actions: { available_status_transitions: ['WAITING_GOVERNMENT'], can_add_internal_note: true, can_upload_final_document: true },
  })
  const view = render(
    <MemoryRouter initialEntries={['/provider/orders/7']}>
      <Routes>
        <Route path="/provider/orders/:id" element={<ProviderOrderDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText(/KH-2026-000007/)).toBeInTheDocument())
  return { user: userEvent.setup(), ...view }
}

test('a rapid double click uploads the final result once', async () => {
  let resolve
  const uploadSpy = vi.spyOn(api, 'providerUploadFinal').mockReturnValue(new Promise((res) => { resolve = res }))
  const { user, container } = await renderPage()

  await user.upload(container.querySelector('input[type="file"]'), new File(['result'], 'final.pdf', { type: 'application/pdf' }))
  await user.dblClick(screen.getByRole('button', { name: 'رفع النتيجة' }))

  await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('button', { name: 'جارٍ الرفع...' })).toBeDisabled()
  resolve({ id: 11 })
  await waitFor(() => expect(uploadSpy).toHaveBeenCalledTimes(1))
})

test('an empty internal note is not sent', async () => {
  const noteSpy = vi.spyOn(api, 'providerAddNote').mockResolvedValue({ id: 1 })
  const { user } = await renderPage()

  await user.type(screen.getByLabelText('ملاحظة داخلية'), '   ')
  await user.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }))

  expect(await screen.findByText('الملاحظة مطلوبة')).toBeInTheDocument()
  expect(noteSpy).not.toHaveBeenCalled()
})
