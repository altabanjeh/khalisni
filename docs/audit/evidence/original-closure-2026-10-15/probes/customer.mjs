import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, DEMO, uiLogin, out } from './pw.mjs'
const browser = await launch()
const R = {}

async function bellState(p) {
  const bell = p.locator('button[aria-haspopup="dialog"]').first()
  await bell.click(); await p.waitForTimeout(700)
  const st = await p.evaluate(() => {
    const panel = [...document.querySelectorAll('div')].find((d) => /غير المقروءة|Unread/.test(d.innerText) && d.querySelectorAll('button').length && d.getBoundingClientRect().height < 900)
    const txt = panel ? panel.innerText : ''
    return { unreadLine: (txt.match(/غير المقروءة[^\n]*/) || [''])[0], items: panel ? [...panel.querySelectorAll('button')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()).filter((t) => t.length > 10) : [], empty: /لا توجد إشعارات/.test(document.body.innerText) }
  })
  return st
}

// ---------------- F01 env A customer_a ----------------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('customer_a'), QA_PW)
  await p.goto(WEB.A + '/customer'); await settle(p, 1200)
  await snap(p, 'F01-A-customer-dashboard')
  const dash = await p.evaluate(() => {
    const h = [...document.querySelectorAll('h2,h3')].find((x) => /الإشعارات|آخر الإشعارات/.test(x.innerText))
    const sec = h ? h.closest('section') || h.parentElement.parentElement : null
    return { heading: h?.innerText, text: sec ? sec.innerText.slice(0, 1200) : null, clickable: sec ? sec.querySelectorAll('a,button').length : null }
  })
  R.F01_dashboard = dash
  R.F01_bell_open = await bellState(p)
  await snap(p, 'F01-A-bell-open', { full: false })
  // click the first missing-doc item in the bell
  const item = p.locator('button', { hasText: /مستند|مستندات|نواقص/ }).first()
  if (await item.count()) {
    await item.click(); await settle(p, 900); R.F01_after_click_url = p.url()
    await snap(p, 'F01-A-after-bell-click', { full: false })
  }
  R.F01_bell_after_click = await bellState(p)
  await p.reload(); await settle(p, 1200)
  R.F01_bell_after_reload = await bellState(p)
  await snap(p, 'F01-A-bell-after-reload', { full: false })
  await p.keyboard.press('Escape')
  // F04 customer view of rejected document (order 9)
  await p.goto(WEB.A + '/customer/orders/9'); await settle(p, 1200)
  const i9 = await snap(p, 'F04-A-customer-order9-rejected')
  R.F04_customer_order9 = { hasRejectedWord: /مرفوض/.test(i9.text), hasReason: /الصورة غير واضحة/.test(i9.text), excerpt: (i9.text.match(/(المستندات[\s\S]{0,700})/) || [''])[0] }
  // F02 new request view (order 5)
  await p.goto(WEB.A + '/customer/orders/5/missing-docs'); await settle(p, 1200)
  const i5 = await snap(p, 'F02-A-order5-missing-docs')
  R.F02_new = { fileInputs: await p.locator('input[type=file]').count(), accept: await p.locator('input[type=file]').first().getAttribute('accept').catch(() => null), progress: (i5.text.match(/[0-9٠-٩]+\s*\/\s*[0-9٠-٩]+/g) || []), name: /تفويض تجريبي/.test(i5.text), code: /client-audit-qa-202610-authorization/.test(i5.text) }
  // try resubmit with no file selected
  const btn = p.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).first()
  R.F02_new.submitDisabledWithoutFile = await btn.isDisabled().catch(() => 'n/a')
  await c.close()
}
// ---------------- F02 legacy env B ----------------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); const log = watch(p)
  await uiLogin(p, WEB.B, ...DEMO.customer)
  await p.goto(WEB.B + '/customer/orders/1/missing-docs'); await settle(p, 1200)
  const i = await snap(p, 'F02-B-legacy-order1-missing-docs')
  R.F02_legacy = { fileInputs: await p.locator('input[type=file]').count(), progress: (i.text.match(/[0-9٠-٩]+\s*\/\s*[0-9٠-٩]+/g) || []), excerpt: i.text.slice(i.text.indexOf('KH-'), i.text.indexOf('KH-') + 900) }
  const btn = p.locator('button', { hasText: 'رفع المستندات وإعادة الإرسال' }).first()
  R.F02_legacy.submitPresent = await btn.count()
  if (R.F02_legacy.submitPresent) {
    R.F02_legacy.submitDisabled = await btn.isDisabled()
    if (!R.F02_legacy.submitDisabled) {
      log.api.length = 0
      await btn.click(); await p.waitForTimeout(1500)
      R.F02_legacy.afterClickToast = await p.evaluate(() => [...document.querySelectorAll('[role="status"],[role="alert"],[class*="toast"]')].map((e) => e.innerText).filter(Boolean))
      R.F02_legacy.apiCallsOnSubmit = [...log.api]
      await settle(p, 800); R.F02_legacy.urlAfter = p.url()
      await snap(p, 'F02-B-legacy-after-submit')
      const s = await p.evaluate(async () => document.body.innerText.match(/بانتظار[^\n]*|قيد المراجعة[^\n]*/g))
      R.F02_legacy.statusTextAfter = s
    }
  }
  await p.goto(WEB.B + '/customer'); await settle(p, 1200)
  await snap(p, 'F01-B-customer-dashboard')
  R.F01_B_bell = await bellState(p)
  await c.close()
}
out('CUSTOMER-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
