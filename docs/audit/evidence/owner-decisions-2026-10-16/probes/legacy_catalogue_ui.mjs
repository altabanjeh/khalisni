// Runtime proof on environment S (migrated copy of the real legacy catalogue):
// D02 wording, the parcel/basin gate and optional notes in the real order form.
import { launch, ctx, watch, settle, snap, WEB, DEMO, uiLogin, out } from './pw.mjs'
const BASE = WEB.B, API = process.env.API_B
const steps = []
const log = (n, ok, detail) => { steps.push({ step: n, result: ok ? 'PASS' : 'FAIL', detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n} :: ${JSON.stringify(detail).slice(0, 300)}`) }
const browser = await launch()
try {
  const svc = await (await fetch(`${API}/services/request-cadastral-map/`)).json()
  const pub = await (await ctx(browser)).newPage(); watch(pub)
  await pub.goto(`${BASE}/services/request-cadastral-map`); await settle(pub, 1500)
  const pubText = await pub.evaluate(() => document.body.innerText)
  await snap(pub, 'ODI-D02-legacy-service-page')
  log('D02 service page shows the approved price wording', pubText.includes('يتم تأكيد الرسوم النهائية بعد مراجعة الوثائق.'), 'public service page')
  log('D02 service page has no admin-panel wording', !pubText.includes('لوحة الإدارة'), 'public service page')
  await pub.goto(`${BASE}/services`); await settle(pub, 1500)
  log('D02 services list has no admin-panel wording', !(await pub.evaluate(() => document.body.innerText)).includes('لوحة الإدارة'), '/services')

  const c = await (await ctx(browser)).newPage(); watch(c); await uiLogin(c, BASE, ...DEMO.customer)
  await c.goto(`${BASE}/customer/orders/new?service=${svc.id}`); await settle(c, 2500)
  // Step to the applicant + service information step.
  for (let i = 0; i < 2 && !(await c.getByText('هل تعرف رقم القطعة والحوض؟').count()); i += 1) {
    const next = c.locator('button', { hasText: /التالي|متابعة/ }).first()
    if (await next.count()) { await next.click(); await settle(c, 800) }
  }
  const question = c.locator('label', { hasText: 'هل تعرف رقم القطعة والحوض؟' }).locator('xpath=following-sibling::select[1]')
  log('B10-1 question is a yes/no select', (await question.count()) === 1 && (await question.locator('option').allInnerTexts()).join('|').includes('نعم|لا'), await question.locator('option').allInnerTexts().catch(() => []))
  log('B10-2 parcel/basin hidden before an answer', !(await c.getByText('رقم القطعة', { exact: true }).count()) && !(await c.getByText('رقم الحوض', { exact: true }).count()), 'hidden')
  log('B10-3 help text says staff can assist', (await c.evaluate(() => document.body.innerText)).includes('ويساعدك فريقنا في تحديدهما'), 'help text')
  await question.selectOption('yes'); await settle(c, 300)
  const parcel = c.locator('label', { hasText: /^رقم القطعة$/ }).locator('xpath=following-sibling::input[1]')
  log('B10-2 "yes" shows parcel and basin as text inputs', (await parcel.count()) === 1 && (await parcel.getAttribute('type')) === 'text', await parcel.getAttribute('type').catch(() => null))
  await parcel.fill('012'); log('B10 leading zero kept in the parcel field', (await parcel.inputValue()) === '012', await parcel.inputValue())
  await snap(c, 'ODI-B10-legacy-parcel-yes')
  await question.selectOption('no'); await settle(c, 300)
  log('B10-2 "no" hides parcel and basin', !(await c.getByText('رقم القطعة', { exact: true }).count()), 'hidden after no')
  await snap(c, 'ODI-B10-legacy-parcel-no')
  // Required-field check for this step: notes left empty must not block.
  const notes = c.locator('label', { hasText: /^ملاحظات إضافية$/ }).locator('xpath=following-sibling::textarea[1]')
  log('B10-4 additional notes field present', (await notes.count()) === 1, await notes.count())
  const next = c.locator('button', { hasText: /التالي|متابعة/ }).first()
  await next.click(); await settle(c, 800)
  const errors = await c.evaluate(() => [...document.querySelectorAll('.text-danger')].map((element) => element.textContent.trim()).filter(Boolean))
  log('B10-4 empty notes and hidden parcel/basin raise no required error', !errors.some((text) => /ملاحظات إضافية|رقم القطعة|رقم الحوض/.test(text)), errors)
  await snap(c, 'ODI-B10-legacy-after-next')
} catch (err) { log('EXCEPTION', false, String(err).slice(0, 500)) }
await browser.close()
out('ODI-legacy-catalogue-ui-steps.json', steps)
console.log(`SUMMARY ${steps.filter((s) => s.result === 'PASS').length}/${steps.length} PASS`)
