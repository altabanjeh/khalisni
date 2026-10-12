import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EmployeeOrderReviewPage from './EmployeeOrderReviewPage'
import { api } from '../../api/services'

// KHS-036: staff actions cannot be submitted twice from the UI, irreversible
// actions ask first, and a rejection carries the reason the reviewer writes.

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['orders.assign_order'] } }),
}))

function order(overrides = {}) {
  return {
    id: 21,
    order_number: 'KH-2026-000021',
    status: 'READY_FOR_DELIVERY',
    city: 'Amman',
    customer: { full_name: 'Customer' },
    service: { name_ar: 'خدمة', slug: 'svc' },
    documents: [{ id: 5, document_type: 'FINAL_RESULT', original_filename: 'final.pdf', is_final_document: true, status: 'approved' }],
    status_logs: [],
    notes: [],
    required_documents: [],
    allowed_actions: {
      available_status_transitions: [],
      can_add_internal_note: true,
      can_reject: true,
      can_complete: true,
    },
    ...overrides,
  }
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

async function renderPage() {
  vi.spyOn(api, 'getEmployeeOrder').mockResolvedValue(order())
  vi.spyOn(api, 'getProviders').mockResolvedValue([])
  vi.spyOn(api, 'getEmployeeNotificationTemplates').mockResolvedValue([])
  render(
    <MemoryRouter initialEntries={['/employee/orders/21']}>
      <Routes>
        <Route path="/employee/orders/:id" element={<EmployeeOrderReviewPage />} />
      </Routes>
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getByText('KH-2026-000021')).toBeInTheDocument())
  return userEvent.setup()
}

afterEach(() => vi.restoreAllMocks())

test('rejection needs a written reason and sends exactly that reason', async () => {
  const rejectSpy = vi.spyOn(api, 'rejectOrder').mockResolvedValue({ status: 'REJECTED' })
  const user = await renderPage()

  await user.click(screen.getByRole('button', { name: /رفض الطلب/ }))
  const confirm = screen.getByRole('button', { name: 'نعم، ارفض الطلب' })
  expect(confirm).toBeDisabled()

  await user.type(screen.getByLabelText(/سبب الرفض/), '   ')
  expect(confirm).toBeDisabled()
  expect(rejectSpy).not.toHaveBeenCalled()

  await user.type(screen.getByLabelText(/سبب الرفض/), 'الوثيقة منتهية الصلاحية')
  await user.click(confirm)

  await waitFor(() => expect(rejectSpy).toHaveBeenCalledTimes(1))
  expect(rejectSpy.mock.calls[0][1].reason).toBe('الوثيقة منتهية الصلاحية')
})

test('a rapid double click saves an internal note once and disables the control meanwhile', async () => {
  const pending = deferred()
  const noteSpy = vi.spyOn(api, 'addEmployeeNote').mockReturnValue(pending.promise)
  const user = await renderPage()

  await user.type(screen.getByLabelText('نص الملاحظة'), 'ملاحظة واحدة')
  await user.dblClick(screen.getByRole('button', { name: 'حفظ الملاحظة' }))

  await waitFor(() => expect(noteSpy).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('button', { name: 'جارٍ الحفظ...' })).toBeDisabled()
  pending.resolve({ id: 1 })
  await waitFor(() => expect(noteSpy).toHaveBeenCalledTimes(1))
})

test('a refused note keeps what the reviewer typed', async () => {
  const error = Object.assign(new Error('bad'), { response: { status: 400, data: { note: ['Too long.'] } } })
  vi.spyOn(api, 'addEmployeeNote').mockRejectedValue(error)
  const user = await renderPage()

  await user.type(screen.getByLabelText('نص الملاحظة'), 'نص يجب أن يبقى')
  await user.click(screen.getByRole('button', { name: 'حفظ الملاحظة' }))

  await waitFor(() => expect(screen.getByRole('button', { name: 'حفظ الملاحظة' })).toBeEnabled())
  expect(screen.getByLabelText('نص الملاحظة')).toHaveValue('نص يجب أن يبقى')
})

test('completing a request asks for confirmation first and submits once', async () => {
  const pending = deferred()
  const completeSpy = vi.spyOn(api, 'completeEmployeeOrder').mockReturnValue(pending.promise)
  const user = await renderPage()

  await user.click(screen.getByRole('button', { name: 'اعتماد النتيجة وإكمال الطلب' }))
  expect(completeSpy).not.toHaveBeenCalled()

  await user.dblClick(screen.getByRole('button', { name: 'نعم، أكمل الطلب' }))
  await waitFor(() => expect(completeSpy).toHaveBeenCalledTimes(1))
  pending.resolve({ status: 'COMPLETED' })
})
