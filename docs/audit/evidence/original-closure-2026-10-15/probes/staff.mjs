import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, DEMO, uiLogin, out } from './pw.mjs'
const browser = await launch()
const R = {}
const grab = (t, re, n = 600) => { const i = t.search(re); return i < 0 ? null : t.slice(i, i + n) }

// ---------------- employee F03/F04 ----------------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('employee'), QA_PW)
  for (const id of [5, 6, 7, 9, 1]) {
    await p.goto(WEB.A + '/employee/orders/' + id); await settle(p, 1200)
    const i = await snap(p, `F03-F04-A-employee-order${id}`)
    R['emp_' + id] = {
      readyClaims: (i.text.match(/جاهز الآن[^\n]*|المتطلبات مكتملة[^\n]*|اختر مزوداً[^\n]*|جاهز للإسناد[^\n]*/g) || []),
      blockers: (i.text.match(/(لم يتم رفعه|لم يُرفع|غير مرفوع|بانتظار التحقق|مرفوض|معتمد|مقبول|بانتظار الرفع)[^\n]*/g) || []).slice(0, 12),
      english: [...new Set((i.text.match(/[A-Za-z][A-Za-z' .:-]{6,}/g) || []).filter((x) => !/English|KH-|example|@/.test(x)))].slice(0, 15),
      codes: /client-audit-qa-202610-authorization|authorization-letter|national-id/.test(i.text),
      assignDisabled: await p.locator('button', { hasText: /إسناد|تعيين مزود|أرسل الطلب/ }).first().isDisabled().catch(() => 'n/a'),
      reqSection: grab(i.text, /المتطلبات|جاهزية/, 900),
    }
  }
  await c.close()
}
// ---------------- admin F05 / U01 ----------------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('admin'), QA_PW)
  for (const id of [5, 6, 7, 8, 4, 1]) {
    await p.goto(WEB.A + '/admin/orders/' + id); await settle(p, 1200)
    const i = await snap(p, `F05-A-admin-order${id}`)
    const sel = await p.evaluate(() => [...document.querySelectorAll('main select')].map((s) => ({ label: s.getAttribute('aria-label') || s.id, disabled: s.disabled, options: [...s.options].map((o) => o.value + ':' + o.text) })))
    R['admin_' + id] = {
      selects: sel,
      buttons: await p.evaluate(() => [...document.querySelectorAll('main button')].map((b) => (b.innerText.trim() || b.getAttribute('aria-label')) + (b.disabled ? ' [disabled]' : '')).filter(Boolean)),
      blockedText: (i.text.match(/[^\n]*(Requested documents|No valid|Role '|Required documents|A verified|غير متاح|محظور|لا يمكن|يتطلب|مطلوب رفع)[^\n]*/g) || []).slice(0, 10),
    }
  }
  await p.goto(WEB.A + '/admin/rules'); await settle(p, 1500)
  const ri = await snap(p, 'F05-A-admin-rules')
  R.rules_page = { hasWaitingCustomer: /انتظار العميل|بانتظار العميل|WAITING_CUSTOMER|Waiting customer/.test(ri.text), excerpt: grab(ri.text, /انتظار العميل|Waiting customer/, 1200) }
  await c.close()
}
// ---------------- U01 admin header at widths ----------------
for (const w of [390, 430, 768, 1366]) {
  const c = await ctx(browser, { width: w, height: w < 800 ? 844 : 900, lang: 'ar', mobile: w < 800 }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('admin'), QA_PW)
  await p.goto(WEB.A + '/admin'); await settle(p, 1500)
  const m = await p.evaluate(() => {
    const h = document.querySelector('header'); const r = h.getBoundingClientRect()
    const vis = [...h.querySelectorAll('button,a')].filter((b) => b.offsetParent && b.getBoundingClientRect().height > 0).map((b) => (b.getAttribute('aria-label') || b.innerText.trim()).slice(0, 30))
    const firstStat = [...document.querySelectorAll('main h1, main h2, main [class*="stat"], main section')].find((e) => e.getBoundingClientRect().top > r.bottom)
    return { headerHeight: Math.round(r.height), headerBottom: Math.round(r.bottom), viewport: innerHeight, pctViewport: Math.round(r.height / innerHeight * 100), visibleControls: vis, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth, firstContentTop: firstStat ? Math.round(firstStat.getBoundingClientRect().top) : null }
  })
  await snap(p, `U01-admin-${w}`, { full: false })
  // open the more-options menu
  const more = p.locator('header button[aria-expanded]').nth(1)
  if (await more.isVisible().catch(() => false)) { await more.click(); await p.waitForTimeout(500); await snap(p, `U01-admin-${w}-menu-open`, { full: false }); m.menuItems = await p.evaluate(() => [...document.querySelectorAll('header div.flex-col button, header div.flex-col a')].filter((b) => b.offsetParent).map((b) => b.innerText.trim().slice(0, 25))) }
  R['U01_' + w] = m
  await c.close()
}
out('STAFF-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
