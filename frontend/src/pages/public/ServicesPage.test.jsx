import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServicesPage from './ServicesPage'

test('service list renders with category cards', async () => {
  render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('شهادة عدم محكومية')).toBeInTheDocument()
  })

  expect(screen.getAllByText('الجوازات والأحوال المدنية').length).toBeGreaterThan(0)
})
