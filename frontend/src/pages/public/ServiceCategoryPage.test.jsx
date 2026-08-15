import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import ServiceCategoryPage from './ServiceCategoryPage'
import { api } from '../../api/services'

test('category page renders services from the public category API', async () => {
  vi.spyOn(api, 'getPublicServiceCategories').mockResolvedValueOnce([
    {
      id: 1,
      slug: 'civil-status',
      name_ar: 'الأحوال المدنية',
      name_en: 'Civil status',
      description_ar: 'خدمات الوثائق الرسمية.',
      service_count: 1,
    },
  ])
  vi.spyOn(api, 'getPublicCategoryServices').mockResolvedValueOnce([
    {
      id: 10,
      slug: 'passport-renewal',
      name_ar: 'تجديد جواز سفر',
      name_en: 'Passport renewal',
      description_ar: 'متابعة تجديد جواز السفر.',
      category: { slug: 'civil-status', name_ar: 'الأحوال المدنية' },
      pricing: { total_price: 28 },
      delivery_time: { label_ar: '5 أيام' },
    },
  ])

  render(
    <MemoryRouter initialEntries={['/services/category/civil-status']}>
      <Routes>
        <Route path="/services/category/:slug" element={<ServiceCategoryPage />} />
      </Routes>
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByText('تجديد جواز سفر')).toBeInTheDocument()
  })

  expect(api.getPublicCategoryServices).toHaveBeenCalledWith('civil-status')
  expect(screen.getAllByText('الأحوال المدنية').length).toBeGreaterThan(0)
})
