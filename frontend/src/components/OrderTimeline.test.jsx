// DEF-C04: a timeline step without a note shows no filler sentence.
import { render, screen } from '@testing-library/react'
import OrderTimeline from './OrderTimeline'
import { LanguageProvider } from '../context/LanguageContext'

function renderTimeline(items, language = 'ar') {
  localStorage.setItem('khalisni-language', language)
  return render(
    <LanguageProvider>
      <OrderTimeline items={items} />
    </LanguageProvider>,
  )
}

const items = [
  { id: 1, new_status: 'SUBMITTED', created_at: '2026-05-01T10:00:00Z', note: '' },
  { id: 2, new_status: 'UNDER_REVIEW', created_at: '2026-05-02T10:00:00Z', note: null },
  { id: 3, new_status: 'COMPLETED', created_at: '2026-05-03T10:00:00Z', note: 'تم التسليم بنجاح' },
]

test('steps without a note render no repeated "no additional notes" filler (AR)', () => {
  const { container } = renderTimeline(items, 'ar')
  expect(screen.queryByText(/لا توجد ملاحظات إضافية/)).not.toBeInTheDocument()
  expect(screen.getByText('تم التسليم بنجاح')).toBeInTheDocument()
  expect(container.querySelectorAll('li')).toHaveLength(3)
  // only the one real note produces a paragraph
  expect(container.querySelectorAll('article p')).toHaveLength(1)
})

test('steps without a note render no filler in English either', () => {
  renderTimeline(items, 'en')
  expect(screen.queryByText(/No additional notes/i)).not.toBeInTheDocument()
})
