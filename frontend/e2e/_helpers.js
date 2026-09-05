import { test as base, expect } from '@playwright/test'

export const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:8009'

export const DEMO_USERS = {
  admin: { email: 'admin@khalisni.local', password: 'Admin@123', home: '/admin' },
  customer: { email: 'customer@khalisni.local', password: 'Customer@123', home: '/customer' },
  employee: { email: 'employee@khalisni.local', password: 'Employee@123', home: '/employee' },
  provider: { email: 'provider@khalisni.local', password: 'Provider@123', home: '/provider' },
}

export async function apiLogin(request, role) {
  const u = DEMO_USERS[role]
  const res = await request.post(`${API_URL}/api/auth/login/`, { data: { email: u.email, password: u.password } })
  expect(res.ok(), `login ${role}: ${res.status()}`).toBeTruthy()
  return res.json()
}

/** Seed localStorage with a real JWT pair so the SPA boots authenticated. */
export async function authenticateAs(page, request, role) {
  const { access, refresh } = await apiLogin(request, role)
  await page.addInitScript(
    ([a, r]) => {
      try {
        localStorage.setItem('khalisni_access', a)
        localStorage.setItem('khalisni_refresh', r)
        localStorage.setItem('khalisni_auth_storage', 'local')
      } catch {}
    },
    [access, refresh],
  )
  return { access, refresh }
}

/** Collect console.error / pageerror / failed-response noise for a page. */
export function attachRuntimeErrorCollector(page, { allow = [] } = {}) {
  const errors = []
  const isAllowed = (t) => allow.some((rx) => rx.test(t))
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const t = m.text()
      if (!isAllowed(t)) errors.push(`console.error: ${t}`)
    }
  })
  page.on('pageerror', (e) => {
    const t = String(e)
    if (!isAllowed(t)) errors.push(`pageerror: ${t}`)
  })
  page.on('requestfailed', (r) => {
    const t = `${r.method()} ${r.url()} :: ${r.failure()?.errorText || ''}`
    if (!isAllowed(t) && !r.url().includes('favicon')) errors.push(`requestfailed: ${t}`)
  })
  page.on('response', (r) => {
    const s = r.status()
    if (s >= 500) errors.push(`http ${s}: ${r.request().method()} ${r.url()}`)
  })
  return { errors }
}

export async function horizontalOverflowPx(page) {
  return page.evaluate(() => {
    const d = document.documentElement
    return Math.max(0, d.scrollWidth - d.clientWidth)
  })
}

export async function switchLanguage(page, target /* 'ar' | 'en' */) {
  const current = await page.locator('html').getAttribute('dir')
  const want = target === 'ar' ? 'rtl' : 'ltr'
  if (current === want) return
  const toggle = page
    .getByRole('button', { name: target === 'en' ? /english|EN|الإنجليزية/i : /عرب|arabic|AR/i })
    .first()
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click()
    await expect(page.locator('html')).toHaveAttribute('dir', want, { timeout: 5000 })
  }
}

export { base as test, expect }
