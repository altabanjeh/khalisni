import { createRequire } from 'module'
import { launch, ctx, watch, settle, WEB, QA, QA_PW, DEMO, uiLogin, out } from './pw.mjs'
const require = createRequire('D:/ghassan/frontend/package.json')
const { AxeBuilder } = require('@axe-core/playwright')
const browser = await launch()
const R = []
const targets = [
  ['A', ['admin', QA('admin'), QA_PW], ['/admin/orders/5', '/admin/orders/4', '/admin/orders/2']],
  ['A', ['employee', QA('employee'), QA_PW], ['/employee/orders/5']],
  ['A', ['customer', QA('customer_a'), QA_PW], ['/customer/orders/5/missing-docs']],
  ['B', ['customer', ...DEMO.customer], ['/customer/orders/1/missing-docs']],
  ['B', ['admin', ...DEMO.admin], ['/admin/orders/1', '/admin/rules']],
]
for (const width of [1440, 390]) {
  for (const [env, [role, email, pw], routes] of targets) {
    const c = await ctx(browser, { width, height: 900, lang: 'ar', mobile: width < 500 }); const p = await c.newPage(); watch(p)
    await uiLogin(p, WEB[env], email, pw)
    for (const route of routes) {
      await p.goto(WEB[env] + route); await settle(p, 1500)
      if (route === '/admin/rules') { await p.getByText('قواعد سير العمل', { exact: true }).first().click(); await settle(p, 800) }
      const res = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
      const bad = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
      const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      R.push({ width, env, role, route, seriousOrCritical: bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 90)).join(' | ')}`), overflowX: overflow, console: [...p._audit.console] })
      p._audit.console.length = 0
    }
    await c.close()
  }
}
out('AXE-changed-screens.json', R)
for (const r of R) console.log(r.width, r.env, r.route, 'axe:', r.seriousOrCritical.length ? r.seriousOrCritical : 'clean', 'overflow:', r.overflowX, 'console:', r.console.length)
await browser.close()
