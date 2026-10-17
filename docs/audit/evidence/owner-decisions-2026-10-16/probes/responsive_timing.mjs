// Times each page of the responsive spec: what is the page waiting for when h1 is late?
import { chromium } from 'file:///D:/ghassan/frontend/node_modules/playwright/index.mjs'
const BASE = process.env.E2E_BASE_URL, API = process.env.E2E_API_URL, PREFIX = 'client-audit-qa-202610'
const password = process.env.KHALSNI_QA_PASSWORD
const rounds = Number(process.env.ROUNDS || 1)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const login = async (role) => (await (await fetch(`${API}/api/auth/login/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: `${PREFIX}-${role}@example.test`, password }) })).json()).access
const tokens = {}; for (const r of ['customer_a', 'employee', 'admin', 'provider_a']) tokens[r] = await login(r)
const svc = await (await fetch(`${API}/api/services/${PREFIX}-service/`)).json()
const orders = await (await fetch(`${API}/api/admin/orders/?service=${svc.id}`, { headers: { Authorization: `Bearer ${tokens.admin}` } })).json()
const scenario = (orders.results || orders).find((o) => o.status === 'WAITING_CUSTOMER')
const pages = [['home', '/', null], ['services', '/services', null], ['search', '/services?search=audit', null], ['service', `/services/${PREFIX}-service`, null], ['register', '/register', null], ['login', '/login', null], ['tracking', '/track-order', null], ['customer', '/customer', 'customer_a'], ['missing', `/customer/orders/${scenario.id}/missing-docs`, 'customer_a'], ['employee', `/employee/orders/${scenario.id}`, 'employee'], ['admin', `/admin/orders/${scenario.id}`, 'admin'], ['provider', '/provider', 'provider_a']]
const rows = []
for (let round = 0; round < rounds; round++) for (const width of [390, 430, 768, 1366]) for (const [name, path, role] of pages) {
  const context = await browser.newContext({ baseURL: BASE, viewport: { width, height: width < 768 ? 844 : 900 }, isMobile: width < 768, hasTouch: width < 768 })
  const page = await context.newPage()
  await page.addInitScript(({ token }) => { localStorage.setItem('khalisni-language', 'ar'); if (token) { localStorage.setItem('khalisni_access', token); localStorage.setItem('khalisni_auth_storage', 'local') } }, { token: role ? tokens[role] : null })
  const reqs = []
  page.on('requestfinished', async (req) => { const t = req.timing(); reqs.push({ url: req.url(), ms: Math.round(t.responseEnd) }) })
  const t0 = Date.now()
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  const dcl = Date.now() - t0
  let h1 = -1, state = ''
  try { await page.locator('h1').first().waitFor({ state: 'visible', timeout: 30000 }); h1 = Date.now() - t0 } catch { state = (await page.locator('#root').innerText()).slice(0, 80).replace(/\s+/g, ' ') }
  const h1Count = await page.locator('h1').count()
  const chunks = reqs.filter((r) => r.url.includes('/assets/')), api = reqs.filter((r) => r.url.includes('/api/'))
  const slowChunk = chunks.sort((a, b) => b.ms - a.ms)[0], slowApi = api.sort((a, b) => b.ms - a.ms)[0]
  rows.push({ round, width, name, dcl, h1, h1Count, chunks: chunks.length, slowChunk: slowChunk ? `${slowChunk.ms}ms ${slowChunk.url.split('/').pop()}` : '', apiCalls: api.length, slowApi: slowApi ? `${slowApi.ms}ms ${slowApi.url.replace(API, '')}` : '', state })
  await context.close()
}
await browser.close()
for (const r of rows) console.log(JSON.stringify(r))
const late = rows.filter((r) => r.h1 < 0 || r.h1 > 12000)
console.log(`SUMMARY pages=${rows.length} max_h1=${Math.max(...rows.map((r) => r.h1))} over12s_or_missing=${late.length}`)
