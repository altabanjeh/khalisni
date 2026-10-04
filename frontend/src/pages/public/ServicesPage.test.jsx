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

test('search results appear without the category discovery cards', async () => {
  render(
    <MemoryRouter initialEntries={['/services?search=جواز']}>
      <ServicesPage />
    </MemoryRouter>,
  )
  await waitFor(() => expect(screen.getAllByText(/جواز/).length).toBeGreaterThan(0))
  expect(screen.queryByRole('heading', { name: 'اختر التصنيف المناسب' })).not.toBeInTheDocument()
})
