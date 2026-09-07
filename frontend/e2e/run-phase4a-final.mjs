/**
 * Phase 4A pass 2 — admin/employee operational-UX closure capture.
 * Screenshots the re-architected / re-localized admin + employee screens in
 * AR and EN, and checks that EN mode renders no Arabic characters on them.
 *
 *   node e2e/run-phase4a-final.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const B = process.env.E2E_BASE_URL || 'http://127.0.0.1:4319'
const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const DIR = 'e2e-results/phase4a-final'
mkdirSync(DIR, { recursive: true })

const AR_RE = /[؀-ۿ]/

const b = await chromium.launch({ channel: 'chrome', headless: true })

async function tok(role) {
  const pw = { admin: 'Admin@123', employee: 'Employee@123' }[role]
  const ctx = await b.newContext()
  const r = await ctx.request.post(`${API}/api/auth/login/`, { data: { email: `${role}@khalisni.local`, password: pw } })
  const json = await r.json()
  await ctx.close()
  return json
}

const adminTok = await tok('admin')
const employeeTok = await tok('employee')

// find real order ids for the order-detail screens
let orderId = null
let newOrderId = null
try {
  const ctx = await b.newContext()
  const res = await ctx.request.get(`${API}/api/admin/orders/`, {
    headers: { Authorization: `Bearer ${adminTok.access}` },
  })
  const data = await res.json()
  const rows = Array.isArray(data) ? data : data.results || []
  orderId = rows.find((r) => r.status === 'IN_PROGRESS')?.id ?? rows[0]?.id ?? null
  newOrderId = rows.find((r) => r.status === 'NEW')?.id ?? orderId
  await ctx.close()
} catch { /* leave null */ }

const ADMIN_SCREENS = [
  ['services', '/admin/services'],
  ['service-categories', '/admin/service-categories'],
  ['users', '/admin/users'],
  ['providers', '/admin/providers'],
  ['provider-services', '/admin/provider-services'],
  ['rules', '/admin/rules'],
  ['payments', '/admin/payments'],
  ['service-relations', '/admin/service-relations'],
  ['public-site', '/admin/public-site'],
  ['public-site-content', '/admin/public-site/content'],
  ['public-site-advertisements', '/admin/public-site/advertisements'],
  ['public-site-theme', '/admin/public-site/theme'],
  ['cms', '/admin/cms'],
  ['orders', '/admin/orders'],
  ['order-detail', orderId ? `/admin/orders/${orderId}` : '/admin/orders'],
]
const EMPLOYEE_SCREENS = [
  ['employee-home', '/employee'],
  ['employee-orders', '/employee/orders'],
  ['employee-order-detail', newOrderId ? `/employee/orders/${newOrderId}` : '/employee/orders'],
  ['employee-reports', '/employee/reports'],
  ['employee-service-relations', '/employee/service-relations'],
]
const COMPLEX = new Set(['services', 'rules', 'service-relations', 'public-site-content', 'public-site-advertisements'])

const report = { captured: [], enArabicLeak: [], overflow: [], errors: [], orderId, newOrderId }

async function shoot(token, name, route, lang, width, height) {
  const ctx = await b.newContext({
    viewport: { width, height },
    isMobile: width < 500,
    hasTouch: width < 500,
  })
  await ctx.addInitScript(([a, r, l]) => {
    localStorage.setItem('khalisni_access', a)
    localStorage.setItem('khalisni_refresh', r)
    localStorage.setItem('khalisni_auth_storage', 'local')
    localStorage.setItem('khalisni-language', l)
  }, [token.access, token.refresh, lang])

  const p = await ctx.newPage()
  const errs = []
  p.on('console', (m) => m.type() === 'error' && !/401|403|favicon/.test(m.text()) && errs.push(m.text().slice(0, 160)))
  p.on('pageerror', (e) => errs.push('PE:' + String(e).slice(0, 160)))
  await p.goto(B + route, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await p.waitForTimeout(1200)

  const of = await p.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth))
  if (of > 2) report.overflow.push(`${lang} ${name} @${width} = ${of}px`)
  if (errs.length) report.errors.push(`${lang} ${name} @${width}: ${errs[0]}`)

  if (lang === 'en') {
    const txt = (await p.locator('#root').innerText().catch(() => '')).trim()
    const leaks = txt.split('\n').map((s) => s.trim()).filter((s) => AR_RE.test(s))
    if (leaks.length) report.enArabicLeak.push({ screen: name, width, samples: leaks.slice(0, 6) })
  }

  await p.screenshot({ path: `${DIR}/${lang}-${name}-${width}.png`, fullPage: true }).catch(() => {})
  report.captured.push(`${lang}-${name}-${width}`)
  await p.close()
  await ctx.close()
}

for (const lang of ['ar', 'en']) {
  for (const [name, route] of ADMIN_SCREENS) {
    await shoot(adminTok, name, route, lang, 1440, 900)
    await shoot(adminTok, name, route, lang, 390, 844)
    if (COMPLEX.has(name)) {
      await shoot(adminTok, name, route, lang, 1024, 768)
      await shoot(adminTok, name, route, lang, 768, 1024)
    }
  }
  for (const [name, route] of EMPLOYEE_SCREENS) {
    await shoot(employeeTok, name, route, lang, 1440, 900)
    await shoot(employeeTok, name, route, lang, 390, 844)
  }
}

await b.close()
writeFileSync('e2e-results/phase4a-final/report.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  captured: report.captured.length,
  enArabicLeak: report.enArabicLeak,
  overflow: report.overflow,
  errors: report.errors,
  orderId,
  newOrderId,
}, null, 2))
