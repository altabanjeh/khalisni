import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryCard from './CategoryCard'
import ServiceCard from './ServiceCard'

test('category card renders uploaded image and falls back without a broken image', () => {
  const { rerender } = render(
    <MemoryRouter>
      <CategoryCard category={{ id: 1, name_ar: 'Category A', slug: 'category-a', image_url: '/media/category-a.jpg' }} count={2} />
    </MemoryRouter>,
  )

  expect(screen.getByRole('img', { name: 'Category A' })).toHaveAttribute('src', '/media/category-a.jpg')

  rerender(
    <MemoryRouter>
      <CategoryCard category={{ id: 1, name_ar: 'Category A', slug: 'category-a' }} count={2} />
    </MemoryRouter>,
  )

  expect(screen.queryByRole('img', { name: 'Category A' })).not.toBeInTheDocument()
})

test('service card prefers service image, then category image, then visual fallback', () => {
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

  expect(screen.queryByRole('img', { name: 'Service A' })).not.toBeInTheDocument()
})

test('service card removes image element after load error', () => {
  render(
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

  expect(screen.queryByRole('img', { name: 'Service A' })).not.toBeInTheDocument()
})
