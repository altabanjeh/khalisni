import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from './HomePage'
import { PublicSiteProvider } from '../../context/PublicSiteContext'

function renderHomePage() {
  return render(
    <MemoryRouter>
      <PublicSiteProvider>
        <HomePage />
      </PublicSiteProvider>
    </MemoryRouter>,
  )
}

test('homepage renders approved hero, real search, categories, and services', async () => {
  renderHomePage()

  expect(screen.getByText('ركّز على اللي بهمّك...')).toBeInTheDocument()
  expect(screen.getByText('وإحنا بنخلّص الباقي.')).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'البحث في خدمات خلصني' })).toHaveAttribute('placeholder', 'ابحث عن خدمة أو تصنيف...')

  await waitFor(() => {
    expect(screen.getByText('أحدث الخدمات')).toBeInTheDocument()
  })

  expect(screen.getAllByText('شهادة عدم محكومية').length).toBeGreaterThan(0)
  expect(screen.getAllByText('الجوازات والأحوال المدنية').length).toBeGreaterThan(0)
})

test('homepage search shows live service suggestions', async () => {
  const user = userEvent.setup()
  renderHomePage()

  const search = screen.getByRole('combobox', { name: 'البحث في خدمات خلصني' })
  await user.type(search, 'جواز')

  await waitFor(() => {
    expect(screen.getByRole('option', { name: /تجديد جواز سفر/ })).toBeInTheDocument()
  })
})
