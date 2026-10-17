import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from './ProtectedRoute'

// DEF-U07: a signed-in user on another role's route lands on their own portal.

const authState = { user: null, loading: false, authError: null, retryAuth: () => {} }

vi.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}))

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>public home</div>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="/admin" element={<div>admin portal</div>} />
        </Route>
        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="/customer" element={<div>customer portal</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

test('a signed-in customer opening an admin route goes to the customer portal', () => {
  authState.user = { role: 'customer' }
  renderAt('/admin')
  expect(screen.getByText('customer portal')).toBeInTheDocument()
  expect(screen.queryByText('public home')).not.toBeInTheDocument()
})

test('an unauthenticated visitor still goes to login', () => {
  authState.user = null
  renderAt('/admin')
  expect(screen.getByText('login page')).toBeInTheDocument()
})
