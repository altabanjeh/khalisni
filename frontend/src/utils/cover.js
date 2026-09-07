/**
 * Deterministic branded "cover" for a service or category when no real image is
 * configured. Every card then reads as image-first — a distinct coloured panel
 * with a large translucent glyph — instead of a blank white box with a tiny icon.
 *
 * When the record has a real `image_url` the caller uses that instead; this is
 * the fallback treatment only.
 */

// Khalsni-tinted gradient pairs. All stay in the brand blue / slate family so
// the wall of cards reads as one system, not a rainbow.
const GRADIENTS = [
  ['#1d4ed8', '#0b3aa8'],
  ['#2563eb', '#1e3a8a'],
  ['#0ea5e9', '#1d4ed8'],
  ['#3b82f6', '#1e40af'],
  ['#6366f1', '#1e3a8a'],
  ['#0891b2', '#155e91'],
  ['#4f46e5', '#312e81'],
  ['#0284c7', '#0c4a6e'],
]

function hashString(value) {
  const str = String(value || 'khalsni')
  let hash = 0
  for (let index = 0; index < str.length; index += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

/**
 * @param {object} record   service or category
 * @param {string} seedKey  extra string to vary the hash (e.g. category slug)
 * @returns {{ hasImage: boolean, imageUrl?: string, style: object, from: string, to: string }}
 */
export function getCover(record, seedKey = '') {
  const imageUrl =
    record?.image_url ||
    record?.image ||
    record?.hero_image_url ||
    record?.category?.image_url ||
    record?.category?.image ||
    ''

  const seed = seedKey || record?.slug || record?.name_en || record?.name_ar || record?.id || 'khalsni'
  const [from, to] = GRADIENTS[hashString(seed) % GRADIENTS.length]

  return {
    hasImage: Boolean(imageUrl),
    imageUrl: imageUrl || undefined,
    from,
    to,
    style: {
      backgroundImage: `radial-gradient(120% 120% at 85% 15%, ${from} 0%, ${to} 70%)`,
    },
  }
}
