import { chromium } from '@playwright/test'
const B = process.env.B || 'http://127.0.0.1:4319'
const route = process.argv[2] || '/services'
const b = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' })
const p = await ctx.newPage()
p.on('request', (r) => { if (/\/api\//.test(r.url())) console.log('REQ ', r.method(), r.url()) })
p.on('response', (r) => { if (/\/api\//.test(r.url())) console.log('RES ', r.status(), r.url()) })
p.on('requestfailed', (r) => console.log('FAIL', r.failure()?.errorText, r.url()))
p.on('console', (m) => console.log('CON ', m.type(), m.text().slice(0, 200)))
p.on('pageerror', (e) => console.log('PERR', String(e).slice(0, 300)))
await p.goto(B + route, { waitUntil: 'load' })
await p.waitForTimeout(6000)
const t = await p.locator('#root').innerText()
console.log('--- root text (first 400) ---')
console.log(t.slice(0, 400).replace(/\n+/g, ' | '))
await b.close()
