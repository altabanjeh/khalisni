import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, DEMO, uiLogin, out } from './pw.mjs'
const browser = await launch()
const R = {}
// ---------- F05 rules workflow tab (env A) + F06 CMS cycle ----------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
  await uiLogin(p, WEB.A, QA('admin'), QA_PW)
  await p.goto(WEB.A + '/admin/rules'); await settle(p, 1200)
  await p.getByText('قواعد سير العمل', { exact: true }).first().click(); await settle(p, 1000)
  const ri = await snap(p, 'F05-A-admin-rules-workflow-tab')
  R.rulesWaiting = ri.text.split('\n').filter((l) => /بانتظار العميل|Waiting customer/i.test(l)).slice(0, 10)
  // F06: read editor, preview, public before change
  await p.goto(WEB.A + '/admin/public-site/content'); await settle(p, 1200)
  await snap(p, 'F06-A-content-editor-before')
  const titleBefore = await p.locator('input[name="hero_title_ar"]').inputValue()
  R.F06_editorTitleBefore = titleBefore
  await p.goto(WEB.A + '/admin/public-site/preview'); await settle(p, 2500)
  const fr = p.frameLocator('iframe').first()
  R.F06_previewH1Before = await fr.locator('h1').first().innerText().catch((e) => 'ERR ' + e.message.slice(0, 80))
  R.F06_previewLabel = await p.evaluate(() => (document.querySelector('main') || document.body).innerText.split('\n').filter((l) => /معاينة|Preview|نفس|المنشور/.test(l)).slice(0, 6))
  await snap(p, 'F06-A-preview-before')
  const pub = await c.newPage(); watch(pub)
  await pub.goto(WEB.A + '/'); await settle(pub, 1200)
  R.F06_publicH1Before = await pub.locator('h1').first().innerText()
  // edit -> save
  const MARK = 'عنوان تدقيق الإغلاق QA-F06'
  await p.goto(WEB.A + '/admin/public-site/content'); await settle(p, 1200)
  await p.locator('input[name="hero_title_ar"]').fill(MARK)
  const [resp] = await Promise.all([p.waitForResponse((r) => r.url().includes('/admin/public-site/content/') && r.request().method() !== 'GET'), p.locator('form button[type="submit"]').last().click()])
  R.F06_saveStatus = resp.status()
  await settle(p, 800)
  await p.goto(WEB.A + '/admin/public-site/preview'); await settle(p, 2500)
  R.F06_previewH1After = await p.frameLocator('iframe').first().locator('h1').first().innerText().catch((e) => 'ERR')
  await snap(p, 'F06-A-preview-after-save')
  await pub.reload(); await settle(pub, 1500)
  R.F06_publicH1After = await pub.locator('h1').first().innerText()
  await snap(pub, 'F06-A-public-after-save', { full: false })
  // fresh anonymous context
  const c2 = await ctx(browser, { lang: 'ar' }); const anon = await c2.newPage()
  await anon.goto(WEB.A + '/'); await settle(anon, 1200); R.F06_anonH1After = await anon.locator('h1').first().innerText(); await c2.close()
  // restore
  await p.goto(WEB.A + '/admin/public-site/content'); await settle(p, 1200)
  await p.locator('input[name="hero_title_ar"]').fill(titleBefore)
  await Promise.all([p.waitForResponse((r) => r.url().includes('/admin/public-site/content/') && r.request().method() !== 'GET'), p.locator('form button[type="submit"]').last().click()])
  await pub.reload(); await settle(pub, 1200); R.F06_publicH1Restored = await pub.locator('h1').first().innerText()
  await c.close()
}
// ---------- B10 env B admin services pagination + users verified + D03 admin ----------
{
  const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); const log = watch(p)
  await uiLogin(p, WEB.B, ...DEMO.admin)
  await p.goto(WEB.B + '/admin/services'); await settle(p, 2000)
  const i = await snap(p, 'B10-B-admin-services')
  R.B10_adminServices = await p.evaluate(() => ({ rows: document.querySelectorAll('main table tbody tr').length, pagination: [...document.querySelectorAll('main button, main a')].map((b) => b.innerText.trim()).filter((t) => /التالي|السابق|Next|Previous|صفحة|^[0-9]+$/.test(t)), countText: (document.body.innerText.match(/[0-9]+\s*(خدمة|خدمات|services)/g) || []).slice(0, 5) }))
  R.B10_adminServicesApi = log.api.filter((x) => x.includes('admin/services'))
  await p.goto(WEB.B + '/admin/users'); await settle(p, 1500)
  const u = await snap(p, 'B10-B-admin-users')
  R.B10_usersVerifiedCol = u.text.split('\n').filter((l) => /موث|تحقق|verified/i.test(l)).slice(0, 8)
  await c.close()
}
out('ADMIN2-results.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
