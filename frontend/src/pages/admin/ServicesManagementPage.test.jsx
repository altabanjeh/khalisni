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

  // Long values are pasted (one input event each) rather than typed key by key:
  // the builder form re-renders on every keystroke and typing made this test slow.
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
  await user.click(document.querySelector('input[name="name_ar"]'))
  await user.paste('خدمة تجديد جواز السفر')
  await user.click(document.querySelector('textarea[name="description_ar"]'))
  await user.paste('وصف الخدمة بالعربية')

  await user.click(screen.getByRole('button', { name: '+ حقل مطلوب' }))
  await user.click(screen.getByPlaceholderText('مثال: رقم الجواز'))
  await user.paste('رقم الجواز')
  await user.click(screen.getByPlaceholderText('Passport number'))
  await user.paste('Passport number')
  await user.click(screen.getByPlaceholderText('أدخل رقم الجواز'))
  await user.paste('أدخل رقم الجواز')
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
}, 30000)
