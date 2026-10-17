// Acceptance-audit harness (ran from frontend/e2e during the audit; kept here as evidence). Demo passwords come from env. Captures every major page at
// 1440 and 390 in AR and EN, plus objective per-page metrics, for the client UI audit.
import { test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const OUT = process.env.SHOT_DIR
const QA = process.env.KHALSNI_QA_PASSWORD
const WIDTHS = [1440, 390]
const LANGS = ['ar', 'en']
const results = []

const ACCOUNTS = {
  admin: ['admin@khalisni.local', process.env.DEMO_ADMIN_PASSWORD],
  customer: ['customer@khalisni.local', process.env.DEMO_CUSTOMER_PASSWORD],
  employee: ['employee@khalisni.local', process.env.DEMO_EMPLOYEE_PASSWORD],
  provider: ['provider@khalisni.local', process.env.DEMO_PROVIDER_PASSWORD],
  qa_customer: ['client-audit-qa-202610-customer_a@example.test', QA],
  qa_employee: ['client-audit-qa-202610-employee@example.test', QA],
  qa_provider: ['client-audit-qa-202610-provider_a@example.test', QA],
}

async function login(request, who) {
  const [email, password] = ACCOUNTS[who]
  const res = await request.post(`${API}/api/auth/login/`, { data: { email, password } })
  if (!res.ok()) throw new Error(`login ${who} ${res.status()}`)
  return res.json()
}

async function apiGet(request, token, url) {
  const res = await request.get(`${API}/api${url}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  return Array.isArray(body) ? body : body.results || body
}

const METRICS = () => {
  const root = document.querySelector('#root') || document.body
  const text = root.innerText || ''
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const rawCodes = [...new Set((text.match(/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/g) || []))]
  const arabicLines = lines.filter((l) => /[؀-ۿ]/.test(l))
  const latinOnly = lines.filter((l) => /[A-Za-z]{3,}/.test(l) && !/[؀-ۿ]/.test(l)
    && !/^[\w.+-]+@[\w.-]+$/.test(l) && !/^KH-\d/.test(l) && !/^(English|العربية|Khalsni|Khalisni)$/.test(l))
  const counts = {}
  lines.filter((l) => l.length > 25).forEach((l) => { counts[l] = (counts[l] || 0) + 1 })
  const dupes = Object.entries(counts).filter(([, n]) => n >= 3).map(([l, n]) => `${n}x ${l.slice(0, 90)}`)
  const flags = ['????', '.local', 'undefined', 'NaN', '[object', 'null'].filter((f) =>
    f === 'null' ? /(^|\s)null(\s|$)/.test(text) : text.includes(f))
  const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.offsetParent).map((i) => i.src.slice(-60))
  const small = []
  document.querySelectorAll('a,button,input,select,textarea,[role=button],[role=tab]').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return
    if (r.width < 24 || r.height < 24) small.push(`${el.tagName.toLowerCase()}:${(el.innerText || el.getAttribute('aria-label') || el.name || '').trim().slice(0, 30)} ${Math.round(r.width)}x${Math.round(r.height)}`)
  })
  const headings = [...document.querySelectorAll('h1,h2')].map((h) => h.innerText.trim()).filter(Boolean).slice(0, 4)
  return {
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    dir: document.documentElement.dir || getComputedStyle(document.body).direction,
    rawCodes, latinOnlyInAr: latinOnly.slice(0, 12), latinOnlyCount: latinOnly.length,
    arabicInEn: arabicLines.slice(0, 12), arabicInEnCount: arabicLines.length,
    dupes, flags, broken, smallTargets: small.slice(0, 15), smallTargetCount: small.length,
    headings, textLength: text.length, spinner: !!document.querySelector('[role=status][aria-busy=true], .animate-spin'),
  }
}

async function shoot(browser, { role, page: name, url, tokens }) {
  for (const width of WIDTHS) {
    for (const lang of LANGS) {
      const context = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 }, isMobile: width < 500, hasTouch: width < 500 })
      await context.addInitScript(([l, t]) => {
        try {
          localStorage.setItem('khalisni-language', l)
          if (t) {
            localStorage.setItem('khalisni_access', t.access)
            localStorage.setItem('khalisni_refresh', t.refresh)
            localStorage.setItem('khalisni_auth_storage', 'local')
          }
        } catch {}
      }, [lang, tokens || null])
      const page = await context.newPage()
      const errors = []
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)) })
      page.on('pageerror', (e) => errors.push(`pageerror ${String(e).slice(0, 160)}`))
      page.on('response', (r) => { if (r.status() >= 400 && r.url().includes('/api/')) errors.push(`${r.status()} ${r.url().replace(API, '')}`) })
      const file = `${role}-${name}-${lang}-${width}.png`
      let metrics = {}
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(700)
        metrics = await page.evaluate(METRICS)
        await page.screenshot({ path: path.join(OUT, file), fullPage: true })
      } catch (e) {
        metrics = { error: String(e).slice(0, 200) }
      }
      results.push({ file, role, page: name, url, lang, width, finalUrl: page.url().replace(/^https?:\/\/[^/]+/, ''), errors, ...metrics })
      await context.close()
    }
  }
}

test.setTimeout(60 * 60 * 1000)

test('acceptance screenshots', async ({ browser, request }) => {
  fs.mkdirSync(OUT, { recursive: true })
  const t = {}
  for (const who of Object.keys(ACCOUNTS)) t[who] = await login(request, who)

  const services = await apiGet(request, t.admin.access, '/services/')
  const cats = await apiGet(request, t.admin.access, '/services/categories/')
  const quote = services.find((s) => s.price_type && s.price_type !== 'fixed') || services[0]
  const fixed = services.find((s) => s.price_type === 'fixed') || services[1]
  const qaOrders = await apiGet(request, t.qa_customer.access, '/customer/orders/')
  const byStatus = (list, st) => list.find((o) => o.status === st)
  const missing = byStatus(qaOrders, 'WAITING_CUSTOMER')
  const ready = byStatus(qaOrders, 'READY_FOR_DELIVERY')
  const demoOrders = await apiGet(request, t.customer.access, '/customer/orders/')
  const completed = byStatus(demoOrders, 'COMPLETED') || byStatus(qaOrders, 'COMPLETED')
  const rejected = byStatus(demoOrders, 'REJECTED') || byStatus(demoOrders, 'CANCELLED')
  const adminOrders = await apiGet(request, t.admin.access, '/admin/orders/?page_size=100')
  const underReview = byStatus(qaOrders, 'UNDER_REVIEW') || byStatus(adminOrders, 'UNDER_REVIEW')
  const provOrders = await apiGet(request, t.qa_provider.access, '/provider/orders/')
  fs.writeFileSync(path.join(OUT, '_fixtures.json'), JSON.stringify({
    quote: quote?.slug, quotePrice: quote?.price_type, fixed: fixed?.slug, cat: cats[0]?.slug,
    missing: missing?.id, ready: ready?.id, completed: completed?.id, rejected: rejected?.id, underReview: underReview?.id,
    provider: provOrders.map((o) => [o.id, o.status]), demoStatuses: demoOrders.map((o) => o.status),
    adminCount: adminOrders.length,
  }, null, 2))

  const plan = [
    ['public', 'home', '/'], ['public', 'services', '/services'], ['public', 'category', `/services/category/${cats[0]?.slug}`],
    ['public', 'service-quote', `/services/${quote?.slug}`], ['public', 'service-fixed', `/services/${fixed?.slug}`],
    ['public', 'create-order', '/create-order'], ['public', 'track', '/track-order'], ['public', 'about', '/about'],
    ['public', 'contact', '/contact'], ['public', 'faq', '/faq'], ['public', 'privacy', '/privacy'],
    ['public', 'login', '/login'], ['public', 'register', '/register'], ['public', 'forgot', '/forgot-password'],
    ['public', 'reset-invalid', '/reset-password/invalid-token'], ['public', 'not-found', '/no-such-page'],
  ].map(([role, page, url]) => ({ role, page, url }))
  const auth = (role, who, page, url) => plan.push({ role, page, url, tokens: t[who] })
  auth('customer', 'qa_customer', 'dashboard', '/customer')
  auth('customer', 'qa_customer', 'orders', '/customer/orders')
  if (missing) auth('customer', 'qa_customer', 'order-waiting', `/customer/orders/${missing.id}`)
  if (missing) auth('customer', 'qa_customer', 'missing-docs', `/customer/orders/${missing.id}/missing-docs`)
  if (ready) auth('customer', 'qa_customer', 'order-ready', `/customer/orders/${ready.id}`)
  if (completed) auth('customer', 'customer', 'order-completed', `/customer/orders/${completed.id}`)
  if (rejected) auth('customer', 'customer', 'order-rejected', `/customer/orders/${rejected.id}`)
  auth('customer', 'qa_customer', 'new-order', '/customer/orders/new')
  auth('customer', 'qa_customer', 'profile', '/customer/profile')
  auth('customer', 'customer', 'dashboard-demo', '/customer')
  for (const [p, u] of [['dashboard', '/employee'], ['queue', '/employee/orders'], ['verify-docs', '/employee/documents/verify'],
    ['missing-service', '/employee/missing-service-requests'], ['reports', '/employee/reports'],
    ['categories', '/employee/service-categories'], ['relations', '/employee/service-relations']]) auth('employee', 'qa_employee', p, u)
  if (underReview) auth('employee', 'qa_employee', 'order-review', `/employee/orders/${underReview.id}`)
  for (const [p, u] of [['overview', '/admin'], ['orders', '/admin/orders'], ['rules', '/admin/rules'], ['cms', '/admin/cms'],
    ['categories', '/admin/service-categories'], ['services', '/admin/services'], ['relations', '/admin/service-relations'],
    ['public-site', '/admin/public-site'], ['public-content', '/admin/public-site/content'], ['ads', '/admin/public-site/advertisements'],
    ['theme', '/admin/public-site/theme'], ['preview', '/admin/public-site/preview'], ['missing-service', '/admin/missing-service-requests'],
    ['users', '/admin/users'], ['providers', '/admin/providers'], ['provider-services', '/admin/provider-services'],
    ['reports', '/admin/reports'], ['notifications', '/admin/notifications'], ['payments', '/admin/payments'],
    ['audit', '/admin/audit'], ['help-guides', '/admin/help-guides']]) auth('admin', 'admin', p, u)
  if (ready) auth('admin', 'admin', 'order-detail', `/admin/orders/${ready.id}`)
  auth('provider', 'qa_provider', 'dashboard', '/provider')
  auth('provider', 'qa_provider', 'orders', '/provider/orders')
  if (provOrders[0]) auth('provider', 'qa_provider', 'order-detail', `/provider/orders/${provOrders[0].id}`)

  const only = process.env.SHOT_ONLY
  for (const item of plan) {
    if (only && !only.split(',').includes(item.role)) continue
    await shoot(browser, item)
    fs.writeFileSync(path.join(OUT, '_metrics.json'), JSON.stringify(results, null, 1))
  }
})
