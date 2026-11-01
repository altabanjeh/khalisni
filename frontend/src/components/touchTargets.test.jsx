// DEF-U05: interactive icon targets must reserve at least 24x24 CSS px.
// jsdom has no layout engine, so these assert the sizing utilities that
// guarantee the box (h-8 = 32px, h-9 = 36px).
import { useEffect } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import InlineHelp, { HelpLabel } from './InlineHelp'
import FileUploader from './FileUploader'
import { ToastContainer } from './Toast'
import { useToast } from '../context/ToastContext'
import { LanguageProvider } from '../context/LanguageContext'

const AT_LEAST_32 = /(^|\s)(h-(8|9|10|11)|min-h-(8|9|10|11))(\s|$)/

beforeEach(() => {
  localStorage.setItem('khalisni-language', 'ar')
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  }))
})
afterEach(() => vi.unstubAllGlobals())

test('inline help "?" button reserves a 32px target while keeping a small visual footprint', () => {
  render(<InlineHelp fallbackText="شرح الحقل" title="الحقل" />)
  const button = screen.getByRole('button', { name: 'الحقل' })
  expect(button.className).toMatch(/(^|\s)h-8(\s|$)/)
  expect(button.className).toMatch(/(^|\s)w-8(\s|$)/)
  expect(button.className).not.toMatch(/(^|\s)h-5(\s|$)/)
  // the negative margin keeps the label row from growing
  expect(button.className).toMatch(/-m-1\.5/)
})

test('HelpLabel (used by the rating field) gets the same enlarged help target', () => {
  render(<HelpLabel fallbackText="شرح التقييم">التقييم</HelpLabel>)
  const button = screen.getByRole('button', { name: 'التقييم' })
  expect(button.className).toMatch(/(^|\s)h-8(\s|$)/)
  expect(button.className).toMatch(/(^|\s)w-8(\s|$)/)
})

test('file remove and replace buttons are at least 32px tall', () => {
  const { container } = render(
    <LanguageProvider>
      <FileUploader accept=".pdf" name="doc" />
    </LanguageProvider>,
  )
  const input = container.querySelector('input[type="file"]')
  fireEvent.change(input, { target: { files: [new File(['%PDF'], 'a.pdf', { type: 'application/pdf' })] } })
  const remove = screen.getByRole('button', { name: /حذف الملف a\.pdf/ })
  expect(remove.className).toMatch(AT_LEAST_32)
  expect(remove.className).toMatch(/(^|\s)w-9(\s|$)/)
  const replace = screen.getByRole('button', { name: /استبدال الملف a\.pdf/ })
  expect(replace.className).toMatch(AT_LEAST_32)
})

function PushToast() {
  const { toast } = useToast()
  useEffect(() => {
    toast('تم الحفظ', 'success', 0)
  }, [toast])
  return null
}

test('toast dismiss button is at least 32px', async () => {
  render(
    <LanguageProvider>
      <PushToast />
      <ToastContainer />
    </LanguageProvider>,
  )
  const dismiss = await screen.findAllByRole('button', { name: 'إغلاق الإشعار' })
  expect(dismiss.length).toBeGreaterThan(0)
  for (const button of dismiss) expect(button.className).toMatch(AT_LEAST_32)
})
