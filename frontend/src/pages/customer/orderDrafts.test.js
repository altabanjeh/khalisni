import {
  buildBaseDraftValues,
  draftMaxAgeMs,
  parseStoredDraft,
  serializeDraft,
} from './orderDrafts'

test('serializeDraft stores versioned draft data and parseStoredDraft restores it', () => {
  const values = {
    city: 'Amman',
    notes: 'Need fast processing',
    category_slug: 'government',
  }

  const serialized = serializeDraft(values, '2026-06-16T10:00:00.000Z')
  const parsed = parseStoredDraft(serialized, new Date('2026-06-16T12:00:00.000Z').getTime())

  expect(parsed).toEqual({
    values,
    message: '',
  })
})

test('parseStoredDraft rejects corrupted JSON payloads', () => {
  expect(() => parseStoredDraft('{bad json')).toThrow()
})

test('parseStoredDraft expires stale versioned drafts', () => {
  const staleSavedAt = new Date(10_000).toISOString()
  const now = 10_000 + draftMaxAgeMs + 1
  const serialized = serializeDraft({ city: 'Amman' }, staleSavedAt)

  const parsed = parseStoredDraft(serialized, now)

  expect(parsed).toEqual({
    values: null,
    message: 'انتهت صلاحية المسودة المحفوظة وتمت إزالتها. يمكنك إنشاء مسودة جديدة.',
  })
})

test('buildBaseDraftValues falls back to the authenticated customer profile', () => {
  expect(
    buildBaseDraftValues({
      requestedServiceId: '5',
      user: {
        full_name: 'Customer User',
        phone: '0799999999',
        national_id: '1234567890',
      },
    }),
  ).toEqual({
    category_slug: '',
    service: '5',
    full_name: 'Customer User',
    phone: '0799999999',
    national_id: '1234567890',
    city: '',
    notes: '',
    consent: true,
  })
})
