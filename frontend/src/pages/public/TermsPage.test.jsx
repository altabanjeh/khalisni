import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import TermsPage from './TermsPage'
import { legalApi } from '../../api/legalApi'
import { LanguageProvider } from '../../context/LanguageContext'
import { LANGUAGE_STORAGE_KEY } from '../../utils/i18n'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const draftTerms = {
  kind: 'terms',
  version: '2026-11-01-draft',
  effective_date: '2026-11-01',
  title_ar: 'شروط الاستخدام',
  title_en: 'Terms of Use',
  body_ar: 'شروط تجريبية للاختبار.',
  body_en: 'Test terms text.',
  approval_status: 'draft_requires_approval',
  updated_at: '2026-11-01T08:00:00Z',
}

function renderPage(language) {
  if (language) localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  return render(
    <LanguageProvider>
      <MemoryRouter><TermsPage /></MemoryRouter>
    </LanguageProvider>,
  )
}

test('terms page renders the published Arabic draft with the draft banner and a privacy link', async () => {
  const legal = vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce(draftTerms)
  renderPage()
  expect(await screen.findByText('شروط تجريبية للاختبار.')).toBeInTheDocument()
  expect(legal).toHaveBeenCalledWith('terms')
  expect(screen.getByRole('heading', { level: 1, name: 'شروط الاستخدام' })).toBeInTheDocument()
  expect(screen.getByTestId('legal-draft-banner')).toHaveTextContent('مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد')
  expect(screen.getByRole('link', { name: 'سياسة الخصوصية' })).toHaveAttribute('href', '/privacy')
})

test('terms page in English', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce(draftTerms)
  renderPage('en')
  expect(await screen.findByText('Test terms text.')).toBeInTheDocument()
  expect(screen.getByTestId('legal-draft-banner')).toHaveTextContent('Draft — requires owner/legal approval before production')
  expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
})

test('approved terms show no banner; unpublished terms say so', async () => {
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockResolvedValueOnce({ ...draftTerms, approval_status: 'approved' })
  const { unmount } = renderPage()
  expect(await screen.findByText('شروط تجريبية للاختبار.')).toBeInTheDocument()
  expect(screen.queryByTestId('legal-draft-banner')).not.toBeInTheDocument()
  unmount()
  vi.spyOn(legalApi, 'getPublicLegalDocument').mockRejectedValueOnce(Object.assign(new Error('Not found'), { status: 404 }))
  renderPage()
  expect(await screen.findByText('شروط الاستخدام غير منشورة حالياً.')).toBeInTheDocument()
})
