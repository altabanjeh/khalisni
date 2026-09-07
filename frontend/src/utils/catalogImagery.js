/**
 * Central, deterministic mapping from a service / category to a meaningful
 * curated illustration when no real image has been uploaded.
 *
 * Resolution order (see getCover in ./cover.js for where this plugs in):
 *
 *   service.image_url               (admin upload — always wins)
 *     → SERVICE_IMAGE_FALLBACKS[slug]   (service-specific curated illustration)
 *     → category.image_url              (admin upload on the category)
 *     → CATEGORY_IMAGE_FALLBACKS[slug]  (category-specific curated illustration)
 *     → GENERIC_SERVICE_FALLBACK        (one branded Khalsni illustration)
 *     → deterministic gradient          (last-resort technical safety net)
 *
 * The mapping is a plain lookup: a given service always resolves to the same
 * illustration until an administrator uploads a real image. Nothing here is
 * random. Assets are static SVGs under /public/images/khalsni (bundled, tiny,
 * scalable — no srcset needed) and are authored by
 * scripts/gen-catalog-illustrations.mjs.
 */

const BASE = '/images/khalsni'

export const CATEGORY_IMAGE_FALLBACKS = {
  'civil-status-and-passports': `${BASE}/categories/civil-status-and-passports.svg`,
  'social-security': `${BASE}/categories/social-security.svg`,
  tax: `${BASE}/categories/tax.svg`,
  'ministry-of-labour': `${BASE}/categories/ministry-of-labour.svg`,
  'municipal-services': `${BASE}/categories/municipal-services.svg`,
  'land-and-survey': `${BASE}/categories/land-and-survey.svg`,
  'quick-public-services': `${BASE}/categories/quick-public-services.svg`,
}

export const SERVICE_IMAGE_FALLBACKS = {
  'passport-appointment-booking': `${BASE}/services/passport-appointment-booking.svg`,
  'passport-renewal': `${BASE}/services/passport-renewal.svg`,
  'tax-clearance': `${BASE}/services/tax-clearance.svg`,
  'no-criminal-record-certificate': `${BASE}/services/no-criminal-record-certificate.svg`,
  'business-license-renewal': `${BASE}/services/business-license-renewal.svg`,
  'property-registration-deed': `${BASE}/services/property-registration-deed.svg`,
  'traffic-fines-payment': `${BASE}/services/traffic-fines-payment.svg`,
}

export const GENERIC_SERVICE_FALLBACK = `${BASE}/fallback/service.svg`
export const GENERIC_CATEGORY_FALLBACK = `${BASE}/fallback/category.svg`
export const HERO_ILLUSTRATION = `${BASE}/hero/discovery.svg`
export const CUSTOM_REQUEST_ILLUSTRATION = `${BASE}/misc/custom-request.svg`

export const EMPTY_STATE_ILLUSTRATIONS = {
  requests: `${BASE}/empty/no-requests.svg`,
  results: `${BASE}/empty/no-results.svg`,
  notifications: `${BASE}/empty/no-notifications.svg`,
  documents: `${BASE}/empty/no-documents.svg`,
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase()
}

function uploadedUrl(record) {
  return record?.image_url || record?.image || ''
}

/**
 * @returns {{ url: string, kind: 'uploaded'|'service-fallback'|'category-image'|'category-fallback'|'generic'|'' }}
 */
export function resolveCategoryImage(category) {
  const uploaded = uploadedUrl(category)
  if (uploaded) return { url: uploaded, kind: 'category-image' }

  const curated = CATEGORY_IMAGE_FALLBACKS[normalizeSlug(category?.slug)]
  if (curated) return { url: curated, kind: 'category-fallback' }

  return { url: GENERIC_CATEGORY_FALLBACK, kind: 'generic' }
}

export function resolveServiceImage(service) {
  const uploaded = uploadedUrl(service)
  if (uploaded) return { url: uploaded, kind: 'uploaded' }

  const serviceCurated = SERVICE_IMAGE_FALLBACKS[normalizeSlug(service?.slug)]
  if (serviceCurated) return { url: serviceCurated, kind: 'service-fallback' }

  const category = service?.category
  const categoryUploaded = uploadedUrl(category)
  if (categoryUploaded) return { url: categoryUploaded, kind: 'category-image' }

  const categoryCurated = CATEGORY_IMAGE_FALLBACKS[normalizeSlug(category?.slug)]
  if (categoryCurated) return { url: categoryCurated, kind: 'category-fallback' }

  return { url: GENERIC_SERVICE_FALLBACK, kind: 'generic' }
}
