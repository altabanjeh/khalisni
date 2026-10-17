// P2 UI checks: localization scan, user status column, service list reachability, axe, footer targets.
// TAG=before|after selects the evidence names. WEB_A/WEB_B pick the builds.
import { createRequire } from 'module'
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, DEMO, TAG, uiLogin, out } from './pw.mjs'
const require = createRequire('D:/ghassan/frontend/package.json')
const { AxeBuilder } = require('@axe-core/playwright')
const browser = await launch()
const R = { localization: [], users: null, services: null, axe: [], footer: [] }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Strings that are system-generated and must not appear in Arabic mode.
const SYSTEM_EN = [
  'NEW', 'WAITING_CUSTOMER', 'ASSIGNED', 'COMPLETED', 'UNDER_REVIEW', 'IN_PROGRESS', 'READY_FOR_DELIVERY',
  'Approved', 'Pending review', 'Order assigned to provider', 'Provider completed work and uploaded final result',
  'Customer uploaded all requested missing documents', 'Order under review', 'Order completed', 'Order submitted',
  'Final document uploaded', 'Expected completion', 'client-audit-qa-202610-authorization', 'final-result',
  'Order received', 'Final result uploaded', 'More documents required', 'New assigned order', 'was created successfully',
  'Required documents are incomplete',
]
function systemLeaks(text) {
  return SYSTEM_EN.filter((s) => new RegExp(`(^|[^A-Za-z_-])${s.replace(/[-]/g, '\\-')}([^A-Za-z_-]|$)`).test(text))
}
async function axe(page, route, label) {
  const res = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  const bad = res.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
  R.axe.push({ label, route, violations: bad.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ html: n.html.slice(0, 140), summary: (n.failureSummary || '').slice(0, 200) })) })) })
}

// ---- env A (fresh QA seed) ----
const pages = [
  ['admin', [QA('admin'), QA_PW], ['/admin', '/admin/orders', '/admin/orders/6', '/admin/orders/8', '/admin/rules', '/admin/services']],
  ['employee', [QA('employee'), QA_PW], ['/employee/documents/verify', '/employee/orders/6', '/employee/orders/8']],
  ['provider', [QA('provider_a'), QA_PW], ['/provider/orders/8']],
  ['customer', [QA('customer_a'), QA_PW], ['/customer/orders/8', '/customer/orders/5/missing-docs']],
]
for (const width of [1440, 390]) {
  for (const [role, [email, pw], routes] of pages) {
    const c = await ctx(browser, { width, height: 900, lang: 'ar', mobile: width < 500 }); const p = await c.newPage(); watch(p)
    await uiLogin(p, WEB.A, email, pw)
    for (const route of routes) {
      await p.goto(WEB.A + route); await settle(p, 1500)
      if (route === '/admin/orders') { await p.locator('button').filter({ hasText: 'قيد المراجعة' }).first().click().catch(() => {}); await settle(p, 600) }
      if (route === '/employee/documents/verify') { await p.locator('button').filter({ hasText: 'KH-' }).first().click().catch(() => {}); await settle(p, 600) }
      const name = `P2-${TAG}-${width}-A-${role}${route.replace(/\//g, '_')}`
      const info = width === 1440 ? await snap(p, name) : await p.evaluate(() => ({ text: document.body.innerText }))
      const svgText = await p.evaluate(() => [...document.querySelectorAll('svg text, svg tspan')].map((n) => n.textContent).join(' | '))
      if (width === 1440) R.localization.push({ env: 'A', role, route, leaks: systemLeaks(info.text + '\n' + svgText), chartTicks: svgText.slice(0, 300) })
      await axe(p, route, `${width}-A-${role}`)
    }
    await c.close()
  }
}

