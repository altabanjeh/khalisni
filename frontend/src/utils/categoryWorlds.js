// The client's catalogue "worlds" (CN-ACT-04): one card per top-level category,
// each with a cover image (or branded gradient), a light scrim and a slider of
// its services. The «طلب خاص» world has no services: it opens the special
// request form on the same page.
export const SPECIAL_REQUEST_SLUG = 'special-request'

function isPublicRecord(record) {
  return record && record.is_deleted !== true && record.is_active !== false && record.show_on_public_site !== false
}

function recordKeys(record) {
  return [record?.id, record?.category_id, record?.slug].filter((value) => value !== undefined && value !== null && value !== '').map(String)
}

function parentKey(category) {
  const parent = category?.parent
  if (parent && typeof parent === 'object') return String(parent.id ?? parent.category_id ?? parent.slug ?? '') || null
  return parent === undefined || parent === null || parent === '' ? null : String(parent)
}

export function categoryPath(category) {
  if (category?.slug) return `/services/category/${encodeURIComponent(category.slug)}`
  if (category?.id) return `/services?category=${encodeURIComponent(category.id)}`
  return '/services'
}

/**
 * Builds the list of worlds: top-level public categories (in API order), each
 * with the public services of the category and of its sub-categories. The
 * special-request world is always placed last.
 */
export function buildCategoryWorlds(categories = [], services = []) {
  const publicCategories = categories.filter(isPublicRecord)
  const byKey = new Map()
  publicCategories.forEach((category) => recordKeys(category).forEach((key) => byKey.set(key, category)))

  const rootOf = (category) => {
    let current = category
    const seen = new Set()
    while (current && parentKey(current) && !seen.has(current)) {
      seen.add(current)
      const parent = byKey.get(parentKey(current))
      if (!parent) break
      current = parent
    }
    return current
  }

  const roots = publicCategories.filter((category) => !parentKey(category) || !byKey.get(parentKey(category)))
  const servicesByRoot = new Map(roots.map((root) => [root, []]))

  services.filter(isPublicRecord).forEach((service) => {
    const category = service.category && typeof service.category === 'object' ? service.category : null
    const keys = [...recordKeys(category), service.category_id, typeof service.category !== 'object' ? service.category : null]
      .filter((value) => value !== undefined && value !== null && value !== '')
      .map(String)
    const match = keys.map((key) => byKey.get(key)).find(Boolean)
    const root = match ? rootOf(match) : null
    if (root && servicesByRoot.has(root)) servicesByRoot.get(root).push(service)
  })

  const worlds = roots.map((category) => ({
    id: String(category.slug || category.id),
    category,
    isSpecialRequest: category.slug === SPECIAL_REQUEST_SLUG,
    services: servicesByRoot.get(category) || [],
  }))
  return [...worlds.filter((world) => !world.isSpecialRequest), ...worlds.filter((world) => world.isSpecialRequest)]
}
