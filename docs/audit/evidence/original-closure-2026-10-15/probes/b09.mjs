import { launch, ctx, watch, settle, WEB, QA, QA_PW, DEMO, uiLogin, out, EV } from './pw.mjs'
import path from 'path'
const engines = (process.argv[2] || 'chromium,webkit').split(',')
const widths = [390, 430, 768, 1366]
const pages = [
  ['public', 'B', null, '/'], ['public', 'B', null, '/services'], ['public', 'B', null, '/services/business_company_registration'],
  ['public', 'B', null, '/login'], ['public', 'B', null, '/register'], ['public', 'A', null, '/track-order'],
  ['customer', 'A', 'customer_a', '/customer/orders/new'], ['customer', 'A', 'customer_a', '/customer/orders/5/missing-docs'],
  ['customer', 'A', 'customer_a', '/customer/orders/11'], ['customer', 'A', 'customer_a', '/customer'],
  ['employee', 'A', 'employee', '/employee/orders/6'], ['employee', 'A', 'employee', '/employee/documents/verify'],
  ['provider', 'A', 'provider_a', '/provider/orders/8'], ['provider', 'A', 'provider_a', '/provider/orders'],
  ['admin', 'A', 'admin', '/admin'], ['admin', 'A', 'admin', '/admin/orders/6'], ['admin', 'A', 'admin', '/admin/orders'], ['admin', 'A', 'admin', '/admin/rules'],
]
const rows = []; const latin = {}
for (const engine of engines) {
  const browser = await launch(engine)
  for (const w of widths) {
    const cache = {}
    for (const [group, env, role, route] of pages) {
      const key = env + (role || 'anon')
      if (!cache[key]) {
        const c = await ctx(browser, { width: w, height: w < 800 ? 844 : 900, lang: 'ar', mobile: w < 800 && engine === 'chromium' })
        const p = await c.newPage(); watch(p)
        if (role) await uiLogin(p, WEB[env], QA(role), QA_PW)
        cache[key] = p
      }
      const p = cache[key]; p._audit.console.length = 0
      let err = null
      try { await p.goto(WEB[env] + route); await settle(p, 1200) } catch (e) { err = String(e).slice(0, 120) }
      const m = await p.evaluate(() => {
        const vw = document.documentElement.clientWidth
        const clipped = [...document.querySelectorAll('main *, header *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > vw + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('[class*="overflow-x-auto"],[class*="kh-rail"],table') }).length
        const small = [...document.querySelectorAll('button, a, input, select')].filter((e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width > 0 && (r.height < 24 || r.width < 24) }).length
        return { overflowX: document.documentElement.scrollWidth - vw, clipped, smallTargets: small, dir: document.documentElement.dir, text: document.body.innerText, path: location.pathname }
      })
      const name = `B09-${engine}-${w}-${group}-${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home'}`
      const bad = m.overflowX > 0 || m.clipped > 0 || p._audit.console.length || err
      if (bad || w === 390 || (w === 1366 && engine === 'chromium')) await p.screenshot({ path: path.join(EV, 'b09', name + '.png'), fullPage: false }).catch(() => {})
      rows.push({ engine, w, group, route, landed: m.path, overflowX: m.overflowX, clipped: m.clipped, smallTargets: m.smallTargets, dir: m.dir, console: p._audit.console.slice(0, 3), err, shot: bad || w === 390 || (w === 1366 && engine === 'chromium') ? name + '.png' : null })
      if (engine === 'chromium' && w === 1366) {
        const runs = (m.text.replace(/\S+@\S+/g, '').match(/[A-Za-z][A-Za-z'’\-]*(?:[ .:][A-Za-z][A-Za-z'’\-]*)*/g) || []).filter((x) => x.length > 2 && !/^(English|KH|PDF|JOD|QA)$/.test(x))
        latin[`${env}${route}`] = [...new Set(runs)]
      }
    }
    for (const p of Object.values(cache)) await p.context().close()
  }
  await browser.close()
}
out(`B09-matrix-${engines.join('_')}.json`, rows)
out(`D03-latin-scan.json`, latin)
const fails = rows.filter((r) => r.overflowX > 0 || r.clipped > 0 || r.console.length || r.err)
console.log('cases', rows.length, 'fails', fails.length)
console.log(JSON.stringify(fails, null, 1).slice(0, 6000))
