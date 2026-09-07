import { test, expect, authenticateAs } from './_helpers.js'
import AxeBuilderReal from '@axe-core/playwright'

const ROUTES = {
  customer: ['/customer', '/customer/orders', '/customer/orders/new', '/customer/profile'],
  employee: ['/employee', '/employee/orders', '/employee/documents/verify', '/employee/reports'],
  admin: ['/admin', '/admin/orders', '/admin/services', '/admin/service-categories', '/admin/users', '/admin/providers'],
  provider: ['/provider', '/provider/orders'],
}

for (const [role, routes] of Object.entries(ROUTES)) {
  for (const route of routes) {
    test(`axe (${role}) ${route}`, async ({ page, request }) => {
      await authenticateAs(page, request, role)
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => {
        const r = document.querySelector('#root')
        return r && r.innerText && r.innerText.trim().length > 20
      }, { timeout: 15000 })
      await page.waitForTimeout(500)
      const results = await new AxeBuilderReal({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
      expect(blocking, blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')).toEqual([])
    })
  }
}
