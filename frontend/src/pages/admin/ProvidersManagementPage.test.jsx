import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProvidersManagementPage from './ProvidersManagementPage'
import { api } from '../../api/services'

const fullNamePlaceholder = '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644'
const emailPlaceholder = '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a'
const phonePlaceholder = '\u0627\u0644\u0647\u0627\u062a\u0641'
const passwordPlaceholder = '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631'
const providerTypePlaceholder = '\u0646\u0648\u0639 \u0627\u0644\u0645\u0632\u0648\u062f'
const cityPlaceholder = '\u0627\u0644\u0645\u062f\u064a\u0646\u0629'
const addProviderLabel = '\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0632\u0648\u062f'

test('providers management page can create a provider from the admin flow', async () => {
  vi.spyOn(api, 'getProviders').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServiceAssignments').mockResolvedValue([])
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
      city: 'Amman',
      is_available: true,
      is_approved: false,
      account_active: true,
    })
  })
})
