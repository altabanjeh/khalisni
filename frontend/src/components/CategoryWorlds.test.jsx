// DEF-P02 / CN-ACT-03 / CN-ACT-04: the homepage shows ONE category
// representation — the client's category "worlds", each with a cover and a
// slider of its own services; empty worlds and «طلب خاص» lead to the special
// request form instead of an empty rail.
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import CategoryWorlds from './CategoryWorlds'
import { buildCategoryWorlds } from '../utils/categoryWorlds'
import { LanguageProvider } from '../context/LanguageContext'

const categories = [
  { id: 10, slug: 'special-request', name_ar: 'طلب خاص', name_en: 'Special request', service_count: 0 },
  { id: 1, slug: 'real-estate', name_ar: 'العقارات والأراضي', name_en: 'Real estate and land', service_count: 2 },
  { id: 2, slug: 'business', name_ar: 'خدمات الأعمال', name_en: 'Business services', service_count: 1 },
  { id: 3, slug: 'international', name_ar: 'الخدمات الدولية', name_en: 'International services', service_count: 0 },
  { id: 11, slug: 'land-survey', parent: 1, name_ar: 'المساحة', name_en: 'Survey' },
  { id: 12, slug: 'hidden', name_ar: 'مخفي', name_en: 'Hidden', show_on_public_site: false },
]
const services = [
  { id: 101, slug: 'deed', name_ar: 'سند تسجيل', name_en: 'Title deed', category: { id: 1, slug: 'real-estate' } },
  { id: 102, slug: 'survey', name_ar: 'مخطط أراضي', name_en: 'Land plan', category: { id: 11, slug: 'land-survey' } },
  { id: 103, slug: 'company', name_ar: 'تسجيل شركة', name_en: 'Company registration', category: { id: 2, slug: 'business' } },
  { id: 104, slug: 'gone', name_ar: 'محذوفة', name_en: 'Gone', is_deleted: true, category: { id: 2, slug: 'business' } },
]

function renderWorlds(language = 'ar', onSpecialRequest = vi.fn()) {
  localStorage.setItem('khalisni-language', language)
  const worlds = buildCategoryWorlds(categories, services)
  render(
    <MemoryRouter>
      <LanguageProvider>
        <CategoryWorlds emptyText="-" onSpecialRequest={onSpecialRequest} title="أقسام الخدمات" worlds={worlds} />
      </LanguageProvider>
    </MemoryRouter>,
  )
  return { onSpecialRequest, worlds }
}

test('builds one world per top-level public category, folding sub-category services in, special request last', () => {
  const worlds = buildCategoryWorlds(categories, services)
  expect(worlds.map((world) => world.category.slug)).toEqual(['real-estate', 'business', 'international', 'special-request'])
  expect(worlds[0].services.map((service) => service.slug)).toEqual(['deed', 'survey'])
  expect(worlds[1].services.map((service) => service.slug)).toEqual(['company'])
  expect(worlds[2].services).toEqual([])
  expect(worlds[3].isSpecialRequest).toBe(true)
})

test('each world renders its services as a slider; empty and special worlds offer the special request', () => {
  const { onSpecialRequest } = renderWorlds('ar')
  const worldCards = screen.getAllByTestId('category-world')
  expect(worldCards).toHaveLength(4)

  const realEstate = worldCards[0]
  expect(within(realEstate).getByRole('heading', { name: 'العقارات والأراضي' })).toBeInTheDocument()
  expect(within(realEstate).getAllByTestId('world-service')).toHaveLength(2)
  const slider = within(realEstate).getByRole('list', { name: 'خدمات العقارات والأراضي' })
  expect(slider.className).toMatch(/overflow-x-auto/)
  expect(within(realEstate).getByRole('link', { name: /سند تسجيل/ })).toHaveAttribute('href', '/services/deed')

  // slides grow to fill the row: no empty card area when a world has 1–2 services
  for (const slide of within(realEstate).getAllByTestId('world-service')) {
    expect(slide.className).toMatch(/(^|\s)grow(\s|$)/)
    expect(slide.className).toMatch(/basis-\[13rem\]/)
  }

  const international = worldCards[2]
  expect(within(international).queryByRole('list')).not.toBeInTheDocument()
  expect(within(international).getByTestId('world-empty')).toHaveTextContent('نضيف خدمات هذا القسم قريباً')
  fireEvent.click(within(international).getByRole('link', { name: /طلب خاص/ }))
  expect(onSpecialRequest).toHaveBeenCalledWith('الخدمات الدولية')

  const special = worldCards[3]
  expect(special).toHaveAttribute('data-category-slug', 'special-request')
  const cta = within(special).getByRole('link', { name: /أرسل طلباً خاصاً/ })
  expect(cta).toHaveAttribute('href', '#special-request')
  fireEvent.click(cta)
  expect(onSpecialRequest).toHaveBeenLastCalledWith('')
  // the hidden category is not shown
  expect(screen.queryByText('مخفي')).not.toBeInTheDocument()
})

test('worlds render English names in English mode and the odd last world spans the row', () => {
  renderWorlds('en')
  expect(screen.getByRole('heading', { name: 'Real estate and land' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Title deed/ })).toBeInTheDocument()
  const worldCards = screen.getAllByTestId('category-world')
  // 4 worlds: even, so nothing spans
  expect(worldCards.some((card) => card.className.includes('lg:col-span-2'))).toBe(false)
})
