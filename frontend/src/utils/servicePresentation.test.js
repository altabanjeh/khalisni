import { getCategoryName, getServiceDescription, getServiceName } from './servicePresentation'

test('Arabic catalog rendering does not expose untranslated English source fields', () => {
  const service = { name_ar: 'Social Security', name_en: 'Social Security', description_ar: 'English detail', description_en: 'English detail' }
  expect(getServiceName(service, 'ar')).toBe('خدمة')
  expect(getServiceDescription(service, 'ar')).toBe('تفاصيل الخدمة قيد الإعداد.')
  expect(getCategoryName(service, 'ar')).toBe('تصنيف')
  expect(getServiceName(service, 'en')).toBe('Social Security')
})

test('approved Arabic content is shown without altering the English view', () => {
  const service = { name_ar: 'الضمان الاجتماعي', name_en: 'Social Security' }
  expect(getServiceName(service, 'ar')).toBe('الضمان الاجتماعي')
  expect(getServiceName(service, 'en')).toBe('Social Security')
})
