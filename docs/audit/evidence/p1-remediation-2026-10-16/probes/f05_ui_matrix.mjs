// F05 verification: for every order state compare rule (API) vs admin UI vs executed result.
import { launch, ctx, watch, settle, snap, WEB, QA, QA_PW, uiLogin, out } from './pw.mjs'
const API = 'http://127.0.0.1:8019/api', BASE = WEB.A
async function token(role) {
  const r = await fetch(API + '/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: QA(role), password: QA_PW }) })
  return (await r.json()).access
}
const adminTok = await token('admin')
const api = async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: { Authorization: 'Bearer ' + adminTok, 'Content-Type': 'application/json', 'Accept-Language': 'ar' }, body: body ? JSON.stringify(body) : undefined })
  return [r.status, await r.json().catch(() => null)]
}
const [, rules] = await api('GET', '/admin/workflow-rules/')
const adminRules = rules.results.filter((r) => r.allowed_roles.includes('admin'))

const browser = await launch()
const c = await ctx(browser, { lang: 'ar' }); const p = await c.newPage(); watch(p)
await uiLogin(p, BASE, QA('admin'), QA_PW)

async function inspect(id, label) {
  const [, order] = await api('GET', `/admin/orders/${id}/`)
  const wt = order.allowed_actions.workflow_transitions
  await p.goto(`${BASE}/admin/orders/${id}`); await settle(p, 1500)
  const info = await snap(p, `F05-after-${label}-order${id}`)
  const ui = await p.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const btn = (t) => [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === t && !b.disabled)
    return {
      cancel: !!q('[data-testid="admin-cancel-order"]'),
      requestDocs: !!q('[data-testid="admin-request-documents"]'),
      recovery: !!q('[data-testid="missing-request-recovery"]'),
      assign: !!q('#admin-assign'),
      reject: btn('رفض الطلب'),
      complete: btn('إكمال الطلب'),
      statusOptions: [...(q('#admin-status')?.options || [])].map((o) => o.value).filter(Boolean),
      blocked: [...document.querySelectorAll('[data-testid="admin-blocked-actions"] li')].map((li) => li.innerText.trim()),
      indirect: [...document.querySelectorAll('[data-testid="admin-indirect-actions"] li')].map((li) => li.innerText.trim()),
    }
  })
  const mismatches = []
  const rulesHere = adminRules.filter((r) => r.from_status === order.status)
  for (const option of wt) {
    const isAdminRule = rulesHere.some((r) => r.action === option.action)
    let exposed
    switch (option.action) {
      case 'cancel_order': exposed = ui.cancel; break
      case 'request_missing_documents': exposed = ui.requestDocs; break
      case 'assign_provider': exposed = ui.assign; break
      case 'reject_order': exposed = ui.reject; break
      case 'complete_order': exposed = ui.complete; break
      case 'mark_ready_for_delivery': case 'resume_review': exposed = ui.indirect.length > 0; break
      default: exposed = option.channel === 'status' ? ui.statusOptions.includes(option.to_status) : false
    }
    if (option.available && isAdminRule && !exposed) mismatches.push(`API allows ${option.action} but UI does not expose it`)
    if (!option.available && ['cancel_order', 'request_missing_documents', 'assign_provider', 'reject_order', 'complete_order'].includes(option.action) && exposed) mismatches.push(`UI exposes ${option.action} but API forbids it`)
  }
  for (const s of ui.statusOptions) if (!wt.some((o) => o.to_status === s && o.available)) mismatches.push(`status option ${s} not allowed by API`)
  const rawLeak = info.text.match(/\b[a-z]+_[a-z_]+\b|Requested documents|Required documents are|Role '|No valid missing|client-audit-qa-202610-authorization/g)
  return {
    order: order.order_number, status: order.status,
    rules: rulesHere.map((r) => r.action),
    api: wt.map((o) => `${o.action}:${o.available ? 'available' : 'blocked'}`),
    ui, mismatches, rawTextInUi: rawLeak ? [...new Set(rawLeak)] : [],
  }
}