// ---- env B (migrated legacy copy) ----
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.B, ...DEMO.customer)
  await p.goto(WEB.B + '/customer'); await settle(p, 1200)
  await p.locator('header button[aria-label="الإشعارات"]').first().click().catch(() => {}); await settle(p, 1200)
  const info = await snap(p, `P2-${TAG}-1440-B-customer-bell`)
  R.localization.push({ env: 'B', role: 'customer', route: '/customer (bell)', leaks: systemLeaks(info.text) })
  for (const route of ['/customer/orders/3', '/customer/orders/1']) {
    await p.goto(WEB.B + route); await settle(p, 1200)
    const i2 = await snap(p, `P2-${TAG}-1440-B-customer${route.replace(/\//g, '_')}`)
    R.localization.push({ env: 'B', role: 'customer', route, leaks: systemLeaks(i2.text) })
  }
  await c.close()
}
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.B, ...DEMO.admin)
  // users table (B10-8)
  await p.goto(WEB.B + '/admin/users'); await settle(p, 1500)
  const ui = await snap(p, `P2-${TAG}-1440-B-admin-users`)
  R.users = {
    verifiedBadges: (ui.text.match(/تم التحقق/g) || []).length,
    activeBadges: (ui.text.match(/(^|\s)نشط(\s|$)/gm) || []).length,
    notVerified: (ui.text.match(/غير موثّق|غير متحقق/g) || []).length,
    rowsText: ui.text.split('\n').filter((l) => /@/.test(l)).length,
  }
  // services list (B10-6)
  await p.goto(WEB.B + '/admin/services'); await settle(p, 1800)
  const sv = await snap(p, `P2-${TAG}-1440-B-admin-services`)
  const svcSection = p.locator('section', { has: p.getByRole('heading', { name: 'الخدمات', exact: true }) }).first()
  R.services = {
    servicesPageRows: await svcSection.locator('tbody tr').count().catch(() => -1),
    servicesPaginationText: (sv.text.match(/عرض \d+ - \d+ من \d+/g) || []),
  }
  // Walk the services table page by page (fixed build has a pager).
  const seenServices = new Set()
  const servicesRegion = p.getByRole('region', { name: 'جدول الخدمات' })
  for (let guard = 0; guard < 5; guard += 1) {
    const names = await (await servicesRegion.count() ? servicesRegion : svcSection).locator('tbody tr td:first-child').allInnerTexts()
    names.forEach((n, i) => seenServices.add(`${guard}:${i}:${n}`))
    const next = p.getByRole('button', { name: 'الصفحة التالية' }).first()
    if (!(await next.count()) || await next.isDisabled()) break
    await next.click(); await settle(p, 1200)
  }
  R.services.servicesRowsAcrossPages = seenServices.size
  R.services.servicesPaginationAfterWalk = ((await p.evaluate(() => document.body.innerText)).match(/عرض \d+ - \d+ من \d+/g) || [])
  if (TAG === 'after') {
    await snap(p, `P2-${TAG}-1440-B-admin-services-page2`)
    // search narrows on the server and restarts at page 1
    await p.getByTestId('admin-services-search').fill('جواز'); await settle(p, 1500)
    R.services.searchJawazRows = await servicesRegion.locator('tbody tr').count()
    R.services.searchPagination = ((await p.evaluate(() => document.body.innerText)).match(/عرض \d+ - \d+ من \d+/g) || [])
    await p.getByTestId('admin-services-search').fill(''); await settle(p, 1200)
    // English layout of the pager
    await p.evaluate(() => localStorage.setItem('khalisni-language', 'en')); await p.reload(); await settle(p, 1800)
    R.services.englishPager = ((await p.evaluate(() => document.body.innerText)).match(/Showing \d+–\d+ of \d+/g) || [])
    await snap(p, `P2-${TAG}-1440-B-admin-services-en`)
    await p.setViewportSize({ width: 390, height: 844 }); await settle(p, 800)
    R.services.mobileOverflowX = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    R.services.mobilePager = ((await p.evaluate(() => document.body.innerText)).match(/Showing \d+–\d+ of \d+/g) || [])
    await snap(p, `P2-${TAG}-390-B-admin-services-en`, { full: false })
    await p.setViewportSize({ width: 1366, height: 900 })
    await p.evaluate(() => localStorage.setItem('khalisni-language', 'ar'))
  }
  await p.goto(WEB.B + '/admin/rules'); await settle(p, 1800)
  R.services.rulesServicesRows = await p.locator('tbody tr').count()
  const rs = await snap(p, `P2-${TAG}-1440-B-admin-rules-services`)
  R.services.rulesServicesPaginationText = rs.text.match(/عرض \d+ - \d+ من \d+/g) || []
  R.services.rulesUsesEnglishDuration = /Expected completion/.test(rs.text)
  await p.locator('button', { hasText: 'المستندات المطلوبة' }).first().click(); await settle(p, 1200)
  R.services.rulesDocumentsRows = await p.locator('tbody tr').count()
  const rd = await snap(p, `P2-${TAG}-1440-B-admin-rules-documents`)
  R.services.rulesDocumentsPaginationText = rd.text.match(/عرض \d+ - \d+ من \d+/g) || []
  for (const tab of ['قواعد سير العمل', 'الخدمات والأسعار', 'المستندات المطلوبة']) {
    await p.locator('button', { hasText: tab }).first().click(); await settle(p, 1000)
    await axe(p, '/admin/rules#' + tab, '1440-B-admin')
    await p.setViewportSize({ width: 390, height: 844 }); await settle(p, 600)
    await axe(p, '/admin/rules#' + tab, '390-B-admin')
    await p.setViewportSize({ width: 1366, height: 900 }); await settle(p, 600)
  }
  // keyboard: every scrollable table region must be reachable with Tab
  await p.locator('button', { hasText: 'قواعد سير العمل' }).first().click(); await settle(p, 800)
  R.scrollRegions = await p.evaluate(() => [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el); return /(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
  }).map((el) => ({ cls: el.className.slice(0, 80), tabIndex: el.tabIndex, role: el.getAttribute('role'), label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '' })))
  await c.close()
}

// ---- footer touch targets (public, 390) ----
for (const lang of ['ar', 'en']) {
  const c = await ctx(browser, { width: 390, height: 844, lang, mobile: true }); const p = await c.newPage(); watch(p)
  await p.goto(WEB.A + '/'); await settle(p, 1500)
  const targets = await p.evaluate(() => [...document.querySelectorAll('footer a, footer button')].map((a) => {
    const r = a.getBoundingClientRect(); return { text: a.innerText.trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }
  }))
  R.footer.push({ lang, targets, undersized: targets.filter((t) => t.h < 24 || t.w < 24) })
  await axe(p, '/', `390-A-public-${lang}`)
  await c.close()
}
out(`P2-ui-${TAG}.json`, R)
console.log(JSON.stringify({
  localization: R.localization.map((x) => `${x.env} ${x.route}: ${x.leaks.join(', ') || 'clean'}`),
  users: R.users, services: R.services, scrollRegions: R.scrollRegions,
  axe: R.axe.filter((a) => a.violations.length).map((a) => `${a.label} ${a.route}: ${a.violations.map((v) => v.id + ' x' + v.nodes.length).join(', ')}`),
  footer: R.footer.map((f) => `${f.lang}: ${f.undersized.length}/${f.targets.length} undersized`),
}, null, 1))
await browser.close()
