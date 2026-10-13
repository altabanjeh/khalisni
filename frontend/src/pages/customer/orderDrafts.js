export const draftStorageKey = 'khalisni-client-order-draft'
export const draftSchemaVersion = 1
export const draftMaxAgeMs = 14 * 24 * 60 * 60 * 1000

export function draftStorageKeyForUser(user) {
  if (!user?.id) throw new Error('A customer account is required to store an order draft.')
  return `${draftStorageKey}:${user.id}`
}

export function submissionKeyStorageKeyForUser(user) {
  return `${draftStorageKeyForUser(user)}:submission-key`
}

// Drafts contain personal data (national ID, phone). Remove every stored
// draft and submission key, for any account, when the user signs out.
export function clearStoredOrderDrafts(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return
  try {
    const keys = []
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)
      if (key && key.startsWith(`${draftStorageKey}:`)) keys.push(key)
    }
    keys.forEach((key) => storage.removeItem(key))
  } catch {
    // Storage can be unavailable (private mode); nothing to clean up then.
  }
}

const draftMessages = {
  outdated: {
    ar: 'تم تجاهل المسودة المحفوظة لأن تنسيقها قديم. يمكنك المتابعة بمسودة جديدة.',
    en: 'The saved draft was ignored because its format is outdated. You can continue with a new draft.',
  },
  expired: {
    ar: 'انتهت صلاحية المسودة المحفوظة وتمت إزالتها. يمكنك إنشاء مسودة جديدة.',
    en: 'The saved draft expired and was removed. You can start a new draft.',
  },
}

function draftMessage(code, language) {
  return draftMessages[code][language === 'en' ? 'en' : 'ar']
}

export function buildBaseDraftValues({ requestedServiceId, user }) {
  return {
    category_slug: '',
    service: requestedServiceId,
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    national_id: user?.national_id || '',
    city: '',
    notes: '',
    consent: false,
  }
}

export function parseStoredDraft(storedDraft, now = Date.now(), language = 'ar') {
  const parsedDraft = JSON.parse(storedDraft)

  if (!parsedDraft || typeof parsedDraft !== 'object' || Array.isArray(parsedDraft)) {
    throw new Error('invalid_draft_shape')
  }

  if ('version' in parsedDraft || 'values' in parsedDraft || 'savedAt' in parsedDraft) {
    if (parsedDraft.version !== draftSchemaVersion) {
      return {
        values: null,
        message: draftMessage('outdated', language),
      }
    }

    if (!parsedDraft.values || typeof parsedDraft.values !== 'object' || Array.isArray(parsedDraft.values)) {
      throw new Error('invalid_draft_values')
    }

    if (parsedDraft.savedAt) {
      const savedAt = new Date(parsedDraft.savedAt).getTime()
      if (Number.isFinite(savedAt) && now - savedAt > draftMaxAgeMs) {
        return {
          values: null,
          message: draftMessage('expired', language),
        }
      }
    }

    return {
      values: parsedDraft.values,
      message: '',
    }
  }

  return {
    values: parsedDraft,
    message: '',
  }
}

export function serializeDraft(values, savedAt = new Date().toISOString()) {
  return JSON.stringify({
    version: draftSchemaVersion,
    savedAt,
    values,
  })
}
