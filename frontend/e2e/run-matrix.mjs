/**
 * Direct Playwright runner for the Gate 1R runtime matrix.
 *
 * The @playwright/test CLI buffers output badly in this non-TTY harness, so this
 * script drives the browser library directly, prints one line per check, and
 * writes machine-readable JSON to e2e-results/matrix.json.
 *
 *   node e2e/run-matrix.mjs
 * Env: E2E_BASE_URL (default http://127.0.0.1:4319), E2E_API_URL (default :8009)
 */
import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFileSync, mkdirSync } from 'node:fs'

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'

const USERS = {
  admin: { email: 'admin@khalisni.local', password: 'Admin@123' },
  customer: { email: 'customer@khalisni.local', password: 'Customer@123' },
  employee: { email: 'employee@khalisni.local', password: 'Employee@123' },
  provider: { email: 'provider@khalisni.local', password: 'Provider@123' },
}

const PUBLIC = [
  '/', '/services', '/services/category/civil-status-and-passports', '/track-order',
  '/about', '/contact', '/faq', '/privacy', '/login', '/register', '/forgot-password', '/__unknown__',
]
const ROLE_ROUTES = {
  customer: ['/customer', '/customer/orders/new', '/customer/orders', '/customer/profile', '/customer/manual'],
  employee: ['/employee', '/employee/orders', '/employee/missing-service-requests', '/employee/documents/verify', '/employee/reports', '/employee/manual'],
  admin: ['/admin', '/admin/orders', '/admin/rules', '/admin/cms', '/admin/service-categories', '/admin/services',
    '/admin/service-relations', '/admin/public-site', '/admin/public-site/content', '/admin/public-site/advertisements',
    '/admin/public-site/theme', '/admin/public-site/preview', '/admin/missing-service-requests', '/admin/users',
    '/admin/providers', '/admin/provider-services', '/admin/payments', '/admin/reports', '/admin/notifications',
    '/admin/audit', '/admin/help-guides', '/admin/manual'],
  provider: ['/provider', '/provider/orders', '/provider/manual'],
}
const VIEWPORTS = [
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'laptop-1280', width: 1280, height: 800 },
  { name: 'ipad-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
]
const ERR_BOUNDARY = /something went wrong|حدث خطأ ما|application error|route error/i

async function tokensFor(request, role) {
  const r = await request.post(`${API}/api/auth/login/`, { data: USERS[role] })
  if (!r.ok()) throw new Error(`login ${role} -> ${r.status()}`)
  return r.json()
}

async function checkRoute(context, route, { a11y = false } = {}) {
  const page = await context.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!/401|favicon/i.test(t)) errs.push('console:' + t.slice(0, 200)) } })
  page.on('pageerror', (e) => errs.push('pageerror:' + String(e).slice(0, 200)))
  page.on('response', (r) => { if (r.status() >= 500) errs.push(`http${r.status()}:${r.url()}`) })
  page.on('requestfailed', (r) => { const t = r.failure()?.errorText || ''; if (!/favicon|ERR_ABORTED/i.test(t)) errs.push(`reqfail:${r.url()} ${t}`) })

  const res = { route, ok: false, http: null, rendered: false, overflowPx: null, dir: null, errors: [], a11y: null }
  try {
    const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 })
    res.http = resp?.status() ?? null
    await page.waitForFunction(() => {
      const r = document.querySelector('#root')
      return r && r.innerText && r.innerText.trim().length > 15
    }, { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(500)
    const text = (await page.locator('#root').innerText().catch(() => '')).trim()
    res.rendered = text.length > 30 && !ERR_BOUNDARY.test(text)
    res.dir = await page.getAttribute('html', 'dir')
    res.overflowPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
    if (a11y) {
      const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      res.a11y = a.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => `${v.id}(${v.impact})x${v.nodes.length}`)
    }
    res.errors = errs
    res.ok = (res.http < 400) && res.rendered && res.overflowPx <= 2 && errs.length === 0
  } catch (e) {
    res.errors = [...errs, 'exception:' + String(e).slice(0, 200)]
  } finally {
    await page.close()
  }
  return res
}

