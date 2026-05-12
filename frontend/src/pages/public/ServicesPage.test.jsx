import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServicesPage from './ServicesPage'

test('service list renders', async () => {
  render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('شهادة عدم محكومية')).toBeInTheDocument()
  })
})
