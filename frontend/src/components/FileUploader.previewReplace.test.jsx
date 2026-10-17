// Client note CN-ACT-08: before sending, each selected file can be previewed,
// replaced or removed.
import { afterEach, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import FileUploader from './FileUploader'
import { LanguageProvider } from '../context/LanguageContext'

beforeEach(() => {
  let next = 0
  vi.stubGlobal('URL', Object.assign(Object.create(URL), {
    createObjectURL: vi.fn(() => `blob:preview-${(next += 1)}`),
    revokeObjectURL: vi.fn(),
  }))
  localStorage.setItem('khalisni-language', 'ar')
})
afterEach(() => vi.unstubAllGlobals())

function renderUploader(onChange) {
  return render(
    <LanguageProvider>
      <FileUploader accept=".pdf" name="doc" onChange={onChange} />
    </LanguageProvider>,
  )
}

test('a selected file has a preview link, and replace swaps it for another accepted file', () => {
  const onChange = vi.fn()
  const { container } = renderUploader(onChange)
  const inputs = container.querySelectorAll('input[type="file"]')
  expect(inputs).toHaveLength(1) // one upload control per document
  const [chooser] = inputs
  const replacer = chooser
  const first = new File(['%PDF-1.4'], 'first.pdf', { type: 'application/pdf' })
  fireEvent.change(chooser, { target: { files: [first] } })

  const preview = screen.getByRole('link', { name: 'معاينة الملف first.pdf' })
  expect(preview).toHaveAttribute('href', 'blob:preview-1')
  expect(preview).toHaveAttribute('target', '_blank')

  fireEvent.click(screen.getByRole('button', { name: 'استبدال الملف first.pdf' }))
  const second = new File(['%PDF-1.4'], 'second.pdf', { type: 'application/pdf' })
  fireEvent.change(replacer, { target: { files: [second] } })
  expect(screen.getByText('second.pdf')).toBeInTheDocument()
  expect(screen.queryByText('first.pdf')).not.toBeInTheDocument()
  expect(onChange).toHaveBeenLastCalledWith(second)
})

test('a replacement of the wrong type is refused and the original file stays', () => {
  const { container } = renderUploader(vi.fn())
  const [chooser] = container.querySelectorAll('input[type="file"]')
  const replacer = chooser
  fireEvent.change(chooser, { target: { files: [new File(['%PDF-1.4'], 'keep.pdf', { type: 'application/pdf' })] } })
  fireEvent.click(screen.getByRole('button', { name: 'استبدال الملف keep.pdf' }))
  fireEvent.change(replacer, { target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] } })
  expect(screen.getByRole('alert')).toHaveTextContent('photo.png')
  expect(screen.getByText('keep.pdf')).toBeInTheDocument()
})