const out = { base: BASE, api: API, startedAt: new Date().toISOString(), routes: [], summary: {} }
mkdirSync('e2e-results', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  // Pass 1: every route at desktop-1440 + axe on the primary ones, per surface/role.
  const ctxAnon = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  for (const r of PUBLIC) {
    const res = await checkRoute(ctxAnon, r, { a11y: ['/', '/services', '/login', '/register', '/track-order', '/faq'].includes(r) })
    res.surface = 'public'; res.role = 'anon'; res.viewport = 'desktop-1440'
    out.routes.push(res)
    console.log(`[public/anon 1440] ${r} :: http=${res.http} rendered=${res.rendered} overflow=${res.overflowPx} dir=${res.dir} errs=${res.errors.length} ${res.ok ? 'OK' : 'FAIL ' + JSON.stringify(res.errors.slice(0, 2))}`)
  }
  await ctxAnon.close()

  for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
    const { access, refresh } = await tokensFor(browser.request ? browser.request : (await browser.newContext()).request, role).catch(async () => {
      const c = await browser.newContext(); const t = await tokensFor(c.request, role); await c.close(); return t
    })
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await ctx.addInitScript(([a, rr]) => {
      try { localStorage.setItem('khalisni_access', a); localStorage.setItem('khalisni_refresh', rr); localStorage.setItem('khalisni_auth_storage', 'local') } catch {}
    }, [access, refresh])
    for (const r of routes) {
      const res = await checkRoute(ctx, r, { a11y: r === `/${role}` })
      res.surface = role; res.role = role; res.viewport = 'desktop-1440'
      out.routes.push(res)
      console.log(`[${role} 1440] ${r} :: http=${res.http} rendered=${res.rendered} overflow=${res.overflowPx} dir=${res.dir} errs=${res.errors.length} ${res.ok ? 'OK' : 'FAIL ' + JSON.stringify(res.errors.slice(0, 2))}`)
    }
    await ctx.close()
  }

  // Pass 2: responsive matrix on representative routes across all viewports.
  const RESP_ROUTES = ['/', '/services', '/services/category/civil-status-and-passports', '/login', '/track-order']
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.width < 500, hasTouch: vp.width < 500 })
    for (const r of RESP_ROUTES) {
      const res = await checkRoute(ctx, r)
      res.surface = 'public'; res.role = 'anon'; res.viewport = vp.name
      out.routes.push(res)
      console.log(`[resp ${vp.name}] ${r} :: overflow=${res.overflowPx} rendered=${res.rendered} ${res.overflowPx <= 2 && res.rendered ? 'OK' : 'FAIL'}`)
    }
    await ctx.close()
  }
} finally {
  await browser.close()
}

const total = out.routes.length
const passed = out.routes.filter((r) => r.ok || (r.viewport !== 'desktop-1440' && r.overflowPx <= 2 && r.rendered)).length
const a11yRoutes = out.routes.filter((r) => Array.isArray(r.a11y))
const a11yClean = a11yRoutes.filter((r) => r.a11y.length === 0).length
out.summary = {
  totalChecks: total,
  passed,
  failed: total - passed,
  a11yRoutesScanned: a11yRoutes.length,
  a11yClean,
  a11yViolations: a11yRoutes.flatMap((r) => r.a11y.map((v) => `${r.route}: ${v}`)),
  overflowFails: out.routes.filter((r) => r.overflowPx > 2).map((r) => `${r.viewport} ${r.route} (${r.overflowPx}px)`),
  errorRoutes: out.routes.filter((r) => r.errors.length).map((r) => `${r.role}@${r.viewport} ${r.route}: ${r.errors[0]}`),
  finishedAt: new Date().toISOString(),
}
writeFileSync('e2e-results/matrix.json', JSON.stringify(out, null, 2))
console.log('\n=== SUMMARY ===')
console.log(JSON.stringify(out.summary, null, 2))
