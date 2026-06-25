const ICON_KEYWORDS = [
  { keywords: ['document', 'documents', 'وثيقة', 'وثائق', 'مستند', 'مستندات'], icon: 'file-text' },
  { keywords: ['payment', 'payments', 'دفع', 'مدفوعات', 'رسوم', 'مالية'], icon: 'credit-card' },
  { keywords: ['order', 'orders', 'طلب', 'طلبات'], icon: 'clipboard-list' },
  { keywords: ['provider', 'providers', 'مزود', 'مزوّد', 'مزودين', 'مزوّدين'], icon: 'briefcase-business' },
  { keywords: ['user', 'users', 'عميل', 'عملاء', 'مستخدم', 'مستخدمين'], icon: 'users-round' },
  { keywords: ['report', 'reports', 'تقرير', 'تقارير'], icon: 'line-chart' },
  { keywords: ['notification', 'notifications', 'اشعار', 'إشعار', 'تنبيه', 'تنبيهات'], icon: 'bell' },
  { keywords: ['support', 'help', 'مساعدة', 'دعم'], icon: 'circle-help' },
]

function buildFallbackHash(source) {
  let hash = 0
  for (const character of source) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash.toString(16).padStart(8, '0').slice(0, 8)
}

export function generateCatalogSlug(values, defaultPrefix = 'item') {
  const list = Array.isArray(values) ? values : [values]

  for (const value of list) {
    const slug = String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (slug) return slug
  }

  const rawSource = list.map((value) => String(value || '').trim()).filter(Boolean).join(' ')
  if (rawSource) {
    return `${defaultPrefix}-${buildFallbackHash(rawSource)}`
  }

  return defaultPrefix
}

export function suggestCategoryIcon(...values) {
  const haystack = values.map((value) => String(value || '').toLowerCase()).join(' ')
  const match = ICON_KEYWORDS.find((entry) => entry.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
  return match?.icon || 'folder-tree'
}
