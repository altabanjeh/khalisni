import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * WCAG 2.2 AA baseline (defect A11Y-1). Fails the build on any serious/critical
 * axe violation on the primary public routes. Extend `ROUTES` as authenticated
 * fixtures become available.
 */

const ROUTES = ['/', '/services', '/track-order', '/login', '/register', '/faq']

for (const route of ROUTES) {
  test(`no serious accessibility violations: ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()

    const blocking = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact))
    expect(
      blocking,
      blocking.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n'),
    ).toEqual([])
  })
}
