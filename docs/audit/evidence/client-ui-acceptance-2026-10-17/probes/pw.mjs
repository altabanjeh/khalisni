// Shared Playwright harness for the closure audit. Evidence lands in ../evidence.
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const require = createRequire('D:/ghassan/frontend/package.json')
const pw = require('playwright')
export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const EV = path.join(HERE, '..', 'evidence')
export const WEB = { A: process.env.WEB_A || 'http://127.0.0.1:4341', B: process.env.WEB_B || 'http://127.0.0.1:4342' }
export const API = { A: process.env.API_A || 'http://127.0.0.1:8031/api', B: process.env.API_B || 'http://127.0.0.1:8032/api' }
export const TAG = process.env.TAG || 'before'
export const QA_PW = process.env.KHALSNI_QA_PASSWORD || '<redacted>'
export const QA = (k) => `client-audit-qa-202610-${k}@example.test`
export const DEMO = { admin: ['admin@khalisni.local', '<redacted>'], customer: ['customer@khalisni.local', '<redacted>'], employee: ['employee@khalisni.local', '<redacted>'], provider: ['provider@khalisni.local', '<redacted>'] }
fs.mkdirSync(EV, { recursive: true })

export async function launch(engine = 'chromium') {
  if (engine === 'webkit') return pw.webkit.launch()
  return pw.chromium.launch({ channel: 'chrome' })
}
export async function ctx(browser, { width = 1366, height = 900, lang = 'ar', mobile = false } = {}) {
  const c = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: lang === 'ar' ? 'ar-JO' : 'en-US', acceptDownloads: true })
  await c.addInitScript((l) => { try { if (!localStorage.getItem('khalisni-language')) localStorage.setItem('khalisni-language', l) } catch {} }, lang)
  return c
}
export function watch(page) {
  const log = { console: [], failed: [], api: [] }
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => log.console.push('PAGEERROR ' + String(e).slice(0, 300)))
  page.on('requestfailed', (r) => log.failed.push(r.method() + ' ' + r.url() + ' ' + (r.failure()?.errorText || '')))
  page.on('response', (r) => { if (r.url().includes('/api/')) log.api.push(`${r.request().method()} ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`) })
  page._audit = log
  return log
}
export async function settle(page, ms = 600) {
  try { await page.waitForLoadState('networkidle', { timeout: 15000 }) } catch {}
  await page.waitForTimeout(ms)
}
export async function snap(page, name, { full = true } = {}) {
  const file = path.join(EV, name + '.png')
  await page.screenshot({ path: file, fullPage: full })
  const info = await page.evaluate(() => ({
    title: document.title, dir: document.documentElement.dir, lang: document.documentElement.lang,
    overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    text: document.body.innerText,
  }))
  fs.writeFileSync(path.join(EV, name + '.txt'), `URL: ${page.url()}\nTITLE: ${info.title}\nDIR: ${info.dir} LANG: ${info.lang}\nOVERFLOW_X: ${info.overflowX}\nCONSOLE_ERRORS: ${JSON.stringify(page._audit?.console || [])}\n\n${info.text}`)
  return info
}
export async function uiLogin(page, base, email, password) {
  await page.goto(base + '/login')
  await settle(page, 300)
  await page.locator('input[type="email"], input[name="email"]').first().fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/auth/login/'), { timeout: 20000 }),
    page.locator('form button[type="submit"]').first().click(),
  ])
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {})
  await settle(page)
}
export function latinRuns(text) {
  // Latin words of 2+ letters (ignores digits, order numbers, emails, URLs handled by caller)
  return [...new Set((text.match(/[A-Za-z][A-Za-z'’\-]+(?:\s+[A-Za-z][A-Za-z'’\-]+)*/g) || []))]
}
export function out(name, obj) { fs.writeFileSync(path.join(EV, name), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1)) }
