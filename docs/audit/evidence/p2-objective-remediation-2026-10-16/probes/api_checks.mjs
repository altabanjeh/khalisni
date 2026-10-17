// P2 API-level checks (registration, admin pagination, user status fields, reset email language).
// Run before and after the fix with TAG=before|after. Passwords come from the environment / seed defaults.
import fs from 'fs'
import path from 'path'
import { API, DEMO, QA, QA_PW, TAG, out } from './pw.mjs'

const S = 'C:/Users/LENOVO/AppData/Local/Temp/claude/d--ghassan/dc81cbcb-b135-455f-8bd2-a381931b3af1/scratchpad'
const R = {}
const stamp = Date.now().toString().slice(-6)
async function call(base, method, p, body, headers = {}) {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined })
  const text = await r.text()
  let json
  try { json = JSON.parse(text) } catch { json = text.slice(0, 160) }
  return [r.status, json]
}
async function token(base, email, password) {
  const [, j] = await call(base, 'POST', '/auth/login/', { email, password })
  return j.access
}
const strong = 'Khalsni-Reg-2026!'
const base = { full_name: 'QA Reg P2', email: '', password: strong }

// 1. registration (env A)
const A = API.A
R.reg_missing_phone = await call(A, 'POST', '/auth/register/', { ...base, email: `p2-nophone-${stamp}@example.test` })
R.reg_blank_phone = await call(A, 'POST', '/auth/register/', { ...base, phone: '', email: `p2-blank-${stamp}@example.test` })
R.reg_bad_phone = await call(A, 'POST', '/auth/register/', { ...base, phone: 'abc', email: `p2-abc-${stamp}@example.test` })
R.reg_valid_phone = await call(A, 'POST', '/auth/register/', { ...base, phone: `0791${stamp}`, email: `p2-ok-${stamp}@example.test` })
R.reg_valid_intl_phone = await call(A, 'POST', '/auth/register/', { ...base, phone: `+962 78 1${stamp}`, email: `p2-intl-${stamp}@example.test` })
R.reg_dup_email_ar = await call(A, 'POST', '/auth/register/', { ...base, phone: `0792${stamp}`, email: `p2-ok-${stamp}@example.test` }, { 'Accept-Language': 'ar' })
R.reg_dup_email_en = await call(A, 'POST', '/auth/register/', { ...base, phone: `0793${stamp}`, email: `p2-ok-${stamp}@example.test` }, { 'Accept-Language': 'en' })
R.reg_dup_phone = await call(A, 'POST', '/auth/register/', { ...base, phone: `0791${stamp}`, email: `p2-dupphone-${stamp}@example.test` })
R.reg_numeric_password = await call(A, 'POST', '/auth/register/', { ...base, password: '12345678', phone: `0794${stamp}`, email: `p2-num-${stamp}@example.test` })

// 2. admin service pagination (env B: real catalogue)
const B = API.B
const tB = await token(B, ...DEMO.admin)
const [, page1] = await call(B, 'GET', '/admin/services/', null, { Authorization: 'Bearer ' + tB })
R.services_api = { count: page1.count, page1Rows: page1.results?.length, next: page1.next ? page1.next.replace(/^https?:\/\/[^/]+/, '') : null }

// 3. user status fields (env B)
const [, users] = await call(B, 'GET', '/admin/users/?page_size=100', null, { Authorization: 'Bearer ' + tB })
const rows = users.results || users
R.users_api = { count: users.count ?? rows.length, sampleKeys: Object.keys(rows[0] || {}).filter((k) => /active|verified/.test(k)), rows: rows.map((u) => ({ id: u.id, role: u.role, is_active: u.is_active, is_verified: u.is_verified, is_email_verified: u.is_email_verified, is_phone_verified: u.is_phone_verified })) }

// 4. reset email language (env A mailbox)
const mailDir = path.join(S, process.env.MAIL_ENV || 'envP', 'mail')
const before = new Set(fs.readdirSync(mailDir))
for (const [lang, who] of [['ar', 'customer_a'], ['en', 'customer_b']]) {
  R[`forgot_${lang}`] = await call(A, 'POST', '/auth/forgot-password/', { email: QA(who) }, { 'Accept-Language': lang })
  await new Promise((r) => setTimeout(r, 1500))
}
const fresh = fs.readdirSync(mailDir).filter((f) => !before.has(f)).sort()
R.reset_emails = fresh.map((f) => {
  const raw = fs.readFileSync(path.join(mailDir, f), 'utf8')
  // Unfold the header and decode RFC 2047 "=?utf-8?b?...?=" words (non-ASCII subjects).
  const header = ((raw.match(/^Subject:(.*(?:\r?\n[ \t].*)*)/m) || [])[1] || '').replace(/\r?\n[ \t]+/g, ' ').trim()
  const subject = header.replace(/=\?utf-8\?b\?([^?]+)\?=\s*/gi, (_, b64) => Buffer.from(b64, 'base64').toString('utf8')).trim()
  const body = raw.split(/\r?\n\r?\n/).slice(1).join('\n')
  // Redact the one-time token from evidence.
  return { file: f, subject, body: body.replace(/reset-password\/[^\s]+/g, 'reset-password/<redacted>').slice(0, 600) }
})
out(`P2-api-${TAG}.json`, R)
console.log(JSON.stringify(R, (k, v) => (k === 'rows' ? `${v.length} rows` : v), 1))
