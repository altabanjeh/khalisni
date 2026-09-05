/**
 * Final-acceptance visual + responsive + RTL/LTR capture.
 * node e2e/run-acceptance-visual.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const DIR = 'e2e-results/acceptance-shots'
mkdirSync(DIR, { recursive: true })

const VPS = [
  ['1440', 1440, 900], ['1280', 1280, 800], ['1024', 1024, 768], ['768', 768, 1024], ['390', 390, 844],
]
const PUBLIC = [
  ['home', '/'], ['services', '/services'], ['category', '/services/category/civil-status-and-passports'],
  ['service-detail', null], ['track', '/track-order'], ['login', '/login'], ['register', '/register'],
  ['about', '/about'], ['faq', '/faq'],
]
const CUSTOMER = [['dashboard', '/customer'], ['orders', '/customer/orders'], ['new-order', '/customer/orders/new'], ['profile', '/customer/profile']]
const ADMIN = [
  ['dashboard', '/admin'], ['orders', '/admin/orders'], ['services', '/admin/services'],
  ['service-categories', '/admin/service-categories'], ['users', '/admin/users'], ['rules', '/admin/rules'],
  ['cms', '/admin/cms'], ['reports', '/admin/reports'], ['audit', '/admin/audit'], ['notifications', '/admin/notifications'],
  ['public-site', '/admin/public-site'], ['providers', '/admin/providers'], ['payments', '/admin/payments'],
]
const RESP_ROUTES = [['public-home', '/'], ['public-category', '/services/category/civil-status-and-passports'], ['public-service', null]]

const report = { overflow: [], errors: [], captured: [] }
const b = await chromium.launch({ channel: 'chrome', headless: true })

// resolve a real service slug
const listCtx = await b.newContext()
const list = await (await listCtx.request.get(`${API}/api/services/`)).json()
const slug = (Array.isArray(list) ? list : list.results)[0].slug
await listCtx.close()

async function tok(role) {
  const pw = { admin: 'Admin@123', customer: 'Customer@123', employee: 'Employee@123', provider: 'Provider@123' }[role]
  const r = await (await b.newContext()).request.post(`${API}/api/auth/login/`, { data: { email: `${role}@khalisni.local`, password: pw } })
  return r.json()
}

async function shoot(ctx, name, route, lang) {
  route = route || `/services/${slug}`
  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => m.type() === 'error' && !/401|favicon/.test(m.text()) && errs.push(m.text().slice(0, 160)))
  p.on('pageerror', (e) => errs.push('PE:' + String(e).slice(0, 160)))
  await p.goto(B + route, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await p.waitForTimeout(1100)
  const vp = p.viewportSize()
  const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  if (of > 2) report.overflow.push(`${lang} ${name} @${vp.width} = ${of}px`)
  if (errs.length) report.errors.push(`${lang} ${name} @${vp.width}: ${errs[0]}`)
  await p.screenshot({ path: `${DIR}/${lang}-${name}-${vp.width}.png`, fullPage: true }).catch(() => {})
  report.captured.push(`${lang}-${name}-${vp.width}`)
  await p.close()
}

for (const lang of ['ar', 'en']) {
  // public @ 1440 + 390
  for (const [w, W, H] of [['1440', 1440, 900], ['390', 390, 844]]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H } })
    if (lang === 'en') await ctx.addInitScript(() => localStorage.setItem('khalisni-language', 'en'))
    for (const [n, r] of PUBLIC) await shoot(ctx, `pub-${n}`, r, lang)
    await ctx.close()
  }
  // customer + admin @ 1440
  for (const [role, screens] of [['customer', CUSTOMER], ['admin', ADMIN]]) {
    const t = await tok(role)
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(([a, r, l]) => {
      localStorage.setItem('khalisni_access', a); localStorage.setItem('khalisni_refresh', r)
      localStorage.setItem('khalisni_auth_storage', 'local'); if (l === 'en') localStorage.setItem('khalisni-language', 'en')
    }, [t.access, t.refresh, lang])
    for (const [n, r] of screens) await shoot(ctx, `${role}-${n}`, r, lang)
    await ctx.close()
  }
}
// responsive matrix (ar) for the required screen list
for (const [w, W, H] of VPS) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 500, hasTouch: W < 500 })
  for (const [n, r] of RESP_ROUTES) await shoot(ctx, `resp-${n}`, r, 'ar')
  // one admin table at each viewport
  const t = await tok('admin')
  const actx = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 500, hasTouch: W < 500 })
  await actx.addInitScript(([a, r]) => { localStorage.setItem('khalisni_access', a); localStorage.setItem('khalisni_refresh', r); localStorage.setItem('khalisni_auth_storage', 'local') }, [t.access, t.refresh])
  await shoot(actx, 'resp-admin-orders', '/admin/orders', 'ar')
  await shoot(actx, 'resp-admin-service-form', '/admin/services', 'ar')
  await actx.close()
  await ctx.close()
}
await b.close()
writeFileSync('e2e-results/acceptance-visual.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ captured: report.captured.length, overflow: report.overflow, errors: report.errors }, null, 2))
