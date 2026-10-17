import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const BASE = WEB.A, API = 'http://127.0.0.1:8009/api'
const R = {}
const browser = await launch()
const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
await uiLogin(p, BASE, QA('customer_b'), QA_PW)
// F01 cross-check: bell unread line vs API unread-count
const tok = await p.evaluate(() => sessionStorage.getItem('khalisni_access') || localStorage.getItem('khalisni_access'))
const api = async (u) => (await fetch(API + u, { headers: { Authorization: 'Bearer ' + tok } })).json()
await p.goto(BASE + '/customer'); await settle(p, 1200)
await p.locator('button[aria-haspopup="dialog"]').first().click(); await p.waitForTimeout(700)
R.F01_bellUnreadLine = (await p.evaluate(() => (document.body.innerText.match(/غير المقروءة: *[0-9٠-٩]+/) || [''])[0]))
R.F01_apiUnreadCount = await api('/notifications/unread-count/')
await p.keyboard.press('Escape')
// B07 drafts
const [, svcs] = [0, await (await fetch(API + '/services/')).json()]
const svc = svcs.find((s) => s.slug === 'client-audit-qa-202610-service')
await p.goto(`${BASE}/customer/orders/new?service=${svc.id}`); await settle(p, 1200)
const next = () => p.locator('button', { hasText: /^التالي$/ }).first()
for (let i = 0; i < 5 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click(); await settle(p, 400) }
await p.locator('input[name="full_name"]').fill('Draft Persist QA')
await p.locator('input[name="city"]').fill('Zarqa')
const saveDraft = p.locator('button', { hasText: 'حفظ كمسودة' }).first()
R.B07_saveDraftButton = await saveDraft.count()
if (R.B07_saveDraftButton) { await saveDraft.click(); await settle(p, 700) }
await p.reload(); await settle(p, 1500)
for (let i = 0; i < 5 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click().catch(() => {}); await settle(p, 400) }
R.B07_afterReload = { full_name: await p.locator('input[name="full_name"]').inputValue().catch(() => null), city: await p.locator('input[name="city"]').inputValue().catch(() => null) }
await snap(p, 'B07-draft-after-reload', { full: false })
R.B07_draftKeys = await p.evaluate(() => Object.keys(localStorage).filter((k) => /draft|submission/i.test(k)))
// logout then re-login: is draft kept or cleared (as designed)?
const more = p.locator('header button[aria-expanded]').nth(1)
if (await more.isVisible().catch(() => false)) await more.click()
await p.locator('button', { hasText: 'تسجيل الخروج' }).first().click(); await settle(p, 1000)
R.B07_draftKeysAfterLogout = await p.evaluate(() => Object.keys(localStorage).filter((k) => /draft|submission/i.test(k)))
await uiLogin(p, BASE, QA('customer_b'), QA_PW)
await p.goto(`${BASE}/customer/orders/new?service=${svc.id}`); await settle(p, 1200)
for (let i = 0; i < 5 && !(await p.locator('input[name="full_name"]').isVisible().catch(() => false)); i++) { await next().click().catch(() => {}); await settle(p, 400) }
R.B07_afterRelogin = { full_name: await p.locator('input[name="full_name"]').inputValue().catch(() => null) }
// other customer must not see this draft (shared browser)
out('DRAFT-F01-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
