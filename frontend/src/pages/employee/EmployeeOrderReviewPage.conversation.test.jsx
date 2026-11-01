// Items 13–15 on the employee review page: a staff reply is a customer-visible
// note (sent to the customer as a message), plus reassignment and complaints.
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import EmployeeOrderReviewPage from './EmployeeOrderReviewPage'
import { LanguageProvider } from '../../context/LanguageContext'
import { api } from '../../api/services'

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['orders.assign_order'] } }),
}))

function order(allowed = {}) {
  return {
    id: 9,
    order_number: 'KH-2026-000009',
    status: 'IN_PROGRESS',
    city: 'Amman',
    customer: { full_name: 'Customer' },
    service: { name_ar: 'خدمة', slug: 'service-slug' },
    assigned_provider: { id: 21, full_name: 'Provider Now' },
    documents: [],
    status_logs: [],
    notes: [],
    allowed_actions: {
      available_status_transitions: [],
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
      <MemoryRouter initialEntries={['/employee/orders/9']}>
        <Routes><Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} /></Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(api, 'getProviders').mockResolvedValue([{ id: 21, full_name: 'Provider Now', city: 'Amman' }, { id: 22, full_name: 'Provider Other', city: 'Zarqa' }])
  vi.spyOn(api, 'getEmployeeNotificationTemplates').mockResolvedValue([])
  vi.spyOn(api, 'getStaffOrderComplaints').mockResolvedValue([])
})

test('a customer-visible note is sent with CUSTOMER visibility and labelled as a message', async () => {
  const getOrder = vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue(order())
  const noteSpy = vi.spyOn(api, 'addEmployeeNote').mockResolvedValue({ id: 1 })
  renderPage()
  const select = await screen.findByLabelText('مستوى الظهور')
  expect(within(select).getByRole('option', { name: 'مرئية للعميل — تُرسل كرسالة للعميل' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('نص الملاحظة'), { target: { value: 'تم استلام مستنداتك' } })
  fireEvent.change(select, { target: { value: 'CUSTOMER' } })
  fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }))
  await vi.waitFor(() => expect(noteSpy).toHaveBeenCalledWith('9', { note: 'تم استلام مستنداتك', visibility: 'CUSTOMER' }))
  await vi.waitFor(() => expect(getOrder).toHaveBeenCalledTimes(2))
})

test('without the customer-note permission the form stays internal-only', async () => {
  vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue(order({ can_add_customer_note: false }))
  const noteSpy = vi.spyOn(api, 'addEmployeeNote').mockResolvedValue({ id: 1 })
  renderPage()
  fireEvent.change(await screen.findByLabelText('نص الملاحظة'), { target: { value: 'داخلي' } })
  expect(screen.queryByLabelText('مستوى الظهور')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }))
  await vi.waitFor(() => expect(noteSpy).toHaveBeenCalledWith('9', { note: 'داخلي', visibility: 'INTERNAL' }))
})

test('reassignment and complaints panels appear on the review page', async () => {
  vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue(order())
  renderPage()
  const panel = await screen.findByTestId('reassign-provider')
  const select = within(panel).getByLabelText('المزوّد الجديد')
  await vi.waitFor(() => expect(select.querySelectorAll('option')).toHaveLength(2))
  expect(within(select).queryByRole('option', { name: /Provider Now/ })).not.toBeInTheDocument()
  expect(screen.getByTestId('staff-complaints')).toBeInTheDocument()
})
