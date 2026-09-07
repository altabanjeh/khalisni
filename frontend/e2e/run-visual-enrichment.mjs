/**
 * Visual asset enrichment acceptance capture.
 *   node e2e/run-visual-enrichment.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const DIR = 'e2e-results/visual-enrichment'
mkdirSync(DIR, { recursive: true })

const b = await chromium.launch({ channel: 'chrome', headless: true })

// resolve a few real service slugs + a category slug
const rc = await b.newContext()
const list = await (await rc.request.get(`${API}/api/services/`)).json()
const rows = Array.isArray(list) ? list : list.results || []
const services = rows.map((s) => s.slug).filter(Boolean)
const catSlug = rows.map((s) => s.category?.slug).filter(Boolean)[0] || 'land-and-survey'
await rc.close()

const cust = await (await b.newContext()).request.post(`${API}/api/auth/login/`, {
  data: { email: 'customer@khalisni.local', password: 'Customer@123' },
})
const { access, refresh } = await cust.json()

const report = { captured: [], brokenImages: [], gradientOnlyCovers: [], coverSrcByCard: {}, distinctCoverSrc: {}, consoleErrors: [], overflow: [] }

async function shoot(name, route, { lang, width, height, auth = false }) {
  const ctx = await b.newContext({ viewport: { width, height }, isMobile: width < 500, hasTouch: width < 500 })
  await ctx.addInitScript(([l, a, r, isAuth]) => {
    try { localStorage.setItem('khalisni-language', l) } catch {}
    if (isAuth) {
      localStorage.setItem('khalisni_access', a)
      localStorage.setItem('khalisni_refresh', r)
      localStorage.setItem('khalisni_auth_storage', 'local')
    }
  }, [lang, access, refresh, auth])

  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && !/401|403|favicon/.test(m.text()) && report.consoleErrors.push(`${lang} ${name}: ${m.text().slice(0, 140)}`))
  await p.goto(B + route, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await p.waitForTimeout(1200)
  // walk the full page so every lazy-loaded image below the fold resolves
  await p.evaluate(async () => {
    const step = Math.max(320, window.innerHeight * 0.8)
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 220))
    }
    window.scrollTo(0, 0)
  })
  await p.waitForTimeout(1200)

  // broken-image detection + cover-src inventory
  const imgInfo = await p.evaluate(() => {
    const out = { broken: [], covers: [], gradientCovers: 0 }
    for (const img of Array.from(document.images)) {
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) out.broken.push(img.currentSrc)
    }
    for (const el of Array.from(document.querySelectorAll('.kh-cover'))) {
      const img = el.querySelector('img')
      if (img) out.covers.push(img.getAttribute('src') || img.currentSrc)
      else if ((el.getAttribute('style') || '').includes('background-image')) out.gradientCovers += 1
    }
    return out
  })
  if (imgInfo.broken.length) report.brokenImages.push({ screen: `${lang} ${name} @${width}`, urls: imgInfo.broken })
  if (imgInfo.gradientCovers) report.gradientOnlyCovers.push(`${lang} ${name} @${width}: ${imgInfo.gradientCovers}`)
  if (imgInfo.covers.length) {
    report.coverSrcByCard[`${lang} ${name} @${width}`] = imgInfo.covers
    report.distinctCoverSrc[`${lang} ${name} @${width}`] = [...new Set(imgInfo.covers)].length + '/' + imgInfo.covers.length
  }

  const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  if (of > 2) report.overflow.push(`${lang} ${name} @${width} = ${of}px`)

  await p.screenshot({ path: `${DIR}/${lang}-${name}-${width}.png`, fullPage: true }).catch(() => {})
  report.captured.push(`${lang}-${name}-${width}`)
  await p.close()
  await ctx.close()
}

const PUBLIC = [
  ['home', '/'],
  ['services', '/services'],
  ['category', `/services/category/${catSlug}`],
  ['service-detail-1', `/services/${services[0] || 'passport-renewal'}`],
  ['service-detail-2', `/services/${services[1] || 'property-registration-deed'}`],
  ['service-detail-3', `/services/${services[2] || 'tax-clearance'}`],
]
const CUSTOMER = [
  ['customer-dashboard', '/customer'],
  ['customer-orders', '/customer/orders'],
]

for (const lang of ['ar', 'en']) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const [n, r] of PUBLIC) await shoot(n, r, { lang, width: w, height: h })
    for (const [n, r] of CUSTOMER) await shoot(n, r, { lang, width: w, height: h, auth: true })
  }
}

await b.close()
writeFileSync(`${DIR}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  captured: report.captured.length,
  brokenImages: report.brokenImages,
  gradientOnlyCovers: report.gradientOnlyCovers,
  distinctCoverSrc: report.distinctCoverSrc,
  consoleErrors: report.consoleErrors,
  overflow: report.overflow,
}, null, 2))
