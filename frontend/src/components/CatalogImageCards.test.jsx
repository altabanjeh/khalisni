import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryCard from './CategoryCard'
import ServiceCard from './ServiceCard'

test('category card prefers the uploaded image, then a curated illustration (never a broken image)', () => {
  const { rerender } = render(
    <MemoryRouter>
      <CategoryCard category={{ id: 1, name_ar: 'Category A', slug: 'category-a', image_url: '/media/category-a.jpg' }} count={2} />
    </MemoryRouter>,
  )

  expect(screen.getByRole('img', { name: 'Category A' })).toHaveAttribute('src', '/media/category-a.jpg')

  // No upload, unknown slug → the generic Khalsni category illustration, still a
  // real <img> with a meaningful alt (never a browser broken-image icon).
  rerender(
    <MemoryRouter>
      <CategoryCard category={{ id: 1, name_ar: 'Category A', slug: 'category-a' }} count={2} />
    </MemoryRouter>,
  )

  const fallback = screen.getByRole('img', { name: 'Category A' })
  expect(fallback.getAttribute('src')).toMatch(/\/images\/khalsni\/(categories|fallback)\//)
})

test('category card resolves a real catalog slug to its curated category illustration', () => {
  render(
    <MemoryRouter>
      <CategoryCard category={{ id: 6, name_ar: 'الأراضي والمساحة', slug: 'land-and-survey' }} count={3} />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'الأراضي والمساحة' })).toHaveAttribute(
    'src',
    '/images/khalsni/categories/land-and-survey.svg',
  )
})

test('service card resolution order: uploaded → category image → curated fallback', () => {
  const { rerender } = render(
    <MemoryRouter>
      <ServiceCard
        service={{
          id: 1,
          slug: 'service-a',
          name_ar: 'Service A',
          description_ar: 'Details',
          image_url: '/media/service-a.jpg',
          category: { id: 1, name_ar: 'Category A', image_url: '/media/category-a.jpg' },
        }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'Service A' })).toHaveAttribute('src', '/media/service-a.jpg')

  rerender(
    <MemoryRouter>
      <ServiceCard
        service={{
          id: 1,
          slug: 'service-a',
          name_ar: 'Service A',
          description_ar: 'Details',
          category: { id: 1, name_ar: 'Category A', image_url: '/media/category-a.jpg' },
        }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'Service A' })).toHaveAttribute('src', '/media/category-a.jpg')

  // No upload anywhere, unknown slug → generic Khalsni service illustration.
  rerender(
    <MemoryRouter>
      <ServiceCard
        service={{
          id: 1,
          slug: 'service-a',
          name_ar: 'Service A',
          description_ar: 'Details',
          category: { id: 1, name_ar: 'Category A' },
        }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'Service A' }).getAttribute('src')).toMatch(
    /\/images\/khalsni\/(services|categories|fallback)\//,
  )
})

test('service card resolves a real catalog slug to its own service illustration', () => {
  render(
    <MemoryRouter>
      <ServiceCard
        service={{ id: 3, slug: 'passport-renewal', name_ar: 'تجديد جواز السفر', description_ar: 'x', category: { id: 1, slug: 'civil-status-and-passports', name_ar: 'الأحوال' } }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'تجديد جواز السفر' })).toHaveAttribute(
    'src',
    '/images/khalsni/services/passport-renewal.svg',
  )
})

test('service card drops to the branded gradient cover only after an image load error', () => {
  const { container } = render(
    <MemoryRouter>
      <ServiceCard
        service={{
          id: 1,
          slug: 'service-a',
          name_ar: 'Service A',
          description_ar: 'Details',
          image_url: '/media/missing-service.jpg',
          category: { id: 1, name_ar: 'Category A' },
        }}
      />
    </MemoryRouter>,
  )

  fireEvent.error(screen.getByRole('img', { name: 'Service A' }))

  // No broken <img>; a deterministic branded gradient panel stands in.
  expect(screen.queryByRole('img', { name: 'Service A' })).not.toBeInTheDocument()
  const cover = container.querySelector('.kh-cover')
  expect(cover).toBeInTheDocument()
  expect(cover.getAttribute('style') || '').toMatch(/background-image/i)
})

test('service card alt text derives from the localized service name', () => {
  render(
    <MemoryRouter>
      <ServiceCard
        service={{ id: 10, slug: 's', name_ar: 'خدمة سند التسجيل', description_ar: 'x', image_url: '/media/s.jpg', category: { id: 1, name_ar: 'فئة' } }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('img', { name: 'خدمة سند التسجيل' })).toHaveAttribute('src', '/media/s.jpg')
})
