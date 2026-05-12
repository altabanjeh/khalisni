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
    expect(screen.getByText('Rule Management')).toBeInTheDocument()
  })

  expect(screen.getByText('Services and pricing')).toBeInTheDocument()
  expect(screen.getByText('Required documents')).toBeInTheDocument()
  expect(screen.getByText('System settings')).toBeInTheDocument()
  expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
})
