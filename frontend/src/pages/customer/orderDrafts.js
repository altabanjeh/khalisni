export const draftStorageKey = 'khalisni-client-order-draft'
export const draftSchemaVersion = 1
export const draftMaxAgeMs = 14 * 24 * 60 * 60 * 1000

export function buildBaseDraftValues({ requestedServiceId, user }) {
  return {
    category_slug: '',
    service: requestedServiceId,
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    national_id: user?.national_id || '',
    city: '',
    notes: '',
    consent: true,
  }
}

export function parseStoredDraft(storedDraft, now = Date.now()) {
  const parsedDraft = JSON.parse(storedDraft)

  if (!parsedDraft || typeof parsedDraft !== 'object' || Array.isArray(parsedDraft)) {
    throw new Error('invalid_draft_shape')
  }

  if ('version' in parsedDraft || 'values' in parsedDraft || 'savedAt' in parsedDraft) {
    if (parsedDraft.version !== draftSchemaVersion) {
      return {
        values: null,
        message: 'تم تجاهل المسودة المحفوظة لأن تنسيقها قديم. يمكنك المتابعة بمسودة جديدة.',
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
          message: 'انتهت صلاحية المسودة المحفوظة وتمت إزالتها. يمكنك إنشاء مسودة جديدة.',
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
