import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TrackOrderPage from './TrackOrderPage'
import { api } from '../../api/services'

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

function renderTrackPage() {
  return render(
    <MemoryRouter>
      <TrackOrderPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('entering a valid order number and phone shows the order status', async () => {
  vi.spyOn(api, 'trackOrder').mockResolvedValueOnce({
    order_number: 'KH-2026-000042',
    status: 'COMPLETED',
    timeline: [
      { id: 1, old_status: '', new_status: 'NEW', created_at: '2026-05-01T08:00:00Z', note: '' },
      { id: 2, old_status: 'NEW', new_status: 'COMPLETED', created_at: '2026-05-05T10:00:00Z', note: '' },
    ],
    missing_documents: [],
    final_documents: [
      {
        id: 10,
        document_type: 'FINAL_RESULT',
        original_filename: 'result.pdf',
        is_final_document: true,
      },
    ],
  })

  renderTrackPage()

  const orderNumberInput = screen.getByRole('textbox', { name: /رقم الطلب|order number/i })
  const phoneInput = screen.getByRole('textbox', { name: /هاتف|phone/i })

  await userEvent.type(orderNumberInput, 'KH-2026-000042')
  await userEvent.type(phoneInput, '0791234567')
  await userEvent.click(screen.getByRole('button', { name: /عرض|show|بحث/i }))

  await waitFor(() => {
    expect(screen.getByText('KH-2026-000042')).toBeInTheDocument()
  })
})

test('required fields prevent submission when empty', async () => {
  renderTrackPage()

  await userEvent.click(screen.getByRole('button', { name: /عرض|show|بحث/i }))

  await waitFor(() => {
    expect(screen.getAllByText(/مطلوب|required/i).length).toBeGreaterThan(0)
  })
})

test('missing document tracking shows a localized name and a safe sign-in action', async () => {
  vi.spyOn(api, 'trackOrder').mockResolvedValueOnce({
    id: 42,
    order_number: 'KH-2026-000042',
    status: 'WAITING_CUSTOMER',
    timeline: [],
    missing_documents: ['legal_authorization'],
    missing_document_details: [{ document_type: 'legal_authorization', name_ar: 'خطاب التفويض', name_en: 'Authorization letter' }],
    final_documents: [],
  })
  renderTrackPage()
  await userEvent.type(screen.getByRole('textbox', { name: /رقم الطلب|order number/i }), 'KH-2026-000042')
  await userEvent.type(screen.getByRole('textbox', { name: /هاتف|phone/i }), '0791234567')
  await userEvent.click(screen.getByRole('button', { name: /عرض|show|بحث/i }))
  expect(await screen.findByText('خطاب التفويض')).toBeInTheDocument()
  expect(screen.queryByText('legal_authorization')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /سجل الدخول لرفع المستندات/ })).toHaveAttribute('href', '/login?next=%2Fcustomer%2Forders%2F42%2Fmissing-docs')
})
