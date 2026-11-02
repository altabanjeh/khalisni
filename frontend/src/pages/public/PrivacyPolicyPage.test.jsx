import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { api } from '../../api/services'
import { legalApi } from '../../api/legalApi'
import { LanguageProvider } from '../../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const notFound = Object.assign(new Error('Not found'), { status: 404 })

const draftPrivacy = {
  kind: 'privacy',
  version: '2026-11-01-draft',
  effective_date: '2026-11-01',
  title_ar: 'سياسة الخصوصية',
  title_en: 'Privacy Policy',
  body_ar: 'هذه مسودة للاختبار.\n\n1. البيانات\nنص القسم الأول.',
  body_en: 'This is a test draft.\n\n1. Data\nFirst section text.',
  approval_status: 'draft_requires_approval',
  updated_at: '2026-11-01T08:00:00Z',
}

function renderPage({ language } = {}) {
  if (language) localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  return render(
    <LanguageProvider>
      <MemoryRouter><PrivacyPolicyPage /></MemoryRouter>
    </LanguageProvider>,
  )
}

test('public privacy page renders the published approved policy from CMS when no legal document is published', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockRejectedValueOnce(notFound)
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValueOnce({
    content: {
      privacy_policy_ar: 'نص سياسة معتمد للاختبار.\n\nتفاصيل الاحتفاظ المعتمدة.',
      privacy_policy_en: 'Approved QA policy.\n\nApproved retention details.',
    },
  })
  renderPage()
  expect(await screen.findByText('نص سياسة معتمد للاختبار.')).toBeInTheDocument()
  expect(screen.getByText('تفاصيل الاحتفاظ المعتمدة.')).toBeInTheDocument()
  expect(screen.queryByTestId('legal-draft-banner')).not.toBeInTheDocument()
})

test('the published legal document wins over the CMS text and shows the Arabic draft banner', async () => {
  const legal = vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce(draftPrivacy)
  const homepage = vi.spyOn(api, 'getPublicHomepage')
  renderPage()
  expect(await screen.findByText('هذه مسودة للاختبار.')).toBeInTheDocument()
  expect(legal).toHaveBeenCalledWith('privacy')
  expect(homepage).not.toHaveBeenCalled()
  expect(screen.getByTestId('legal-draft-banner')).toHaveTextContent('مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد')
  expect(screen.getByRole('heading', { name: '1. البيانات' })).toBeInTheDocument()
  // Arabic reads the draft suffix in Arabic; the id itself is unchanged.
  expect(screen.getByTestId('legal-document-meta')).toHaveTextContent('الإصدار: 2026-11-01 (مسودة)')
  expect(screen.getByTestId('legal-document-meta')).not.toHaveTextContent('draft')
  expect(screen.getByRole('link', { name: 'شروط الاستخدام' })).toHaveAttribute('href', '/terms')
})

test('English page shows the English text and English draft banner', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce(draftPrivacy)
  renderPage({ language: 'en' })
  expect(await screen.findByText('This is a test draft.')).toBeInTheDocument()
  expect(screen.getByTestId('legal-draft-banner')).toHaveTextContent('Draft — requires owner/legal approval before production')
  expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms')
})

test('an approved version shows no draft banner', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce({ ...draftPrivacy, approval_status: 'approved' })
  renderPage()
  expect(await screen.findByText('هذه مسودة للاختبار.')).toBeInTheDocument()
  expect(screen.queryByTestId('legal-draft-banner')).not.toBeInTheDocument()
})

test('with no legal document and no CMS text the page says the policy is not published', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockRejectedValueOnce(notFound)
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValueOnce({ content: { privacy_policy_ar: '', privacy_policy_en: '' } })
  renderPage()
  expect(await screen.findByText('سياسة الخصوصية غير منشورة حالياً.')).toBeInTheDocument()
})
