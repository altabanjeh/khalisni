// Is the closed mobile sidebar reachable by keyboard / screen readers at 390?
import { launch, ctx, settle, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const browser = await launch()
const c = await ctx(browser, { lang: 'ar', width: 390, height: 844, mobile: true }); const p = await c.newPage()
await uiLogin(p, WEB.A, QA('customer_a'), QA_PW); await p.goto(WEB.A + '/customer'); await settle(p, 1200)
const r = await p.evaluate(() => {
  const aside = document.querySelector('aside') || document.querySelector('nav[aria-label]')
  const els = [...(aside?.querySelectorAll('a,button') || [])]
  return { asideFound: !!aside, ariaHidden: aside?.getAttribute('aria-hidden'), inert: aside?.hasAttribute('inert'), visibility: aside && getComputedStyle(aside).visibility, display: aside && getComputedStyle(aside).display,
    focusable: els.length, offscreen: els.filter((e) => { const b = e.getBoundingClientRect(); return b.right <= 0 || b.left >= innerWidth }).length }
})
out('OFFCANVAS-results.json', r); console.log(JSON.stringify(r)); await browser.close()
