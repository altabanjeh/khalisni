/**
 * Deterministic "cover" for a service or category card.
 *
 * Resolution (image-first, so a wall of cards always reads as image-first):
 *
 *   1. real uploaded image on the record (image_url / image / hero_image_url)
 *   2. curated illustration — service-specific → category image → category
 *      illustration → generic Khalsni illustration  (see ./catalogImagery.js)
 *   3. deterministic branded gradient — the final technical safety net, only
 *      reached if a bundled illustration itself fails to load (the component's
 *      onError handler flips to `style`). During normal seeded/demo use the
 *      customer never sees the gradient.
 *
 * The curated illustration for a given service/category never changes until an
 * administrator uploads a real image — nothing here is random.
 */
import { resolveCategoryImage, resolveServiceImage } from './catalogImagery'

// Khalsni-tinted gradient pairs — the last-resort safety fill. All stay in the
// brand blue / slate family so a fallback still reads as one system.
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

function looksLikeService(record) {
  return Boolean(
    record?.category ||
      record?.required_documents ||
      record?.required_documents_count != null ||
      record?.pricing ||
      record?.delivery_time ||
      record?.base_price != null,
  )
}

/**
 * @param {object} record   service or category
 * @param {string} seedKey  extra string to vary the gradient hash
 * @param {{ as?: 'service'|'category' }} [options]
 * @returns {{ hasImage: boolean, imageUrl?: string, kind: string, style: object, from: string, to: string }}
 */
export function getCover(record, seedKey = '', options = {}) {
  const as = options.as || (looksLikeService(record) ? 'service' : 'category')
  const resolved = as === 'category' ? resolveCategoryImage(record) : resolveServiceImage(record)

  const heroUpload = record?.hero_image_url || ''
  const imageUrl = heroUpload || resolved.url || ''
  const kind = heroUpload ? 'uploaded' : resolved.kind

  const seed = seedKey || record?.slug || record?.name_en || record?.name_ar || record?.id || 'khalsni'
  const [from, to] = GRADIENTS[hashString(seed) % GRADIENTS.length]

  return {
    hasImage: Boolean(imageUrl),
    imageUrl: imageUrl || undefined,
    kind,
    isRealImage: kind === 'uploaded' || kind === 'category-image',
    from,
    to,
    style: {
      backgroundImage: `radial-gradient(120% 120% at 85% 15%, ${from} 0%, ${to} 70%)`,
    },
  }
}
