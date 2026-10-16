// P2 objective remediation: accessibility regressions proven by the audit (tests 19-23).
// Needs data in the lists, e.g. `seed_demo` + `seed_client_audit_qa` (order 8 is READY_FOR_DELIVERY).
import { test, expect, authenticateAs } from './_helpers.js'
import AxeBuilderReal from '@axe-core/playwright'

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function settle(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector('#root')
    return root && root.innerText && root.innerText.trim().length > 20
  }, { timeout: 15000 })
  await page.waitForTimeout(600)
}

async function waitForAnimations(page) {
  await page.waitForFunction(() => document.getAnimations().filter((animation) => animation instanceof CSSTransition).every((animation) => animation.playState !== 'running'))
}

async function violations(page, rules) {
  const results = await new AxeBuilderReal({ page }).withTags(TAGS).withRules(rules).analyze()
  return results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 120)).join(' | ')}`)
}

// 19
test('employee verify queue: selected item text has enough contrast', async ({ page, request }) => {
  await authenticateAs(page, request, 'employee')
  await page.goto('/employee/documents/verify', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const items = page.locator('aside button').filter({ hasText: '#KH-' })
  test.skip(!(await items.count()), 'no documents waiting in this dataset')
  await items.first().click()
  expect(await violations(page, ['color-contrast'])).toEqual([])
})

// 20
test('admin orders: active status filter chip count has enough contrast', async ({ page, request }) => {
  await authenticateAs(page, request, 'admin')
  await page.goto('/admin/orders', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const chips = page.locator('button[aria-pressed]')
  for (let index = 0; index < Math.min(await chips.count(), 4); index += 1) {
    await chips.nth(index).click()
    await expect(chips.nth(index)).toHaveAttribute('aria-pressed', 'true')
    // The chips fade their colours (CSS `transition`); measure the settled
    // colours, not a frame of the fade, which is all axe saw before.
    await waitForAnimations(page)
    expect(await violations(page, ['color-contrast'])).toEqual([])
  }
})

// 21
test('order timeline: stage and date text have enough contrast', async ({ page, request }) => {
  await authenticateAs(page, request, 'admin')
  await page.goto('/admin/orders/8', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await expect(page.locator('ol li').first()).toBeVisible()
  expect(await violations(page, ['color-contrast'])).toEqual([])
})

// 22
test('scrollable data table region is focusable and scrolls with the keyboard', async ({ page, request }) => {
  await authenticateAs(page, request, 'admin')
  await page.goto('/admin/rules', { waitUntil: 'domcontentloaded' })
  await settle(page)
  await page.getByRole('button', { name: /قواعد سير العمل|Workflow rules/ }).click()
  await page.waitForTimeout(600)
  expect(await violations(page, ['scrollable-region-focusable'])).toEqual([])
  const region = page.getByRole('region', { name: /قواعد سير العمل|Workflow rules/ })
  test.skip(!(await region.count()), 'table layout not used at this width')
  await region.focus()
  await expect(region).toBeFocused()
  const scrollable = await region.evaluate((el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth)
  if (scrollable) {
    const before = await region.evaluate((el) => el.scrollTop + Math.abs(el.scrollLeft))
    await page.keyboard.press('PageDown')
    await page.keyboard.press(await region.evaluate((el) => (el.scrollHeight > el.clientHeight ? 'End' : 'ArrowLeft')))
    expect(await region.evaluate((el) => el.scrollTop + Math.abs(el.scrollLeft))).toBeGreaterThan(before)
  }
})

// 23
test('footer links meet the 24px minimum target size', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const sizes = await page.locator('footer a').evaluateAll((links) => links.map((link) => {
    const box = link.getBoundingClientRect()
    return { text: link.innerText.trim(), width: Math.round(box.width), height: Math.round(box.height) }
  }))
  expect(sizes.length).toBeGreaterThanOrEqual(7)
  expect(sizes.filter((size) => size.height < 24 || size.width < 24)).toEqual([])
  expect(await violations(page, ['target-size'])).toEqual([])
})
