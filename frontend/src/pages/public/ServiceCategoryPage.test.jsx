import { afterEach, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceCategoryPage from './ServiceCategoryPage'
import { api } from '../../api/services'

function renderCategoryPage(slug = 'civil-status') {
  return render(
    <MemoryRouter initialEntries={[`/services/category/${slug}`]}>
      <Routes>
        <Route path="/services/category/:slug" element={<ServiceCategoryPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

test('category page renders image, services, and navigation links from the public category API', async () => {
  vi.spyOn(api, 'getPublicServiceCategories').mockResolvedValueOnce([
    {
      id: 1,
      slug: 'civil-status',
      name_ar: 'الأحوال المدنية',
      name_en: 'Civil status',
      description_ar: 'خدمات الوثائق الرسمية.',
      image_url: '/media/categories/civil.jpg',
      service_count: 1,
    },
    {
      id: 2,
      slug: 'tax',
      name_ar: 'الضريبة',
      name_en: 'Tax',
      service_count: 0,
    },
  ])
  vi.spyOn(api, 'getPublicCategoryServices').mockResolvedValueOnce([
    {
      id: 10,
      slug: 'passport-renewal',
      name_ar: 'تجديد جواز سفر',
      name_en: 'Passport renewal',
      description_ar: 'متابعة تجديد جواز السفر.',
      category: { slug: 'civil-status', name_ar: 'الأحوال المدنية', image_url: '/media/categories/civil.jpg' },
      pricing: { total_price: 28 },
      delivery_time: { label_ar: '5 أيام' },
    },
  ])

  renderCategoryPage()

  await waitFor(() => {
    expect(screen.getByText('تجديد جواز سفر')).toBeInTheDocument()
  })

  expect(api.getPublicCategoryServices).toHaveBeenCalledWith('civil-status')
  expect(screen.getByRole('img', { name: 'الأحوال المدنية' })).toHaveAttribute('src', '/media/categories/civil.jpg')
  expect(screen.getByRole('link', { name: /كل الخدمات/ })).toHaveAttribute('href', '/services')
  expect(screen.getByRole('link', { name: /عرض الخدمة/ })).toHaveAttribute('href', '/services/passport-renewal')
})

test('category page handles an empty category without rendering a broken image', async () => {
  vi.spyOn(api, 'getPublicServiceCategories').mockResolvedValueOnce([
    {
      id: 3,
      slug: 'empty-category',
      name_ar: 'تصنيف فارغ',
      name_en: 'Empty category',
      description_ar: '',
      service_count: 0,
    },
  ])
  vi.spyOn(api, 'getPublicCategoryServices').mockResolvedValueOnce([])

  renderCategoryPage('empty-category')

  await waitFor(() => {
    expect(screen.getByText('لا توجد خدمات منشورة')).toBeInTheDocument()
  })

  expect(screen.queryByRole('img', { name: 'تصنيف فارغ' })).not.toBeInTheDocument()
})
