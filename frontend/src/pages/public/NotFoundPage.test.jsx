import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import NotFoundPage from './NotFoundPage'

// Regression for defect U14: unknown routes must render a real 404 page with a
// way back, instead of silently redirecting to the homepage.
test('not found page shows a 404 message and recovery links', () => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  )

  expect(screen.getByText(/404/i)).toBeInTheDocument()
  expect(screen.getByText(/الصفحة غير موجودة|could not be found/i)).toBeInTheDocument()

  const homeLink = screen.getByRole('link', { name: /الصفحة الرئيسية|homepage/i })
  expect(homeLink).toHaveAttribute('href', '/')

  const servicesLink = screen.getByRole('link', { name: /تصفح الخدمات|browse services/i })
  expect(servicesLink).toHaveAttribute('href', '/services')
})
