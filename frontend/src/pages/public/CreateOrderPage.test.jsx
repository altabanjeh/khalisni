import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import CreateOrderPage from './CreateOrderPage'
import { AuthProvider } from '../../context/AuthContext'
import { api } from '../../api/services'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location-probe">{`${location.pathname}${location.search}`}</div>
}

function renderCreateOrderPage(initialEntry = '/create-order') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="*" element={<><LocationProbe /><CreateOrderPage /></>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
}

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

test('unauthenticated visitor is redirected to register with the customer order path', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce(null)

  renderCreateOrderPage('/create-order?service=12')

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/register?next=%2Fcustomer%2Forders%2Fnew%3Fservice%3D12')
  })
})

test('authenticated customer is redirected to the customer order flow', async () => {
  vi.spyOn(api, 'me').mockResolvedValueOnce({
    id: 5,
    full_name: 'Customer User',
    role: 'customer',
    email: 'customer@example.com',
    phone: '0799999999',
  })

  renderCreateOrderPage('/create-order?service=7')

  await waitFor(() => {
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/customer/orders/new?service=7')
  })
})
