/**
 * Capture the REAL deployed catalog (not the 7-record demo seed).
 *   node e2e/run-real-catalog.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8011'
const DIR = 'e2e-results/real-catalog'
mkdirSync(DIR, { recursive: true })

const b = await chromium.launch({ channel: 'chrome', headless: true })
const rc = await b.newContext()
const svcJson = await (await rc.request.get(`${API}/api/services/`)).json()
const svcRows = Array.isArray(svcJson) ? svcJson : svcJson.results || []
const catJson = await (await rc.request.get(`${API}/api/services/categories/`)).json()
const catRows = Array.isArray(catJson) ? catJson : catJson.results || []
await rc.close()

const catSlugs = catRows.map((c) => c.slug).filter(Boolean)
const svcSlugs = svcRows.map((s) => s.slug).filter(Boolean)

const report = {
  apiServices: svcRows.length,
  apiCategories: catRows.length,
  servicesWithoutImageUrl: svcRows.filter((s) => !s.image_url).map((s) => s.slug),
  categoriesWithoutImageUrl: catRows.filter((c) => !(c.image_url || c.image)).map((c) => c.slug),
  captured: [],
  brokenImages: [],
  gradientOnlyCovers: [],
  fallbackSvgCovers: [],
  consoleErrors: [],
  overflow: [],
  coverKindByScreen: {},
}

async function shoot(name, route, lang, width, height) {
  const ctx = await b.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 })
  await ctx.addInitScript((l) => { try { localStorage.setItem('khalisni-language', l) } catch {} }, lang)
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && !/401|403|favicon/.test(m.text()) && report.consoleErrors.push(`${lang} ${name}: ${m.text().slice(0, 140)}`))
  await p.goto(B + route, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await p.waitForTimeout(1200)
  await p.evaluate(async () => {
    const step = Math.max(320, window.innerHeight * 0.8)
    for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 220)) }
    window.scrollTo(0, 0)
  })
  await p.waitForTimeout(1200)

  const info = await p.evaluate(() => {
    const out = { broken: [], srcs: [], gradient: 0, fallbackSvg: 0 }
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) out.broken.push(img.currentSrc)
    }
    for (const el of Array.from(document.querySelectorAll('.kh-cover, .kh-public-image-fallback'))) {
      const img = el.querySelector('img')
      if (img) {
        const s = img.getAttribute('src') || img.currentSrc || ''
        out.srcs.push(s)
        if (s.includes('/images/khalsni/')) out.fallbackSvg += 1
      } else if ((el.getAttribute('style') || '').includes('background-image')) out.gradient += 1
    }
    return out
  })
  if (info.broken.length) report.brokenImages.push({ screen: `${lang} ${name} @${width}`, urls: info.broken })
  if (info.gradient) report.gradientOnlyCovers.push(`${lang} ${name} @${width}: ${info.gradient}`)
  if (info.fallbackSvg) report.fallbackSvgCovers.push(`${lang} ${name} @${width}: ${info.fallbackSvg}`)
  report.coverKindByScreen[`${lang} ${name} @${width}`] = {
    total: info.srcs.length,
    media: info.srcs.filter((s) => s.includes('/media/')).length,
    fallbackSvg: info.fallbackSvg,
    gradient: info.gradient,
  }
  const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  if (of > 2) report.overflow.push(`${lang} ${name} @${width} = ${of}px`)
  await p.screenshot({ path: `${DIR}/${lang}-${name}-${width}.png`, fullPage: true }).catch(() => {})
  report.captured.push(`${lang}-${name}-${width}`)
  await p.close()
  await ctx.close()
}

const ROUTES = [
  ['home', '/'],
  ['services', '/services'],
  ...catSlugs.map((s, i) => [`category-${i + 1}-${s}`, `/services/category/${s}`]),
  ...svcSlugs.slice(0, 12).map((s, i) => [`service-${String(i + 1).padStart(2, '0')}-${s}`, `/services/${s}`]),
]

for (const lang of ['ar', 'en']) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const [n, r] of ROUTES) await shoot(n, r, lang, w, h)
  }
}

await b.close()
writeFileSync(`${DIR}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  apiServices: report.apiServices,
  apiCategories: report.apiCategories,
  servicesWithoutImageUrl: report.servicesWithoutImageUrl,
  categoriesWithoutImageUrl: report.categoriesWithoutImageUrl,
  captured: report.captured.length,
  brokenImages: report.brokenImages,
  gradientOnlyCovers: report.gradientOnlyCovers,
  fallbackSvgCovers: report.fallbackSvgCovers,
  consoleErrors: report.consoleErrors,
  overflow: report.overflow,
}, null, 2))
