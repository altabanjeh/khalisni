/**
 * Gate 1R targeted runtime probes: English LTR, RTL structure, D1 & D2 security
 * reproduction, and a deterministic screenshot baseline (AR + EN).
 *   node e2e/run-probes.mjs
 */
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const results = {}
mkdirSync('e2e-results/screenshots', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

// ---- language / direction ------------------------------------------------
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)
results.home_default_dir = await page.getAttribute('html', 'dir')
results.home_default_lang = await page.getAttribute('html', 'lang')

// find and click a language toggle (several possible markups)
const toggleCandidates = [
  page.getByRole('button', { name: /english|EN\b/i }),
  page.getByRole('button', { name: /language|اللغة/i }),
  page.locator('button:has-text("EN")'),
  page.locator('[aria-label*="language" i] button, button[aria-label*="language" i]'),
  page.locator('header button, nav button').last(),
]
let switched = false
for (const cand of toggleCandidates) {
  if (await cand.first().isVisible().catch(() => false)) {
    await cand.first().click().catch(() => {})
    await page.waitForTimeout(700)
    const dir = await page.getAttribute('html', 'dir')
    if (dir === 'ltr') { switched = true; break }
  }
}
results.english_toggle_found = switched
results.after_toggle_dir = await page.getAttribute('html', 'dir')
results.after_toggle_lang = await page.getAttribute('html', 'lang')
if (switched) {
  // structural LTR check: hero heading should be visible and body still has content
  results.english_body_len = (await page.locator('#root').innerText()).trim().length
}

// ---- D2: related-service fee visibility on public service detail --------
{
  const r = await ctx.request.get(`${API}/api/services/civil-status-and-passports/`).catch(() => null)
  // pick any public service slug from the list
  const list = await (await ctx.request.get(`${API}/api/services/`)).json()
  const rows = Array.isArray(list) ? list : list.results
  const slug = rows[0]?.slug
  const detail = await (await ctx.request.get(`${API}/api/services/${slug}/`)).json()
  const related = detail.related_services || []
  results.D2 = {
    slug,
    related_count: related.length,
    any_related_has_raw_fee: related.some((x) => 'service_fee' in x || 'government_fee' in x),
    main_pricing: detail.pricing,
    related_sample: related[0] || null,
  }
}

// ---- D1: sensitive media path via the raw /media/ route ---------------
{
  const probes = [
    '/media/secure_orders/1/documents/deadbeef.pdf',
    '/media/payments/receipts/x.pdf',
    '/media/../config/settings.py',
    '/media/services/images/nope.png', // public prefix -> should 404 from static, not 403 from guard
  ]
  results.D1 = {}
  for (const p of probes) {
    const resp = await ctx.request.get(`${API}${p}`, { maxRedirects: 0 }).catch((e) => ({ status: () => 'ERR:' + e.message }))
    results.D1[p] = typeof resp.status === 'function' ? resp.status() : resp.status
  }
}

// ---- screenshots (AR default) ---------------------------------------------
const SHOTS = [
  ['public-home', '/'],
  ['public-services', '/services'],
  ['public-service-detail', null], // filled below
  ['public-login', '/login'],
  ['public-track', '/track-order'],
]
{
  const list = await (await ctx.request.get(`${API}/api/services/`)).json()
  const rows = Array.isArray(list) ? list : list.results
  SHOTS[2][1] = `/services/${rows[0].slug}`
}
for (const [name, route] of SHOTS) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.screenshot({ path: `e2e-results/screenshots/${name}-ar-1440.png`, fullPage: true })
}
// mobile home
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(900)
await page.screenshot({ path: 'e2e-results/screenshots/public-home-ar-390.png', fullPage: true })

// authenticated screenshots
await page.setViewportSize({ width: 1440, height: 900 })
for (const role of ['admin', 'customer']) {
  const lr = await ctx.request.post(`${API}/api/auth/login/`, {
    data: { email: `${role}@khalisni.local`, password: role === 'admin' ? 'Admin@123' : 'Customer@123' },
  })
  const { access, refresh } = await lr.json()
  const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await actx.addInitScript(([a, r]) => {
    localStorage.setItem('khalisni_access', a); localStorage.setItem('khalisni_refresh', r); localStorage.setItem('khalisni_auth_storage', 'local')
  }, [access, refresh])
  const ap = await actx.newPage()
  const routes = role === 'admin'
    ? [['admin-dashboard', '/admin'], ['admin-services', '/admin/services'], ['admin-orders', '/admin/orders'], ['admin-users', '/admin/users']]
    : [['customer-dashboard', '/customer'], ['customer-orders', '/customer/orders'], ['customer-new-order', '/customer/orders/new']]
  for (const [name, route] of routes) {
    await ap.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await ap.waitForTimeout(1100)
    await ap.screenshot({ path: `e2e-results/screenshots/${name}-ar-1440.png`, fullPage: true })
  }
  await actx.close()
}

await browser.close()
writeFileSync('e2e-results/probes.json', JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
