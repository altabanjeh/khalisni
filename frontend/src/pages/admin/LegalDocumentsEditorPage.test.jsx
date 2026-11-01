import { afterEach, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LegalDocumentsEditorPage from './LegalDocumentsEditorPage'
import { legalApi } from '../../api/legalApi'

afterEach(() => vi.restoreAllMocks())

const seeded = {
  id: 1,
  legal_document_id: 1,
  kind: 'privacy',
  version: '2026-11-01-draft',
  effective_date: '2026-11-01',
  title_ar: 'سياسة الخصوصية',
  title_en: 'Privacy Policy',
  body_ar: 'نص المسودة',
  body_en: 'Draft text',
  approval_status: 'draft_requires_approval',
  approval_note: '',
  is_published: true,
  is_editable: false,
  approved_at: null,
}

test('a published version is read-only and a new version starts from its text', async () => {
  vi.spyOn(legalApi, 'getAdminLegalDocuments').mockResolvedValue([seeded])
  const create = vi.spyOn(legalApi, 'createAdminLegalDocument').mockResolvedValue({ ...seeded, legal_document_id: 2, id: 2, is_published: false, is_editable: true, version: '2026-12-01' })
  render(<MemoryRouter><LegalDocumentsEditorPage /></MemoryRouter>)

  await userEvent.click(await screen.findByRole('button', { name: /2026-11-01-draft/ }))
  expect(screen.getByTestId('legal-version-readonly')).toHaveTextContent('هذه النسخة نُشرت ولا يمكن تعديلها')

  await userEvent.click(screen.getByRole('button', { name: 'نسخة جديدة' }))
  expect(screen.getByLabelText(/^النص \(عربي\)/)).toHaveValue('نص المسودة')
  await userEvent.type(screen.getByLabelText(/رقم النسخة/), '2026-12-01')
  await userEvent.type(screen.getByLabelText('تاريخ السريان'), '2026-12-01')
  await userEvent.click(screen.getByRole('button', { name: 'حفظ كمسودة غير منشورة' }))

  await waitFor(() => expect(create).toHaveBeenCalled())
  expect(create.mock.calls[0][0]).toMatchObject({
    kind: 'privacy', version: '2026-12-01', body_ar: 'نص المسودة', approval_status: 'draft_requires_approval',
  })
})
