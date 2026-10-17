import { launch, ctx, settle, QA, QA_PW, uiLogin } from './pw.mjs'
const b = await launch(); const p = await (await ctx(b)).newPage(); await uiLogin(p, process.env.WEB_A, QA('admin'), QA_PW)
await p.goto(process.env.WEB_A + '/admin/orders'); await settle(p, 1500)
const chips = p.locator('button[aria-pressed]')
await chips.nth(1).click()
const running = await p.evaluate(() => document.getAnimations().map((a) => `${a.constructor.name}:${a.transitionProperty || a.animationName}:${a.playState}`))
console.log('ANIMATIONS_RIGHT_AFTER_CLICK', JSON.stringify(running))
await b.close()
