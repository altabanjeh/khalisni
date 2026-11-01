// Items 13–15 on the admin order page: provider reassignment, complaints panel,
// and the customer-visible note labelled as a message to the customer.
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import AdminOrderDetailsPage from './AdminOrderDetailsPage'
import { LanguageProvider } from '../../context/LanguageContext'
import { api } from '../../api/services'

function assignedOrder(allowed = {}) {
  return {
    id: 5,
    order_number: 'KH-2026-000005',
    status: 'ASSIGNED',
    customer: { full_name: 'QA Customer A' },
    service: { name_ar: 'خدمة', name_en: 'Service' },
    assigned_provider: { id: 11, full_name: 'Provider Current' },
    documents: [],
    status_logs: [],
    required_documents: [],
    allowed_actions: {
      available_status_transitions: [],
      workflow_transitions: [],
      can_add_internal_note: true,
      can_add_customer_note: true,
      can_reassign_provider: true,
      ...allowed,
    },
  }
}

function renderPage() {
  window.localStorage.setItem('khalisni-language', 'ar')
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/admin/orders/5']}>
        <Routes><Route path="/admin/orders/:id" element={<AdminOrderDetailsPage />} /></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getProviders').mockResolvedValue([
    { id: 11, full_name: 'Provider Current' },
    { id: 12, full_name: 'Provider Next' },
  ])
  vi.spyOn(api, 'getStaffOrderComplaints').mockResolvedValue([])
})

test('reassignment uses the eligible-provider list without the current provider and refreshes the order', async () => {
  const getOrder = vi.spyOn(api, 'getAdminOrder').mockResolvedValue(assignedOrder())
  const reassign = vi.spyOn(api, 'reassignOrderProvider').mockResolvedValue({ assigned_provider: 12, status: 'ASSIGNED' })
  renderPage()
  const panel = await screen.findByTestId('reassign-provider')
  const select = within(panel).getByLabelText('المزوّد الجديد')
  await vi.waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(2))
  expect([...select.querySelectorAll('option')].map((option) => option.textContent)).not.toContain('Provider Current')
  fireEvent.change(select, { target: { value: '12' } })
  fireEvent.change(within(panel).getByLabelText('سبب التغيير (مطلوب)'), { target: { value: 'تأخر المزوّد' } })
  fireEvent.click(within(panel).getByRole('button', { name: 'تغيير المزوّد' }))
  fireEvent.click(screen.getByRole('button', { name: 'نعم، غيّر المزوّد' }))
  await vi.waitFor(() => expect(reassign).toHaveBeenCalledWith(5, { provider_id: 12, reason: 'تأخر المزوّد' }))
  await vi.waitFor(() => expect(getOrder).toHaveBeenCalledTimes(2))
})

test('no reassignment control when the server does not allow it', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(assignedOrder({ can_reassign_provider: false }))
  renderPage()
  await screen.findByTestId('staff-complaints')
  expect(screen.queryByTestId('reassign-provider')).not.toBeInTheDocument()
})

test('the customer-visible note option says it is sent to the customer as a message', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(assignedOrder())
  renderPage()
  const select = await screen.findByLabelText('مستوى الظهور')
  expect(within(select).getByRole('option', { name: 'مرئية للعميل — تُرسل كرسالة للعميل' })).toHaveValue('CUSTOMER')
})

test('the complaints panel lists the customer complaints', async () => {
  vi.spyOn(api, 'getAdminOrder').mockResolvedValue(assignedOrder())
  api.getStaffOrderComplaints.mockResolvedValue([{ id: 3, description: 'تأخر التسليم', is_resolved: false, created_at: '2026-05-01T10:00:00Z' }])
  renderPage()
  const panel = await screen.findByTestId('staff-complaints')
  expect(await within(panel).findByText('تأخر التسليم')).toBeInTheDocument()
  expect(within(panel).getByText('قيد المتابعة')).toBeInTheDocument()
  expect(api.getStaffOrderComplaints).toHaveBeenCalledWith('5')
})
