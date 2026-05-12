import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import MyOrdersPage from './MyOrdersPage'

test('dashboard tables load', async () => {
  render(
    <MemoryRouter>
      <MyOrdersPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('KH-2026-000001')).toBeInTheDocument()
  })
})
