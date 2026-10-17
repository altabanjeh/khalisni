import { launch, ctx, watch, settle, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const b = await launch(); const R = {}
for (const [env, role, route] of [['B', null, '/services/business_company_registration'], ['A', 'customer_a', '/customer/orders/5/missing-docs'], ['A', 'provider_a', '/provider/orders/8']]) {
  const c = await ctx(b, { width: 390, height: 844, lang: 'ar', mobile: true }); const p = await c.newPage(); watch(p)
  if (role) await uiLogin(p, WEB[env], QA(role), QA_PW)
  await p.goto(WEB[env] + route); await settle(p, 1200)
  R[route] = await p.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter((e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width > 0 && (r.height < 24 || r.width < 24) }).map((e) => { const r = e.getBoundingClientRect(); return `${e.tagName} ${Math.round(r.width)}x${Math.round(r.height)} "${(e.innerText || e.getAttribute('aria-label') || e.type || '').trim().slice(0, 30)}" inFooter=${!!e.closest('footer')}` }))
  await c.close()
}
out('B09-touch-targets-390.json', R); console.log(JSON.stringify(R, null, 1)); await b.close()