const R = { states: [], executed: [] }
// Make a REJECTED-capable order: fresh order under review.
const custTok = await token('customer_a')
const fd = new FormData()
const [, svcs] = [0, await (await fetch(API + '/services/')).json()]
const svc = svcs.find((s) => s.slug === 'client-audit-qa-202610-service')
for (const [k, v] of Object.entries({ service: svc.id, full_name: 'QA Customer A', phone: '0798800103', city: 'Amman', consent: 'true', document_types: 'client-audit-qa-202610-authorization' })) fd.append(k, v)
const fs = await import('fs')
fd.append('documents', new Blob([fs.readFileSync(new URL('./files/qa-valid.pdf', import.meta.url))], { type: 'application/pdf' }), 'qa.pdf')
const created = await (await fetch(API + '/orders/', { method: 'POST', headers: { Authorization: 'Bearer ' + custTok, 'Idempotency-Key': crypto.randomUUID() }, body: fd })).json()
const fresh = created.id

for (const [id, label] of [[4, 'NEW'], [6, 'UNDER_REVIEW'], [5, 'WAITING_CUSTOMER'], [7, 'ASSIGNED'], [2, 'IN_PROGRESS'], [8, 'READY_FOR_DELIVERY'], [3, 'COMPLETED']]) R.states.push(await inspect(id, label))

async function execute(step, id, fn, expect) {
  await p.goto(`${BASE}/admin/orders/${id}`); await settle(p, 1500)
  await fn(); await settle(p, 1800)
  const [, after] = await api('GET', `/admin/orders/${id}/`)
  R.executed.push({ step, order: after.order_number, result: after.status, expected: expect, pass: after.status === expect })
}
// NEW -> UNDER_REVIEW through the status form (generic channel)
await execute('NEW→UNDER_REVIEW via status form', fresh, async () => { await p.selectOption('#admin-status', 'UNDER_REVIEW'); await p.locator('button', { hasText: 'تحديث الحالة' }).click() }, 'UNDER_REVIEW')
// UNDER_REVIEW -> WAITING_CUSTOMER through the new request-documents form
await execute('UNDER_REVIEW→WAITING_CUSTOMER via request-documents form', fresh, async () => {
  const form = p.locator('[data-testid="admin-request-documents"]')
  await form.locator('textarea').fill('يرجى رفع التفويض'); await form.locator('input[type=checkbox]').first().check()
  await form.locator('button[type=submit]').click()
}, 'WAITING_CUSTOMER')
// WAITING_CUSTOMER -> CANCELLED through the new cancel action
await execute('WAITING_CUSTOMER→CANCELLED via cancel action', fresh, async () => {
  await p.locator('[data-testid="admin-cancel-order"]').click(); await p.fill('#admin-cancel-reason', 'تدقيق F05 - بيئة تجريبية')
  await p.locator('button', { hasText: 'نعم، ألغِ الطلب' }).click()
}, 'CANCELLED')
R.states.push(await inspect(fresh, 'CANCELLED'))
// CANCELLED -> ARCHIVED via status form
await execute('CANCELLED→ARCHIVED via status form', fresh, async () => { await p.selectOption('#admin-status', 'ARCHIVED'); await p.locator('button', { hasText: 'تحديث الحالة' }).click() }, 'ARCHIVED')
// UNDER_REVIEW -> REJECTED via reject button (order 6)
await execute('UNDER_REVIEW→REJECTED via reject action', 6, async () => {
  await p.locator('button', { hasText: 'رفض الطلب' }).first().click(); await p.fill('#admin-reject-reason', 'تدقيق F05 - بيئة تجريبية')
  await p.locator('button', { hasText: 'نعم، ارفض الطلب' }).click()
}, 'REJECTED')
R.states.push(await inspect(6, 'REJECTED'))
await snap(p, 'F05-after-final-state')
out('F05-ui-matrix-after-fix.json', R)
console.log(JSON.stringify(R, null, 1))
await browser.close()
