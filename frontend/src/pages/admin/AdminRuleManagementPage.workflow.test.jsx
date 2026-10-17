import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminRuleManagementPage from './AdminRuleManagementPage'
import { api } from '../../api/services'

const rule = {
  from_status: 'WAITING_CUSTOMER', to_status: 'CANCELLED', from_status_label: 'Waiting customer', to_status_label: 'Cancelled',
  action: 'cancel_order', channel: 'dedicated', validation_checks: ['assigned_employee_or_unassigned', 'note_required'],
  allowed_roles: ['admin', 'employee', 'support'], allowed_role_labels: ['Admin', 'Employee', 'Support'],
  reason_required: true, notification_trigger: true, audit_required: true,
  summary: 'Waiting customer to Cancelled by Admin, Employee, Support', change_request_supported: false,
}

test('workflow rules tab shows Arabic descriptions instead of server codes and English summaries', async () => {
  vi.spyOn(api, 'getWorkflowRules').mockResolvedValue([rule])
  const user = userEvent.setup()
  render(<MemoryRouter><AdminRuleManagementPage /></MemoryRouter>)
  await user.click(await screen.findByText('قواعد سير العمل'))

  expect(await screen.findByText('بانتظار العميل ← ملغي')).toBeInTheDocument()
  expect(screen.getByText('إلغاء الطلب')).toBeInTheDocument()
  expect(screen.getByText('الموظف المسؤول عن الطلب أو طلب غير مسند، يتطلب ملاحظة للعميل')).toBeInTheDocument()
  expect(screen.getByText('المدير، الموظف، الدعم')).toBeInTheDocument()
  const body = document.body.textContent
  expect(body).not.toMatch(/Waiting customer to Cancelled|cancel_order|note_required|assigned_employee_or_unassigned/)
})
