import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = 'http://127.0.0.1:8009/api'
const browser = await launch()
const R = {}
const home = { customer_a: '/customer', employee: '/employee', admin: '/admin', provider_a: '/provider' }
const foreign = { customer_a: ['/admin', '/employee/orders', '/provider/orders'], provider_a: ['/customer', '/admin/orders', '/employee'], employee: ['/admin/users', '/provider', '/customer'], admin: ['/provider/orders', '/customer'] }
for (const role of Object.keys(home)) {
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  const r = {}
  await uiLogin(p, BASE, QA(role), QA_PW); r.landing = new URL(p.url()).pathname
  await p.goto(BASE + home[role]); await settle(p, 800); await p.reload(); await settle(p, 1200)
  r.afterRefresh = new URL(p.url()).pathname
  r.foreign = {}
  for (const f of foreign[role]) { await p.goto(BASE + f); await settle(p, 900); r.foreign[f] = new URL(p.url()).pathname }
  // logout via menu
  await p.goto(BASE + home[role]); await settle(p, 900)
  const more = p.locator('header button[aria-expanded]').nth(1)
  if (await more.isVisible().catch(() => false)) await more.click()
  await p.locator('button', { hasText: 'تسجيل الخروج' }).first().click(); await settle(p, 1200)
  r.afterLogout = new URL(p.url()).pathname
  await p.goto(BASE + home[role]); await settle(p, 1000); r.protectedAfterLogout = new URL(p.url()).pathname
  r.storageAfterLogout = await p.evaluate(() => Object.keys(sessionStorage).concat(Object.keys(localStorage)).filter((k) => /access|refresh/.test(k)))
  await uiLogin(p, BASE, QA(role), QA_PW); r.relogin = new URL(p.url()).pathname
  // simulated expired/invalid session
  await p.evaluate(() => { for (const s of [sessionStorage, localStorage]) for (const k of Object.keys(s)) if (/access|refresh/.test(k)) s.setItem(k, 'expired.invalid.token') })
  await p.goto(BASE + home[role]); await settle(p, 2000); r.invalidTokenLandsOn = new URL(p.url()).pathname
  await snap(p, `B03-${role}-invalid-session`, { full: false })
  R[role] = r
  await c.close()
}
// inactive user: register throwaway, log in, admin deactivates, old token + new login
const em = `qa-b03-inactive-${Date.now()}@example.test`
await fetch(API + '/auth/register/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: 'QA Inactive', phone: '0797' + String(Date.now()).slice(-6), email: em, password: 'Strong-Pass-2026!' }) })
const lg = await (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Strong-Pass-2026!' }) })).json()
const adm = await (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA('admin'), password: QA_PW }) })).json()
const pat = await fetch(`${API}/admin/users/${lg.user.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adm.access }, body: JSON.stringify({ is_active: false }) })
R.inactive = {
  deactivate: pat.status,
  oldAccessTokenMe: (await fetch(API + '/auth/me/', { headers: { Authorization: 'Bearer ' + lg.access } })).status,
  oldRefresh: (await fetch(API + '/auth/token/refresh/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh: lg.refresh }) })).status,
  newLogin: (await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em, password: 'Strong-Pass-2026!' }) })).status,
}
out('B03-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
