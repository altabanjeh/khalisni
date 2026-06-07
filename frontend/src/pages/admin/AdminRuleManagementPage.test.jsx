import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import AdminRuleManagementPage from './AdminRuleManagementPage'

test('admin rule management page renders safe management sections', async () => {
  render(
    <MemoryRouter>
      <AdminRuleManagementPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('إدارة القواعد')).toBeInTheDocument()
  })

  expect(screen.getByText('الخدمات والأسعار')).toBeInTheDocument()
  expect(screen.getByText('المستندات المطلوبة')).toBeInTheDocument()
  expect(screen.getByText('إعدادات النظام')).toBeInTheDocument()
  expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
})
