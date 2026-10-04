import { test, expect } from '@playwright/test'

const PREFIX = 'client-audit-qa-202610'
const ROLES = [
  ['customer_a', '/customer'],
  ['employee', '/employee'],
  ['admin', '/admin'],
  ['provider_a', '/provider'],
]

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')

test('each QA role can log in, refresh, log out and re-enter in an isolated session', async ({ browser }) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  expect(password?.length).toBeGreaterThanOrEqual(12)
  for (const [role, route] of ROLES) {
    const context = await browser.newContext({ viewport: { width: 1366, height: 800 } })
    const page = await context.newPage()
    await page.addInitScript(() => localStorage.setItem('khalisni-language', 'en'))
    await page.goto('/login')
    await page.getByLabel('Email').fill(`${PREFIX}-${role}@example.test`)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`))
    await page.getByRole('button', { name: /المزيد من الخيارات|More options/ }).click()
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: /المزيد من الخيارات|More options/ }).click()
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto(route)
    await expect(page).toHaveURL(/\/login\?next=/)
    await expect(page.getByRole('button', { name: 'Log out' })).toHaveCount(0)
    await page.getByLabel('Email').fill(`${PREFIX}-${role}@example.test`)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(new RegExp(`${route.replace('/', '\\/')}$`))
    await context.close()
  }
})
