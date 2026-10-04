import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import PrivacyPolicyPage from './PrivacyPolicyPage'
import { api } from '../../api/services'

afterEach(() => vi.restoreAllMocks())

test('public privacy page renders the published approved policy from CMS', async () => {
  vi.spyOn(api, 'getPublicHomepage').mockResolvedValueOnce({
    content: {
      privacy_policy_ar: 'نص سياسة معتمد للاختبار.\n\nتفاصيل الاحتفاظ المعتمدة.',
      privacy_policy_en: 'Approved QA policy.\n\nApproved retention details.',
    },
  })
  render(<MemoryRouter><PrivacyPolicyPage /></MemoryRouter>)
  expect(await screen.findByText('نص سياسة معتمد للاختبار.')).toBeInTheDocument()
  expect(screen.getByText('تفاصيل الاحتفاظ المعتمدة.')).toBeInTheDocument()
})
