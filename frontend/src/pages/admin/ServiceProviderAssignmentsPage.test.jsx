import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ServiceProviderAssignmentsPage from './ServiceProviderAssignmentsPage'
import { api } from '../../api/services'

test('service provider assignments page can link a provider to a service', async () => {
  vi.spyOn(api, 'getAdminServiceAssignments').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServices').mockResolvedValue([{ id: 3, name_ar: 'خدمة ضريبية' }])
  vi.spyOn(api, 'getProviders').mockResolvedValue([{ id: 8, full_name: 'Provider Two' }])
  const createAssignmentSpy = vi.spyOn(api, 'createAdminServiceAssignment').mockResolvedValue({ id: 12 })

  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/admin/provider-services?provider=8']}>
      <Routes>
        <Route path="/admin/provider-services" element={<ServiceProviderAssignmentsPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('خدمات Provider Two')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: /\+ ربط جديد/ }))

  const selects = screen.getAllByRole('combobox')
  await user.selectOptions(selects[0], '8')
  await user.selectOptions(selects[1], '3')
  await user.click(screen.getByRole('button', { name: 'ربط الخدمة' }))

  await waitFor(() => {
    expect(createAssignmentSpy).toHaveBeenCalledWith({
      service_id: 3,
      provider_id: 8,
      is_active: true,
    })
  })
})
