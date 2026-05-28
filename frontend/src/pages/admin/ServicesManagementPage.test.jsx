import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ServicesManagementPage from './ServicesManagementPage'
import { api } from '../../api/services'

test('services management page builds required information schema from visual fields', async () => {
  vi.spyOn(api, 'getAdminCategories').mockResolvedValue([{ id: 1, name_ar: 'الخدمات الحكومية', name_en: 'Government Services' }])
  vi.spyOn(api, 'getAdminServices').mockResolvedValue([])
  vi.spyOn(api, 'getAdminServiceDocuments').mockResolvedValue([])
  const createServiceSpy = vi.spyOn(api, 'createAdminService').mockResolvedValue({ id: 10 })

  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <ServicesManagementPage />
    </MemoryRouter>,
  )

  await waitFor(() => {
    expect(screen.getByRole('button', { name: '+ خدمة جديدة' })).toBeInTheDocument()
  })

  await user.click(screen.getByRole('button', { name: '+ خدمة جديدة' }))
  await user.selectOptions(document.querySelector('select[name="category_id"]'), '1')
  await user.type(document.querySelector('input[name="name_ar"]'), 'خدمة تجديد جواز السفر')
  await user.type(document.querySelector('textarea[name="description_ar"]'), 'وصف الخدمة بالعربية')

  await user.click(screen.getByRole('button', { name: '+ حقل مطلوب' }))
  await user.type(screen.getByPlaceholderText('مثال: رقم الجواز'), 'رقم الجواز')
  await user.type(screen.getByPlaceholderText('Passport number'), 'Passport number')
  await user.type(screen.getByPlaceholderText('أدخل رقم الجواز'), 'أدخل رقم الجواز')
  await user.click(screen.getByRole('checkbox', { name: 'الحقل مطلوب عند الطلب' }))

  await waitFor(() => {
    expect(screen.getAllByDisplayValue(/passport_number/i).length).toBeGreaterThan(0)
  })

  await user.click(screen.getByRole('button', { name: 'إضافة الخدمة' }))

  await waitFor(() => {
    expect(createServiceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: 1,
        name_ar: 'خدمة تجديد جواز السفر',
        description_ar: 'وصف الخدمة بالعربية',
        required_information_schema: [
          {
            name: 'passport_number',
            label_ar: 'رقم الجواز',
            label: 'Passport number',
            type: 'text',
            required: true,
            placeholder: 'أدخل رقم الجواز',
          },
        ],
      }),
    )
  })
})
