import { test, expect } from '@playwright/test'

const API = process.env.E2E_API_URL || 'http://127.0.0.1:8009'
const PREFIX = 'client-audit-qa-202610'

test.skip(process.env.E2E_QA_MODE !== '1', 'Requires isolated client-audit QA fixtures')

// Release-hardening attacks against the live stack: logged-out, wrong-account,
// guessed-id and stale-session access must all fail closed.
test('logged-out, cross-account, guessed-id and stale-session access fail closed', async ({ page, request }) => {
  const password = process.env.KHALSNI_QA_PASSWORD
  async function login(role) {
    const response = await request.post(`${API}/api/auth/login/`, {
      data: { email: `${PREFIX}-${role}@example.test`, password },
    })
    expect(response.ok(), `${role} login`).toBeTruthy()
    return response.json()
  }
  const customerA = await login('customer_a')
  const customerB = await login('customer_b')
  const providerB = await login('provider_b')
  const auth = (session) => ({ Authorization: `Bearer ${session.access}` })

  const ownOrders = await (await request.get(`${API}/api/customer/orders/`, { headers: auth(customerA) })).json()
  const order = (ownOrders.results || ownOrders)[0]
  expect(order, 'customer A has a QA order').toBeTruthy()

  // Logged-out API access.
  for (const path of [`/customer/orders/${order.id}/`, '/customer/orders/', '/admin/orders/', '/provider/orders/', '/notifications/']) {
    expect((await request.get(`${API}/api${path}`)).status(), path).toBe(401)
  }

  // Guessed sequential ids from other accounts.
  for (let id = Math.max(1, order.id - 3); id <= order.id + 3; id += 1) {
    const asB = await request.get(`${API}/api/customer/orders/${id}/`, { headers: auth(customerB) })
    if (asB.status() === 200) expect((await asB.json()).customer.id).not.toBe(order.customer.id)
    else expect(asB.status()).toBe(404)
  }
  expect((await request.get(`${API}/api/customer/orders/${order.id}/`, { headers: auth(customerB) })).status()).toBe(404)
  expect((await request.get(`${API}/api/provider/orders/${order.id}/`, { headers: auth(customerB) })).status()).toBe(403)
  expect((await request.get(`${API}/api/customer/orders/${order.id}/`, { headers: auth(providerB) })).status()).toBe(403)
  expect((await request.post(`${API}/api/customer/orders/${order.id}/cancel/`, { headers: auth(customerB), data: { reason: 'x' } })).status()).toBe(404)

  // Order number alone never opens public tracking.
  expect((await request.get(`${API}/api/orders/track/?order_number=${order.order_number}&phone=`)).status()).toBe(404)
  expect((await request.get(`${API}/api/orders/track/?order_number=${order.order_number}`)).status()).toBe(404)

  // The bell is personal: B never receives A's notifications.
  const bNotifications = await (await request.get(`${API}/api/notifications/`, { headers: auth(customerB) })).json()
  for (const row of bNotifications.results || bNotifications) expect(row.order_number).not.toBe(order.order_number)

  // Stale session: a refresh token is dead after logout.
  const stale = await login('customer_b')
  expect((await request.post(`${API}/api/auth/logout/`, { headers: auth(stale), data: { refresh: stale.refresh } })).status()).toBeLessThan(300)
  expect((await request.post(`${API}/api/auth/token/refresh/`, { data: { refresh: stale.refresh } })).status()).toBe(401)

  // Logged-out browser on a protected URL lands on the login page.
  await page.goto(`/customer/orders/${order.id}`)
  await expect(page).toHaveURL(/\/login/)
})
