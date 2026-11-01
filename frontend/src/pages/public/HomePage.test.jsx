import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from './HomePage'
import { PublicSiteProvider } from '../../context/PublicSiteContext'
import { fallbackPublicContent } from '../../utils/publicSiteDefaults'

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

  expect(screen.getByRole('heading', { name: fallbackPublicContent.hero_title_ar, level: 1 })).toBeInTheDocument()
  expect(screen.getByText(fallbackPublicContent.hero_subtitle_ar)).toBeInTheDocument()
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

// DEF-P02 / CN-ACT-03: one category representation only, with no competing
// "main categories" rail + "services by category" rows.
test('homepage shows a single category-worlds section with a special-request path', async () => {
  renderHomePage()
  await waitFor(() => {
    expect(screen.getAllByTestId('category-world').length).toBeGreaterThan(0)
  })
  expect(screen.queryByText('خدمات حسب التصنيف')).not.toBeInTheDocument()
  expect(screen.queryByText('التصنيفات الرئيسية')).not.toBeInTheDocument()
  expect(screen.queryAllByText('عرض التصنيف')).toHaveLength(0)
  expect(document.querySelectorAll('#home-categories')).toHaveLength(1)
  // a category with no published services offers the special request instead of an empty rail
  expect(screen.getAllByTestId('world-empty').length).toBeGreaterThan(0)
  expect(document.getElementById('special-request')).toBeInTheDocument()
})
