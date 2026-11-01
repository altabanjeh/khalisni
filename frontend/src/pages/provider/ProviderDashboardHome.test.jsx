// CN-MAP-04: the provider dashboard shows the provider's own rating and
// completed-order count (earnings are out of the MVP).
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ProviderDashboardHome from './ProviderDashboardHome'
import { api } from '../../api/services'
import { LanguageProvider } from '../../context/LanguageContext'

afterEach(() => vi.restoreAllMocks())

function renderDashboard(language = 'ar') {
  localStorage.setItem('khalisni-language', language)
  vi.spyOn(api, 'getProviderOrders').mockResolvedValue([])
  render(<MemoryRouter><LanguageProvider><ProviderDashboardHome /></LanguageProvider></MemoryRouter>)
}

test('shows the provider rating and completed requests from the profile', async () => {
  vi.spyOn(api, 'getProviderDashboard').mockResolvedValue({
    assigned_orders: 2, in_progress: 1, completed: 9, delayed: 0,
    provider: { id: 3, rating: '4.60', total_completed_orders: 44 },
  })
  renderDashboard('ar')
  expect(await screen.findByTestId('provider-rating')).toHaveTextContent('4.6')
  expect(screen.getByTestId('provider-rating')).toHaveTextContent('/ 5')
  expect(screen.getByTestId('provider-completed')).toHaveTextContent('44')
  expect(screen.getByText('تقييمك')).toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/أرباح|Earnings/)
})

test('a provider without ratings sees a calm empty value, and an org member sees not available', async () => {
  vi.spyOn(api, 'getProviderDashboard').mockResolvedValue({ assigned_orders: 0, completed: 3, provider: { id: 3, rating: 0, total_completed_orders: 0 } })
  renderDashboard('en')
  expect(await screen.findByTestId('provider-rating')).toHaveTextContent('No ratings yet')
  expect(screen.getByTestId('provider-completed')).toHaveTextContent('0')
})

test('an organization member without a personal profile sees not available', async () => {
  vi.spyOn(api, 'getProviderDashboard').mockResolvedValue({ assigned_orders: 0, completed: 3, provider: null })
  renderDashboard('en')
  expect(await screen.findByTestId('provider-rating')).toHaveTextContent('Not available for your account')
  expect(screen.getByTestId('provider-completed')).toHaveTextContent('3')
})
