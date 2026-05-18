import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProvidersManagementPage from './ProvidersManagementPage'
import { api } from '../../api/services'

const fullNamePlaceholder = 'الاسم الكامل'
const emailPlaceholder = 'البريد الإلكتروني'
const phonePlaceholder = 'الهاتف'
const passwordPlaceholder = 'كلمة المرور'
const providerTypePlaceholder = 'نوع المزود'
const cityPlaceholder = 'المدينة'
const openCreateLabel = '+ مزود جديد'
const addProviderLabel = 'إضافة المزود'

test('providers management page can create a provider from the admin flow', async () => {
  vi.spyOn(api, 'getProviders').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServiceAssignments').mockResolvedValue([])
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([])
  const createProviderSpy = vi.spyOn(api, 'createProvider').mockResolvedValue({ id: 5 })

  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <ProvidersManagementPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('المزودون')).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: openCreateLabel }))
  await user.type(screen.getByPlaceholderText(fullNamePlaceholder), 'Provider Two')
  await user.type(screen.getByPlaceholderText(emailPlaceholder), 'provider2@khalisni.local')
  await user.type(screen.getByPlaceholderText(phonePlaceholder), '0790000007')
  await user.type(screen.getByPlaceholderText(passwordPlaceholder), 'Provider123')
  await user.type(screen.getByPlaceholderText(providerTypePlaceholder), 'Government Services')
  await user.type(screen.getByPlaceholderText(cityPlaceholder), 'Amman')
  await user.click(screen.getByRole('button', { name: addProviderLabel }))

  await waitFor(() => {
    expect(createProviderSpy).toHaveBeenCalledWith({
      full_name: 'Provider Two',
      email: 'provider2@khalisni.local',
      phone: '0790000007',
      password: 'Provider123',
      provider_type: 'Government Services',
      company_name: '',
      commercial_registration_number: '',
      tax_number: '',
      city: 'Amman',
      address: '',
      service_category_ids: [],
      is_available: true,
      is_approved: false,
      account_active: true,
    })
  })
})
