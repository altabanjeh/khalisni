// Mobile total-closure harness (extends the 2026-10 remediation harness) (Node, axios Node adapter, echo server on 8097).
// Proves client logic only; no React Native rendering, file system or device.
const http = require('node:http')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const here = __dirname
const results = []
function check(id, name, pass, evidence) {
  results.push({ id, name, pass: Boolean(pass), evidence })
}

const seen = []
let tokenCalls = 0
const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    const url = new URL(req.url, 'http://127.0.0.1:8097')
    seen.push({ method: req.method, path: url.pathname, query: url.search, auth: req.headers.authorization || null, lang: req.headers['accept-language'] || null, contentType: req.headers['content-type'] || null, body: body.toString('latin1') })
    const json = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
    const page = Number(url.searchParams.get('page') || 1)

    if (url.pathname === '/api/auth/token/refresh/') return json(200, { access: 'fresh-access', refresh: 'r2' })
    if (url.pathname === '/api/customer/orders/') {
      const all = Array.from({ length: 45 }, (_, i) => ({ id: i + 1, order_number: `ORD-${i + 1}`, status: i % 7 === 0 ? 'WAITING_CUSTOMER' : 'NEW' }))
      const slice = all.slice((page - 1) * 20, page * 20)
      // `next` deliberately names an internal host: the client must keep its own base URL.
      return json(200, { count: 45, next: page * 20 < 45 ? `http://internal-backend:8000/api/customer/orders/?page=${page + 1}` : null, previous: null, results: slice })
    }
    if (url.pathname === '/api/notifications/') {
      const all = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, message: `m${i + 1}`, is_read: i > 2 }))
      return json(200, { count: 25, next: page === 1 ? 'http://127.0.0.1:8097/api/notifications/?page=2' : null, previous: null, results: all.slice((page - 1) * 20, page * 20) })
    }
    if (url.pathname === '/api/notifications/unread-count/') return json(200, { unread: 37 })
    if (url.pathname === '/api/orders/') {
      if (req.headers['x-case'] === 'invalid') {
        return json(400, { service_answers: { parcel_number: ['This field is required.'], visit_date: 'Enter a date as YYYY-MM-DD.' }, document_errors: { national_id: 'Unsupported file type.' }, phone: ['Enter a valid phone number.'] })
      }
      return json(201, { id: 99, order_number: 'ORD-99' })
    }
    if (url.pathname === '/api/server-500/') { res.statusCode = 500; res.setHeader('Content-Type', 'text/html'); return res.end('<h1>Server Error (500)</h1>') }
    if (url.pathname === '/api/server-json-500/') return json(500, { detail: 'A server error occurred.' })
    if (url.pathname === '/api/slow/') { setTimeout(() => json(200, {}), 1500); return }
    if (url.pathname === '/api/detail-400/') return json(400, { detail: 'تم رفض الطلب لسبب محدد من الخادم.' })

    const tokenMatch = /^\/api\/documents\/(\d+)\/download-token\/$/.exec(url.pathname)
    if (tokenMatch) {
      tokenCalls += 1
      if (req.headers.authorization === 'Bearer expired-access') return json(401, { detail: 'Given token not valid' })
      return json(200, { token: `tok-${tokenMatch[1]}-${tokenCalls}`, expires_in: 1800 })
    }
    const dl = /^\/api\/documents\/(\d+)\/download\/$/.exec(url.pathname)
    if (dl) {
      const id = Number(dl[1])
      if (req.headers.authorization) return json(400, { detail: 'download must not carry the bearer token' })
      if (id === 404) return json(404, { detail: 'Not found.' })
      if (id === 403) return json(403, { detail: 'You are not allowed to access this document.' })
      if (id === 200) return json(200, { detail: 'JSON body with 200 status' })
      if (id === 7 && !url.searchParams.get('token')?.startsWith('tok-7-')) return json(404, { detail: 'bad token' })
      res.statusCode = 200; res.setHeader('Content-Type', 'application/pdf'); return res.end('%PDF-1.4 real document bytes')
    }
    // ---- total-closure routes ----
    if (url.pathname === '/api/auth/register/') {
      const data = JSON.parse(body.toString('utf8') || '{}')
      if (data.email === 'taken@example.jo') {
        return json(400, {
          email: ['يوجد حساب مسجل بهذا البريد الإلكتروني.'],
          phone: ['أدخل رقم هاتف صحيحاً، مثل 0791234567 أو ‎+962791234567. للأرقام من خارج الأردن أضف رمز الدولة مسبوقاً بـ + أو 00.'],
          password: ['كلمة المرور هذه شائعة جداً.', 'كلمة المرور هذه تتكون من أرقام فقط.'],
          non_field_errors: ['تعذر إنشاء الحساب الآن.'],
        })
      }
      if (data.email === 'throttle@example.jo') return json(429, { detail: 'تم تجاوز عدد المحاولات. حاول لاحقاً.' })
      return json(201, { id: 41, full_name: data.full_name, phone: '+962791234567', email: data.email, national_id: data.national_id || '' })
    }
    if (url.pathname === '/api/orders/track/') {
      const on = url.searchParams.get('order_number'); const ph = url.searchParams.get('phone')
      if (on === 'KH-2026-000123' && ph === '0791234567') {
        return json(200, {
          id: 123, order_number: 'KH-2026-000123', status: 'WAITING_CUSTOMER',
          timeline: [{ id: 1, old_status: '', new_status: 'NEW', note: '', system_event: '', created_at: '2026-10-30T09:00:00Z' }, { id: 2, old_status: 'NEW', new_status: 'WAITING_CUSTOMER', note: 'يرجى رفع صورة الهوية.', system_event: '', created_at: '2026-10-31T09:00:00Z' }],
          missing_documents: ['national_id', 'passport'],
          missing_document_details: [{ document_type: 'national_id', name_ar: 'صورة الهوية', name_en: 'ID' }, { document_type: 'passport', name_ar: 'Passport', name_en: 'Passport' }],
          final_documents: [],
        })
      }
      return json(404, { detail: 'Not found.' })
    }
    const rate = /^\/api\/customer\/orders\/(\d+)\/rating\/$/.exec(url.pathname)
    if (rate && req.method === 'POST') { const d = JSON.parse(body.toString('utf8')); return json(201, { score: d.score, comment: d.comment || '' }) }
    const msg = /^\/api\/customer\/orders\/(\d+)\/messages\/$/.exec(url.pathname)
    if (msg) {
      const id = Number(msg[1])
      if (id === 404) return json(404, { detail: 'Not found.' })
      if (req.method === 'POST') { const d = JSON.parse(body.toString('utf8')); return json(201, { id: 9, message: d.message, author_role: 'customer', created_at: '2026-11-01T10:00:00Z' }) }
      return json(200, [
        { id: 8, message: 'تم استلام طلبك.', author_role: 'staff', created_at: '2026-11-01T09:30:00Z' },
        { id: 7, message: 'متى يجهز الطلب؟', author_role: 'customer', created_at: '2026-11-01T09:00:00Z' },
      ])
    }
    const dlv = /^\/api\/customer\/orders\/(\d+)\/delivery\/$/.exec(url.pathname)
    if (dlv) {
      const id = Number(dlv[1])
      if (id === 1) return json(200, { delivery_method: 'electronic', delivery_method_label_ar: 'تسليم إلكتروني (تنزيل النتيجة)', delivery_method_label_en: 'Electronic (download the result)', delivery_instructions: '' })
      if (id === 2) return json(200, { delivery_method: 'paper_pickup', delivery_method_label_ar: 'تسليم ورقي - استلام', delivery_method_label_en: 'Paper - pickup', delivery_instructions: 'استلم الأصل من مكتب عمّان مع الهوية.' })
      return json(200, { delivery_method: 'electronic', delivery_method_label_ar: 'تسليم إلكتروني (تنزيل النتيجة)', delivery_method_label_en: 'Electronic', delivery_instructions: 'رابط التتبع يصلك برسالة.' })
    }
    const cmp = /^\/api\/customer\/orders\/(\d+)\/complaints\/$/.exec(url.pathname)
    if (cmp) {
      const id = Number(cmp[1])
      if (id === 404) return json(404, { detail: 'Not found.' })
      if (req.method === 'POST') {
        const d = JSON.parse(body.toString('utf8') || '{}')
        if (!d.description) return json(400, { description: ['هذا الحقل مطلوب.'] })
        return json(201, { id: 31, description: d.description, is_resolved: false, created_at: '2026-11-01T11:00:00Z', resolved_at: null })
      }
      return json(200, [
        { id: 30, description: 'تأخر الطلب.', is_resolved: true, created_at: '2026-10-20T08:00:00Z', resolved_at: '2026-10-21T08:00:00Z' },
        { id: 29, description: 'لم يصلني إشعار.', is_resolved: false, created_at: '2026-10-19T08:00:00Z', resolved_at: null },
      ])
    }
    const lg = /^\/api\/public-site\/legal\/([a-z]+)\/$/.exec(url.pathname)
    if (lg) {
      const mode = globalThis.__legalMode || 'draft'
      if (mode === '404') return json(404, { detail: 'Not found.' })
      if (mode === '500') { res.statusCode = 500; res.setHeader('Content-Type', 'text/html'); return res.end('<h1>500</h1>') }
      return json(200, { kind: lg[1], version: 'privacy-2026-11', effective_date: '2026-11-01', title_ar: 'سياسة الخصوصية', body_ar: '# مقدمة\nنحترم خصوصيتك.\n- نجمع الاسم والهاتف.', approval_status: mode === 'draft' ? 'draft_requires_approval' : 'approved' })
    }
    json(404, { detail: 'unknown' })
  })
})

async function main() {
  await new Promise((r) => server.listen(8097, '127.0.0.1', r))
  const m = require(path.join(here, 'bundle.cjs'))
  const { ordersApi, notificationsApi, documentsApi, apiClient, getDisplayError, normalizeApiError, forms, download, timeline, docs, status } = m

  // ---- 6. Pagination ----
  seen.length = 0
  const orders = await ordersApi.getCustomerOrders()
  const orderReqs = seen.filter((r) => r.path === '/api/customer/orders/')
  check('DEF-pagination-1', 'getCustomerOrders follows `next` until null (45 items over 3 pages, base URL kept)', orders.length === 45 && orderReqs.length === 3 && orderReqs.map((r) => r.query).join(',') === ',?page=2,?page=3',
    { count: orders.length, requests: orderReqs.map((r) => r.path + r.query), lastId: orders[orders.length - 1]?.id })
  const page1 = await notificationsApi.getNotificationsPage({ page: 1 })
  const page2 = await notificationsApi.getNotificationsPage({ page: m.pageFromNextLink(page1.next) })
  check('DEF-pagination-2', 'notifications page API exposes next/count for load-more; page 2 reachable', page1.results.length === 20 && page1.count === 25 && page1.next && page2.results.length === 5 && page2.next === null,
    { page1: { n: page1.results.length, count: page1.count, next: page1.next }, page2: { n: page2.results.length, next: page2.next } })
  const unread = await notificationsApi.getUnreadCount()
  check('DEF-pagination-3', 'dashboard unread count uses /notifications/unread-count/ (server count, not page 1)', unread === 37, { unread })

  // ---- 7. service_answers payload ----
  const service = {
    required_information_schema: [
      { name: 'knows_parcel', type: 'select', required: true, label_ar: 'هل تعرف رقم القطعة؟', options: [{ value: 'yes', label_ar: 'نعم' }, { value: 'no', label_ar: 'لا' }] },
      { name: 'parcel_number', type: 'text', required: true, label_ar: 'رقم القطعة', visible_when: { field: 'knows_parcel', equals: 'yes' } },
      { key: 'Basin', type: 'number', label_ar: 'رقم الحوض', visible_when: { field: 'knows_parcel', equals: 'yes' } },
      { field: 'agree_terms', type: 'checkbox', label_ar: 'أوافق' },
      { id: 12, type: 'checkbox', label_ar: 'استلام ورقي' },
      { type: 'textarea', label_ar: 'تفاصيل' },
      { name: 'visit_date', type: 'date', label_ar: 'تاريخ الزيارة' },
      { name: 'urgent_reason', type: 'text', label_ar: 'سبب الاستعجال', visible_when: { field: 'agree_terms', equals: 'true' } },
    ],
  }
  const fields = forms.getServiceSchemaFields(service)
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
  const values = {
    [byKey.knows_parcel.inputName]: 'no',
    [byKey.parcel_number.inputName]: '123', // hidden: must be omitted
    [byKey.Basin.inputName]: '9',          // hidden: must be omitted
    [byKey.agree_terms.inputName]: true,
    [byKey['field_6'].inputName]: '  نص حر  ',
    [byKey.visit_date.inputName]: '',
    [byKey.urgent_reason.inputName]: 'سفر',
  }
  const answersNo = forms.buildServiceAnswers(fields, values)
  const answersYes = forms.buildServiceAnswers(fields, { ...values, [byKey.knows_parcel.inputName]: 'yes', [byKey.agree_terms.inputName]: false })
  check('DEF-service-answers-1', 'keys are raw schema keys (name ?? key ?? field ?? id ?? field_N), hidden fields omitted, checkbox booleans, select sends option value, empty optional omitted',
    JSON.stringify(answersNo) === JSON.stringify({ knows_parcel: 'no', agree_terms: true, '12': false, field_6: 'نص حر', urgent_reason: 'سفر' }),
    { answersWhenNo: answersNo, keys: fields.map((f) => f.key) })
  check('DEF-service-answers-2', 'controller = yes shows parcel/basin; unticked checkbox controller hides its dependent field',
    JSON.stringify(answersYes) === JSON.stringify({ knows_parcel: 'yes', parcel_number: '123', Basin: '9', agree_terms: false, '12': false, field_6: 'نص حر' }),
    { answersWhenYes: answersYes })
  const notesHasSection = String(forms.buildDynamicNotes ? 'buildDynamicNotes still exported' : '')
  check('DEF-service-answers-3', 'generated "البيانات الإضافية المطلوبة:" notes builder removed from mobile', notesHasSection === '', { buildDynamicNotesExported: Boolean(forms.buildDynamicNotes) })

  // Wire shape: same FormData fields CreateOrderScreen appends.
  seen.length = 0
  const fd = new FormData()
  fd.append('service', '3'); fd.append('full_name', 'عميل'); fd.append('phone', '0790000000'); fd.append('national_id', ''); fd.append('city', 'عمان')
  fd.append('notes', 'ملاحظتي فقط'); fd.append('service_answers', JSON.stringify(answersNo)); fd.append('consent', 'true')
  await ordersApi.createOrder(fd, 'key-1')
  const post = seen.find((r) => r.path === '/api/orders/')
  const raw = Buffer.from(post.body, 'latin1').toString('utf8')
  const part = /name="service_answers"\r\n\r\n([\s\S]*?)\r\n--/.exec(raw)
  const notesPart = /name="notes"\r\n\r\n([\s\S]*?)\r\n--/.exec(raw)
  check('DEF-service-answers-4', 'POST /api/orders/ is multipart with service_answers = JSON object string; notes carries only customer text',
    post.contentType.startsWith('multipart/form-data') && part && JSON.stringify(JSON.parse(part[1])) === JSON.stringify(answersNo) && notesPart && notesPart[1] === 'ملاحظتي فقط' && !raw.includes('البيانات الإضافية المطلوبة'),
    { contentType: post.contentType.split(';')[0], service_answers: part && part[1], notes: notesPart && notesPart[1] })

  // Server validation errors keyed by field.
  try {
    await apiClient.post('/orders/', { x: 1 }, { headers: { 'x-case': 'invalid' } })
    check('DEF-service-answers-5', 'server service_answers / document_errors mapped', false, 'no error')
  } catch (error) {
    const e = normalizeApiError(error)
    check('DEF-service-answers-5', 'service_answers {key: msg} and document_errors {type: msg} exposed per key (interceptor-normalized error keeps them)',
      e.serviceAnswerErrors?.parcel_number === 'This field is required.' && e.serviceAnswerErrors?.visit_date && e.documentErrors?.national_id === 'Unsupported file type.' && e.fieldErrors?.phone?.[0],
      { serviceAnswerErrors: e.serviceAnswerErrors, documentErrors: e.documentErrors, fieldErrorKeys: Object.keys(e.fieldErrors || {}) })
  }

  // ---- 8. Arabic network / timeout / 5xx errors ----
  const arabic = (s) => /[\u0600-\u06FF]/.test(s) && !/Network Error|timeout of|Request failed|ECONNREFUSED/i.test(s)
  const errs = {}
  try { await apiClient.get('/server-500/') } catch (e) { errs.html500 = getDisplayError(e) }
  try { await apiClient.get('/server-json-500/') } catch (e) { errs.json500 = getDisplayError(e) }
  try { await apiClient.get('/slow/', { timeout: 300 }) } catch (e) { errs.timeout = getDisplayError(e) }
  try { await apiClient.get('http://127.0.0.1:1/api/x/') } catch (e) { errs.refused = getDisplayError(e) }
  try { await apiClient.get('/detail-400/') } catch (e) { errs.detail400 = getDisplayError(e) }
  check('DEF-M10', 'network, timeout and 5xx errors show Arabic text (no axios English); a server 4xx detail is still shown',
    arabic(errs.html500) && arabic(errs.json500) && arabic(errs.timeout) && arabic(errs.refused) && errs.detail400 === 'تم رفض الطلب لسبب محدد من الخادم.' && errs.timeout !== errs.refused,
    errs)

  // ---- 5. Download ----
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khalsni-dl-')) + path.sep
  const nodeDownload = async (url, target) => {
    const r = await fetch(url)
    const buf = Buffer.from(await r.arrayBuffer())
    fs.writeFileSync(target, buf)
    return { status: r.status, headers: Object.fromEntries(r.headers.entries()), uri: target }
  }
  const discard = async (uri) => { fs.rmSync(uri, { force: true }) }
  const run = (documentId, filename) => download.downloadDocumentWithToken({ apiBaseUrl: 'http://127.0.0.1:8097/api', documentId, filename, targetDirectory: tmp, getToken: (id) => documentsApi.getDownloadToken(id), download: nodeDownload, discard })
  const outcome = async (id, name) => { try { const uri = await run(id, name); return { ok: true, uri, content: fs.readFileSync(uri, 'utf8') } } catch (e) { return { ok: false, message: e.message, status: e.status } } }

  // Expired access token: token request goes through the axios 401 refresh path.
  const storeStub = require(path.join(here, 'stubs', 'authStore.js'))
  void storeStub
  seen.length = 0
  const good = await outcome(5, '../../evil/../report<1>.pdf')
  const tokenReqs = seen.filter((r) => r.path === '/api/documents/5/download-token/')
  const dlReq = seen.find((r) => r.path === '/api/documents/5/download/')
  check('DEF-M09-1', '2xx application/pdf is saved; token obtained via axios (401 -> refresh -> retry); download uses ?token= without bearer; filename sanitized inside target dir',
    good.ok && good.content.startsWith('%PDF') && path.dirname(good.uri) + path.sep === tmp && path.basename(good.uri) === '5-report_1_.pdf' && dlReq && /token=tok-5-/.test(dlReq.query) && !dlReq.auth,
    { uri: good.ok ? path.basename(good.uri) : good, tokenRequests: tokenReqs.map((r) => r.auth), downloadQuery: dlReq && dlReq.query, downloadAuth: dlReq && dlReq.auth })
  const r404 = await outcome(404, 'x.pdf')
  const r403 = await outcome(403, 'x.pdf')
  const r200json = await outcome(200, 'x.pdf')
  const leftovers = fs.readdirSync(tmp).filter((f) => !f.startsWith('5-'))
  check('DEF-M09-2', 'non-2xx (404, 403) and 200-with-JSON-body are refused with Arabic messages and the written file is deleted',
    !r404.ok && !r403.ok && !r200json.ok && arabic(r404.message) && arabic(r403.message) && arabic(r200json.message) && leftovers.length === 0,
    { r404, r403, r200json, leftoverFiles: leftovers })
  check('DEF-M09-3', 'sanitizeFilename strips traversal, separators, control and reserved characters',
    download.sanitizeFilename('..\\..\\windows\\system32\\a:b?.pdf') === 'a_b_.pdf' && download.sanitizeFilename('....') === 'document' && download.sanitizeFilename('/etc/passwd') === 'passwd' && download.sanitizeFilename('ok name.docx') === 'ok name.docx',
    { a: download.sanitizeFilename('..\\..\\windows\\system32\\a:b?.pdf'), b: download.sanitizeFilename('....'), c: download.sanitizeFilename('/etc/passwd') })

  // ---- 4. Env guard ----
  const envs = {}
  for (const name of ['prod_placeholder', 'prod_localhost', 'prod_http', 'prod_missing', 'prod_valid', 'dev_missing']) {
    const e = require(path.join(here, `env_${name}.cjs`)).env
    envs[name] = { apiBaseUrl: e.apiBaseUrl, configError: e.configError, isProduction: e.isProduction }
  }
  check('DEF-M04-1', 'production bundle refuses placeholder / localhost / http / missing URL (blocking configError, empty base URL); accepts real https; dev keeps local default',
    ['prod_placeholder', 'prod_localhost', 'prod_http', 'prod_missing'].every((n) => envs[n].configError && envs[n].apiBaseUrl === '' && envs[n].isProduction)
      && envs.prod_valid.configError === null && envs.prod_valid.apiBaseUrl === 'https://api.khalsni.jo/api'
      && envs.dev_missing.configError === null && envs.dev_missing.apiBaseUrl === 'http://127.0.0.1:8000/api',
    envs)
  const appConfig = require('D:/ghassan/mobile/app.config.js')
  const tryBuild = (profile, url) => {
    const saved = { p: process.env.EAS_BUILD_PROFILE, u: process.env.EXPO_PUBLIC_API_BASE_URL }
    if (profile === undefined) delete process.env.EAS_BUILD_PROFILE; else process.env.EAS_BUILD_PROFILE = profile
    if (url === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = url
    try { appConfig({ config: { name: 'x' } }); return 'ok' } catch (e) { return `throws: ${e.message.slice(0, 90)}` } finally {
      if (saved.p === undefined) delete process.env.EAS_BUILD_PROFILE; else process.env.EAS_BUILD_PROFILE = saved.p
      if (saved.u === undefined) delete process.env.EXPO_PUBLIC_API_BASE_URL; else process.env.EXPO_PUBLIC_API_BASE_URL = saved.u
    }
  }
  const builds = {
    production_example: tryBuild('production', 'https://api.example.com'),
    production_missing: tryBuild('production', undefined),
    preview_loopback: tryBuild('preview', 'http://127.0.0.1:8000'),
    production_valid: tryBuild('production', 'https://api.khalsni.jo'),
    local_expo_start: tryBuild(undefined, undefined),
  }
  check('DEF-M04-2', 'app.config.js fails EAS preview/production builds without a real https URL; passes valid URL and local dev',
    builds.production_example.startsWith('throws') && builds.production_missing.startsWith('throws') && builds.preview_loopback.startsWith('throws') && builds.production_valid === 'ok' && builds.local_expo_start === 'ok',
    builds)
  const easJson = fs.readFileSync('D:/ghassan/mobile/eas.json', 'utf8')
  check('DEF-M04-3', 'eas.json no longer names api.example.com or 127.0.0.1', !/example\.com|127\.0\.0\.1/.test(easJson), { easJsonHasPlaceholder: /example\.com|127\.0\.0\.1/.test(easJson) })

  // ---- 2/3. Presentation ----
  const logs = [
    { id: 2, new_status: 'REJECTED', note: 'الوثيقة منتهية الصلاحية، يرجى تقديم طلب جديد.', system_event: '', created_at: '2026-10-02T10:00:00Z' },
    { id: 1, new_status: 'UNDER_REVIEW', note: 'Order under review', system_event: 'order_under_review', created_at: '2026-10-01T10:00:00Z' },
  ]
  check('DEF-M02', 'timeline: system_event rendered in Arabic, sorted oldest first; REJECTED reason taken from the timeline note (fallback rejection_reason); status labels Arabic',
    timeline.describeTimelineNote(logs[1]) === 'الطلب قيد المراجعة.' && timeline.sortTimeline(logs)[0].id === 1
      && timeline.getClosureReason({ status: 'REJECTED', status_logs: logs }) === logs[0].note
      && timeline.getClosureReason({ status: 'CANCELLED', status_logs: [], rejection_reason: 'سبب' }) === 'سبب'
      && status.getStatusLabel('REJECTED') === 'مرفوض',
    { underReview: timeline.describeTimelineNote(logs[1]), closureReason: timeline.getClosureReason({ status: 'REJECTED', status_logs: logs }), recovered: timeline.describeTimelineNote({ system_event: 'missing_request_recovered', system_event_params: { reason: 'خطأ' } }) })
  const docStatuses = ['uploaded', 'pending_review', 'approved', 'rejected', 'pending_scan', 'archived'].map((s) => status.getStatusLabel(s))
  const reqs = [{ document_type: 'client-audit-authorization', name_ar: 'تفويض رسمي', allowed_extensions: ['pdf'], max_file_size: 2 * 1024 * 1024 }, { document_type: 'passport', name_ar: 'Passport' }]
  const big = forms.validateUploadableFile({ uri: 'x', name: 'a.pdf', size: 3 * 1024 * 1024 }, reqs[0])
  const wrongExt = forms.validateUploadableFile({ uri: 'x', name: 'a.png', size: 10 }, reqs[0])
  const docxDefault = forms.validateUploadableFile({ uri: 'x', name: 'a.docx', size: 10 }, null)
  check('DEF-M03', 'document statuses Arabic; requested documents labelled by Arabic name (never the code); per-requirement extensions/size enforced; .docx allowed by global fallback',
    docStatuses.every(arabic) && docs.describeMissingDocuments(['client-audit-authorization', 'passport', 'unknown_code'], reqs).join('|') === 'تفويض رسمي|مستند مطلوب|مستند مطلوب'
      && docs.getDocumentTypeLabel({ document_type_label: { ar: 'جواز السفر', en: 'Passport' } }) === 'جواز السفر' && docs.getDocumentTypeLabel({}) === 'مستند'
      && big && wrongExt && docxDefault === null,
    { docStatuses, missing: docs.describeMissingDocuments(['client-audit-authorization', 'passport', 'unknown_code'], reqs), big, wrongExt, docxDefault })

  // =================== Total-closure checks (Stream D) ===================
  const { authApi, publicSiteApi, registration, tracking, rating, legal, messages, consent, delivery, format, roles, complaints } = m
  const src = (p) => fs.readFileSync(path.join('D:/ghassan/mobile', p), 'utf8')
  const lastBody = (p) => { const r = [...seen].reverse().find((x) => x.path === p); return r ? { ...r, json: (() => { try { return JSON.parse(Buffer.from(r.body, 'latin1').toString('utf8')) } catch { return null } })() } : null }

  // ---- 1. Registration ----
  const form = { full_name: '  سارة أحمد ', phone: ' 079 123 4567 ', email: ' sara@example.jo ', national_id: '   ', password: ' pass word9 ' }
  const payload = registration.buildRegisterPayload(form)
  const localErrs = registration.validateRegisterForm({ full_name: '', phone: '', email: 'bad', national_id: '', password: 'short' })
  seen.length = 0
  const created = await authApi.register(payload)
  const regReq = lastBody('/api/auth/register/')
  check('TC-REG-1', 'register payload: text trimmed, blank national_id omitted, password untouched; POST /api/auth/register/ JSON with Accept-Language ar; client-side required/min-length errors Arabic',
    JSON.stringify(payload) === JSON.stringify({ full_name: 'سارة أحمد', phone: '079 123 4567', email: 'sara@example.jo', password: ' pass word9 ' })
      && regReq && regReq.method === 'POST' && regReq.lang === 'ar' && regReq.contentType.startsWith('application/json') && JSON.stringify(regReq.json) === JSON.stringify(payload)
      && created.email === 'sara@example.jo'
      && Object.keys(localErrs).sort().join(',') === 'email,full_name,password,phone' && Object.values(localErrs).every((v) => /[\u0600-\u06FF]/.test(v)),
    { payload, request: regReq && { method: regReq.method, lang: regReq.lang, contentType: regReq.contentType, body: regReq.json }, localErrs })
  let mappedFieldErr, mappedThrottle
  try { await authApi.register({ ...payload, email: 'taken@example.jo' }) } catch (e) { mappedFieldErr = registration.mapRegisterErrors(normalizeApiError(e)) }
  try { await authApi.register({ ...payload, email: 'throttle@example.jo' }) } catch (e) { mappedThrottle = registration.mapRegisterErrors(normalizeApiError(e)) }
  const onlyFields = registration.mapRegisterErrors({ message: 'x', status: 400, fieldErrors: { phone: ['رقم غير صحيح'] } })
  check('TC-REG-2', 'server field errors land on their fields (first message each, Arabic server text); non_field_errors -> general; field-only error -> no general banner; 429 -> general server detail',
    mappedFieldErr && mappedFieldErr.fieldErrors.email === 'يوجد حساب مسجل بهذا البريد الإلكتروني.' && mappedFieldErr.fieldErrors.phone.startsWith('أدخل رقم هاتف صحيحاً') && mappedFieldErr.fieldErrors.password === 'كلمة المرور هذه شائعة جداً.'
      && mappedFieldErr.general === 'تعذر إنشاء الحساب الآن.' && onlyFields.general === '' && onlyFields.fieldErrors.phone === 'رقم غير صحيح'
      && mappedThrottle && mappedThrottle.general === 'تم تجاوز عدد المحاولات. حاول لاحقاً.' && Object.keys(mappedThrottle.fieldErrors).length === 0,
    { mappedFieldErr, mappedThrottle, onlyFields })
  const webPolicy = fs.readFileSync('D:/ghassan/frontend/src/utils/passwordPolicy.js', 'utf8')
  const webPhone = fs.readFileSync('D:/ghassan/frontend/src/utils/phoneInput.js', 'utf8')
  const regScreen = src('src/screens/auth/RegisterScreen.tsx'), authNav = src('src/navigation/AuthNavigator.tsx'), login = src('src/screens/auth/LoginScreen.tsx')
  check('TC-REG-3', 'password rules and phone hint mirror the web text; Register screen is in the auth stack and linked from Login; signs in after creation with fallback to Login(email prefilled)',
    registration.PASSWORD_RULES_AR.slice(1).every((r) => webPolicy.includes(r)) && webPolicy.includes('أحرف على الأقل') && webPhone.includes(registration.PHONE_FORMAT_HINT_AR)
      && /name="Register" component=\{RegisterScreen\}/.test(authNav) && /navigate\('Register'\)/.test(login)
      && /signIn\(\{ email: createdEmail/.test(regScreen) && /replace\('Login', \{ email: createdEmail, registered: true \}\)/.test(regScreen) && /route\?\.params\?\.email/.test(login),
    { rules: registration.PASSWORD_RULES_AR, phoneHint: registration.PHONE_FORMAT_HINT_AR })

  // ---- 2. Public tracking ----
  seen.length = 0
  const params = tracking.buildTrackParams({ orderNumber: ' kh-2026-٠٠٠١٢٣ ', phone: ' 0791234567 ' })
  const tracked = await ordersApi.trackOrder(params)
  const trackReq = seen.find((r) => r.path === '/api/orders/track/')
  const summary = tracking.summarizeTracking(tracked)
  check('TC-TRACK-1', 'GET /api/orders/track/?order_number=&phone= (trimmed, Arabic digits -> Latin, upper-cased); Arabic status; missing documents by Arabic name (English name masked); upload needs sign-in',
    trackReq && trackReq.method === 'GET' && trackReq.query === '?order_number=KH-2026-000123&phone=0791234567' && !trackReq.body
      && summary.statusLabel && /[\u0600-\u06FF]/.test(summary.statusLabel) && summary.missingDocuments.join('|') === 'صورة الهوية|مستند مطلوب' && summary.needsCustomerUpload === true && summary.timeline.length === 2,
    { query: trackReq && trackReq.query, summary })
  let notFound
  try { await ordersApi.trackOrder(tracking.buildTrackParams({ orderNumber: 'KH-1', phone: '0790000000' })) } catch (e) { notFound = tracking.describeTrackError(normalizeApiError(e)) }
  const emptyErrs = tracking.validateTrackInput({ orderNumber: ' ', phone: '' })
  const trackScreen = src('src/screens/public/TrackOrderScreen.tsx'), dash = src('src/features/client/screens/ClientDashboardScreen.tsx')
  check('TC-TRACK-2', '404 -> specific Arabic not-found message; both fields required; screen offers sign-in for uploads; reachable from Login and dashboard, and /track-order links go to TrackOrder (not MyOrders)',
    notFound === tracking.TRACK_NOT_FOUND_MESSAGE && emptyErrs.orderNumber && emptyErrs.phone
      && /سجّل الدخول لرفع المستندات/.test(trackScreen) && /navigate\('TrackOrder'\)/.test(login) && /startsWith\('\/track-order'\)\) \{\s*navigation\.navigate\('TrackOrder'\)/.test(dash)
      && /name="TrackOrder"/.test(authNav) && /name="TrackOrder"/.test(src('src/navigation/ClientNavigator.tsx')),
    { notFound, emptyErrs })

  // ---- 3. Rating ----
  seen.length = 0
  const ratingPayload = rating.buildRatingPayload(5, '  خدمة ممتازة  ')
  const rated = await ordersApi.submitRating(7, ratingPayload)
  const rateReq = lastBody('/api/customer/orders/7/rating/')
  check('TC-RATE-1', 'rating payload {score, comment?} (comment trimmed, blank omitted) POSTed as JSON to /customer/orders/<id>/rating/; 1..5 integers only; rateable only when COMPLETED and unrated',
    JSON.stringify(ratingPayload) === JSON.stringify({ score: 5, comment: 'خدمة ممتازة' }) && JSON.stringify(rating.buildRatingPayload(3, '   ')) === JSON.stringify({ score: 3 })
      && rateReq && rateReq.method === 'POST' && JSON.stringify(rateReq.json) === JSON.stringify(ratingPayload) && rated.score === 5
      && [0, 6, 2.5, null].every((s) => rating.validateRating(s)) && [1, 5].every((s) => rating.validateRating(s) === null)
      && rating.canRateOrder({ status: 'COMPLETED', rating: null }) && !rating.canRateOrder({ status: 'COMPLETED', rating: { id: 1, score: 4 } }) && !rating.canRateOrder({ status: 'IN_PROGRESS', rating: null }),
    { ratingPayload, request: rateReq && rateReq.json })
  const ratingCard = src('src/features/client/OrderRatingCard.tsx')
  check('TC-RATE-2', 'stars are 52x52 touch targets with radio semantics; existing rating rendered instead of the form', /width: 52,\s*height: 52/.test(ratingCard) && /accessibilityRole="radio"/.test(ratingCard) && /if \(order\.rating\)/.test(ratingCard), {})

  // ---- 4. Order detail: delivery date / notes ----
  const afterReview = delivery.describeExpectedDelivery({ expected_delivery_date: null }, { mode: 'after_review', label_ar: 'تُحدَّد مدة الإنجاز بعد مراجعة الطلب.' })
  const custom = delivery.describeExpectedDelivery({ expected_delivery_date: null }, { mode: 'after_review', label_ar: 'نؤكد الموعد هاتفياً بعد المراجعة.' })
  const noService = delivery.describeExpectedDelivery({ expected_delivery_date: null }, null)
  const dated = delivery.describeExpectedDelivery({ expected_delivery_date: '2026-11-20' }, null)
  const detail = src('src/features/client/screens/ClientOrderDetailScreen.tsx')
  check('TC-DETAIL-1', 'expected delivery: a date when present, otherwise the service\'s "after review" sentence or the approved default; customer notes and customer-visible notes/messages rendered',
    afterReview === 'تُحدَّد مدة الإنجاز بعد مراجعة الطلب.' && custom === 'نؤكد الموعد هاتفياً بعد المراجعة.' && noService === delivery.AFTER_REVIEW_DELIVERY_NOTE_AR && dated !== '2026-11-20' && /20|٢٠/.test(dated)
      && /customer_notes/.test(detail) && /fallbackNotes=\{order\.notes\}/.test(detail) && /التسليم المتوقع/.test(detail),
    { afterReview, custom, noService, dated })

  // ---- 4b. Result delivery + complaints (coordinator addition) ----
  const d1 = delivery.describeResultDelivery(await ordersApi.getOrderDelivery(1))
  const d2 = delivery.describeResultDelivery(await ordersApi.getOrderDelivery(2))
  const d3 = delivery.describeResultDelivery(await ordersApi.getOrderDelivery(3))
  check('TC-DELIVERY-1', 'GET /customer/orders/<id>/delivery/: hidden for electronic without instructions; Arabic label + instructions otherwise; card placed next to the final result',
    d1 === null && d2 && d2.label === 'تسليم ورقي - استلام' && d2.instructions === 'استلم الأصل من مكتب عمّان مع الهوية.' && d3 && d3.label.startsWith('تسليم إلكتروني') && d3.instructions
      && delivery.describeResultDelivery({ delivery_method: 'paper_courier', delivery_method_label_ar: 'Paper', delivery_instructions: 'x' }).label === 'تسليم ورقي - توصيل'
      && /عرض المستند النهائي[\s\S]{0,200}<OrderResultDeliveryCard/.test(detail),
    { d1, d2, d3 })
  seen.length = 0
  const cList = await complaints.loadComplaints(5, (id) => ordersApi.getOrderComplaints(id))
  const cUnavailable = await complaints.loadComplaints(404, (id) => ordersApi.getOrderComplaints(id))
  const cCreated = await ordersApi.createOrderComplaint(5, complaints.buildComplaintPayload('  لم يتم التواصل معي  '))
  const cReq = lastBody('/api/customer/orders/5/complaints/')
  let cErr
  try { await ordersApi.createOrderComplaint(5, { description: '' }) } catch (e) { cErr = normalizeApiError(e).fieldErrors?.description?.[0] }
  check('TC-COMPLAINT-1', 'complaints GET list (oldest first) with «قيد المتابعة»/«تمت المعالجة»; POST {"description"} trimmed -> 201; empty rejected client-side and server error mapped; 404 -> section hidden',
    cList.state === 'ok' && cList.complaints.map((c) => c.id).join(',') === '29,30' && cList.complaints.map(complaints.complaintStatusLabel).join('|') === 'قيد المتابعة|تمت المعالجة'
      && cUnavailable.state === 'unavailable' && cReq.method === 'POST' && JSON.stringify(cReq.json) === JSON.stringify({ description: 'لم يتم التواصل معي' }) && cCreated.id === 31 && cCreated.is_resolved === false
      && complaints.validateComplaint('  ') && complaints.validateComplaint('x'.repeat(4001)) && complaints.validateComplaint('شكوى') === null && cErr === 'هذا الحقل مطلوب.'
      && /<OrderComplaintsCard/.test(detail),
    { statuses: cList.state === 'ok' && cList.complaints.map(complaints.complaintStatusLabel), request: cReq && cReq.json, cErr })

  // ---- 5. Safe areas (static) ----
  const appScreen = src('src/components/AppScreen.tsx'), appTsx = src('App.tsx'), clientNav = src('src/navigation/ClientNavigator.tsx')
  const screenFiles = []
  const walk = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p); else if (/Screen\.tsx$/.test(f.name)) screenFiles.push(p) } }
  walk('D:/ghassan/mobile/src')
  const bareEarlyReturns = screenFiles.filter((f) => /return <(LoadingState|ErrorState)\b/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.basename(f))
  check('TC-SAFE-1', 'AppScreen applies useSafeAreaInsets (top/sides; bottom on stacks) under SafeAreaProvider; back button «رجوع» on stacked screens; tab bar adds bottom inset; no screen returns a bare Loading/ErrorState outside AppScreen',
    /from 'react-native-safe-area-context'/.test(appScreen) && /useSafeAreaInsets\(\)/.test(appScreen) && /insets\.top/.test(appScreen) && /insets\.bottom/.test(appScreen)
      && /accessibilityLabel="رجوع"/.test(appScreen) && /navigation\?\.canGoBack\(\)/.test(appScreen) && /<SafeAreaProvider>/.test(appTsx)
      && /height: 62 \+ insets\.bottom/.test(clientNav) && bareEarlyReturns.length === 0
      && fs.existsSync('D:/ghassan/mobile/node_modules/react-native-safe-area-context/package.json'),
    { bareEarlyReturns, safeAreaPkg: JSON.parse(fs.readFileSync('D:/ghassan/mobile/node_modules/react-native-safe-area-context/package.json', 'utf8')).version })

  // ---- 6. Consent v2 + legal ----
  const createOrder = src('src/features/client/screens/CreateOrderScreen.tsx')
  const EXPECTED_CONSENT = 'أوافق على شروط الاستخدام وسياسة الخصوصية، وعلى استخدام بياناتي ومستنداتي لإنجاز هذه الخدمة فقط وإشعاري بأي نواقص.'
  const backendConsent = fs.readFileSync('D:/ghassan/backend/orders/consent.py', 'utf8')
  check('TC-CONSENT-1', 'consent version order-consent-mobile-v2 with the exact owner text; request sends consent_version + consent_source=mobile; legal links next to the switch',
    consent.ORDER_CONSENT_VERSION === 'order-consent-mobile-v2' && consent.ORDER_CONSENT_TEXT === EXPECTED_CONSENT && consent.ORDER_CONSENT_SOURCE === 'mobile'
      && /append\('consent_version', ORDER_CONSENT_VERSION\)/.test(createOrder) && /append\('consent_source', ORDER_CONSENT_SOURCE\)/.test(createOrder) && /<LegalLinks navigation=\{navigation\}/.test(createOrder),
    { version: consent.ORDER_CONSENT_VERSION, text: consent.ORDER_CONSENT_TEXT, backendHasV2: backendConsent.includes('order-consent-mobile-v2'), backendTextIdentical: backendConsent.includes(EXPECTED_CONSENT) })
  const legalResults = {}
  for (const mode of ['draft', 'approved', '404', '500']) {
    globalThis.__legalMode = mode
    legalResults[mode] = await legal.loadLegalDocument('privacy', (k) => publicSiteApi.getLegalDocument(k))
  }
  const legalScreen = src('src/screens/public/LegalDocumentScreen.tsx')
  check('TC-LEGAL-1', 'GET /public-site/legal/<kind>/: draft_requires_approval -> draft banner (exact text); approved -> no banner; 404 -> «لم تُنشر بعد»; 5xx -> Arabic error; body split into heading/paragraph/bullet; linked from consent, registration and account',
    legalResults.draft.state === 'published' && legalResults.draft.draft === true && legalResults.approved.state === 'published' && legalResults.approved.draft === false
      && legalResults['404'].state === 'not_published' && legalResults['500'].state === 'error' && /[\u0600-\u06FF]/.test(legalResults['500'].message)
      && legal.LEGAL_DRAFT_BANNER === 'مسودة — تتطلب موافقة المالك/المستشار القانوني قبل الاعتماد' && legal.LEGAL_NOT_PUBLISHED === 'لم تُنشر بعد'
      && /result\.draft \?[\s\S]{0,240}LEGAL_DRAFT_BANNER/.test(legalScreen) && /LEGAL_NOT_PUBLISHED/.test(legalScreen)
      && JSON.stringify(legal.splitLegalBody('# مقدمة\nنص\n- بند').map((b) => b.type)) === '["heading","paragraph","bullet"]'
      && /<LegalLinks/.test(regScreen) && /<LegalLinks/.test(src('src/screens/shared/SettingsScreen.tsx')) && !legal.isLegalKind('cookies') && legal.isLegalKind('terms'),
    { states: Object.fromEntries(Object.entries(legalResults).map(([k, v]) => [k, v.state + (v.state === 'published' ? `(draft=${v.draft})` : '')])) })

  // ---- 9. Messaging ----
  seen.length = 0
  const thread = await messages.loadOrderMessages(5, (id) => ordersApi.getOrderMessages(id))
  const sent = await ordersApi.sendOrderMessage(5, messages.buildMessagePayload('  مرحباً، أريد الاستفسار  '))
  const msgReq = lastBody('/api/customer/orders/5/messages/')
  const missing = await messages.loadOrderMessages(404, (id) => ordersApi.getOrderMessages(id))
  check('TC-MSG-1', 'messages: GET thread sorted oldest first with Arabic author labels; POST {"message"} trimmed JSON; 404 -> unavailable (fallback to notes, send box hidden); empty/too long rejected',
    thread.state === 'ok' && thread.messages.map((x) => x.id).join(',') === '7,8' && thread.messages.map(messages.messageAuthorLabel).join('|') === 'أنت|فريق الدعم'
      && msgReq.method === 'POST' && JSON.stringify(msgReq.json) === JSON.stringify({ message: 'مرحباً، أريد الاستفسار' }) && sent.author_role === 'customer'
      && missing.state === 'unavailable' && messages.validateMessage(' ') && messages.validateMessage('x'.repeat(2001)) && messages.validateMessage('سؤال') === null,
    { order: thread.state === 'ok' && thread.messages.map((x) => x.id), request: msgReq && msgReq.json, missing })

  // ---- 7/8. Brand, P3s ----
  const allSrc = []
  const walkAll = (dir) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walkAll(p); else if (/\.(tsx?|json)$/.test(f.name)) allSrc.push(p) } }
  walkAll('D:/ghassan/mobile/src')
  const brandHits = allSrc.concat(['D:/ghassan/mobile/App.tsx', 'D:/ghassan/mobile/app.json']).filter((f) => /خلّصني|Khalisni/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative('D:/ghassan/mobile', f))
  const devCopy = allSrc.filter((f) => /JWT|نفس منطق|بدون تغيير في القواعد|docs\/mobile|لا تملك endpoint/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative('D:/ghassan/mobile', f))
  check('TC-BRAND-1', 'no «خلّصني» / "Khalisni" in visible sources; brand constants «خلصني» | Khalsni; developer copy (JWT, "نفس منطق", "docs/mobile", endpoint) gone (M-22/M-23)',
    brandHits.length === 0 && devCopy.length === 0 && m.brand.BRAND_LOCKUP === 'خلصني | Khalsni', { brandHits, devCopy })
  check('TC-P3-M28', 'currency in Arabic like the web ("٥٠٫٠٠ د.أ"); step numbers without leading zero', format.formatCurrency(50) === '٥٠٫٠٠ د.أ' && format.formatCurrency('1250.5') === '١٬٢٥٠٫٥٠ د.أ' && format.formatCurrency(null) === 'غير محدد' && format.formatStepNumber(9) === '١٠' && !/0\{index \+ 1\}/.test(src('src/features/client/screens/ServiceDetailScreen.tsx')),
    { c50: format.formatCurrency(50), c1250: format.formatCurrency('1250.5'), step10: format.formatStepNumber(9) })
  const schema = forms.getServiceSchemaFields({ required_information_schema: [
    { name: 'visit', type: 'date', label_en: 'Visit date' },
    { name: 'kind', type: 'select', label_ar: 'النوع', placeholder: 'Choose', options: ['residential', 'سكني', { value: 'x', label: 'Commercial' }, { value: '3' }] },
    { name: 'mobile', type: 'tel', label_ar: 'الهاتف', placeholder: '0791234567' },
  ] })
  const dateErr = forms.validateSchemaAnswerFormat(schema[0], '2026/01/31')
  const answers = forms.buildServiceAnswers(schema, { [schema[0].inputName]: '٢٠٢٦-٠١-٣١', [schema[1].inputName]: 'x', [schema[2].inputName]: '٠٧٩١٢٣٤٥٦٧' })
  check('TC-P3-M18', 'date fields: YYYY-MM-DD placeholder + Arabic hint, invalid date -> Arabic error, Arabic digits sent Latin; English-only label -> «معلومة مطلوبة N»; options without Arabic label -> «خيار N»; English placeholder dropped, format example kept',
    schema[0].label === 'معلومة مطلوبة 1' && schema[0].placeholder === forms.DATE_PLACEHOLDER && schema[0].helpText === forms.DATE_HINT_AR && dateErr && /[\u0600-\u06FF]/.test(dateErr)
      && forms.validateSchemaAnswerFormat(schema[0], '٢٠٢٦-٠١-٣١') === null && answers.visit === '2026-01-31' && answers.mobile === '0791234567'
      && schema[1].options.map((o) => o.label).join('|') === 'خيار 1|سكني|خيار 3|3' && schema[1].options[0].value === 'residential' && schema[1].placeholder === '' && schema[2].placeholder === '0791234567',
    { labels: schema.map((f) => f.label), options: schema[1].options, dateErr, answers })
  check('TC-P3-M20-M21', 'no silent first-service preselection; unknown/zero file size refused (resolveFileSize tried first in every picker)',
    !/servicesQuery\.data\[0\]\.id/.test(createOrder) && forms.validateUploadableFile({ uri: 'x', name: 'a.pdf' }, null) && forms.validateUploadableFile({ uri: 'x', name: 'a.pdf', size: 0 }, null)
      && forms.validateUploadableFile({ uri: 'x', name: 'a.pdf', size: 1000 }, null) === null
      && ['src/features/client/screens/CreateOrderScreen.tsx', 'src/features/client/screens/RespondToMissingDocumentScreen.tsx', 'src/features/documents/DocumentUploadWidget.tsx'].every((p) => /await resolveFileSize\(/.test(src(p))),
    { unknown: forms.validateUploadableFile({ uri: 'x', name: 'a.pdf' }, null) })
  const profile = src('src/screens/shared/ProfileScreen.tsx'), rootNav = src('src/navigation/RootNavigator.tsx')
  check('TC-P3-M24-M29', 'role label Arabic; profile edits email + national_id (current_password on email/phone change, server field errors on fields); unknown role -> null -> UnknownRoleScreen (never customer UI)',
    roles.getRoleLabel('client') === 'العميل' && roles.normalizeRole('customer') === 'client' && roles.normalizeRole('support') === 'employee' && roles.normalizeRole('auditor') === null && roles.normalizeRole(undefined) === null
      && /email: email\.trim\(\)/.test(profile) && /national_id: nationalId\.trim\(\)/.test(profile) && /current_password: currentPassword/.test(profile)
      && /<UnknownRoleScreen \/>/.test(rootNav) && /role === 'admin' \?/.test(rootNav),
    { auditor: roles.normalizeRole('auditor') })
  const notif = src('src/features/notifications/screens/NotificationsScreen.tsx')
  check('TC-P3-M25-M26-M30', 'notifications show title + mark-all-read; UploadOrderDocumentsScreen removed and MissingDocumentRequests reachable from the dashboard; homepage failure does not block the dashboard',
    /item\.title/.test(notif) && /markAllAsRead/.test(notif) && !fs.existsSync('D:/ghassan/mobile/src/features/client/screens/UploadOrderDocumentsScreen.tsx') && !/UploadOrderDocuments/.test(clientNav)
      && /navigate\('MissingDocumentRequests'\)/.test(dash) && !/homepageQuery\.isError/.test(dash) && !/homepageQuery\.isLoading/.test(dash),
    {})
  const plugin = require('D:/ghassan/mobile/plugins/withLtrLayoutLock.js')
  const manifest = plugin.lockApplicationLtr({ manifest: { application: [{ $: { 'android:name': '.MainApplication', 'android:supportsRtl': 'true' } }] } })
  const cfg = appConfig({ config: { name: 'x', plugins: ['expo-font'] } })
  const indexTs = src('index.ts')
  check('TC-P3-M27', 'RTL policy: explicit row-reverse/right-align with native RTL locked off - plugin writes android:supportsRtl="false", app.config adds it, index.ts calls allowRTL(false)/forceRTL(false); README documents it',
    manifest.manifest.application[0].$['android:supportsRtl'] === 'false' && cfg.plugins.includes('./plugins/withLtrLayoutLock') && cfg.plugins.includes('expo-font')
      && /I18nManager\.allowRTL\(false\)/.test(indexTs) && /I18nManager\.forceRTL\(false\)/.test(indexTs) && /## RTL policy/.test(src('README.md')),
    { supportsRtl: manifest.manifest.application[0].$['android:supportsRtl'], plugins: cfg.plugins })

  server.close()
  const out = { generated: new Date().toISOString(), adapter: 'axios Node http adapter (not React Native XHR)', passed: results.filter((r) => r.pass).length, total: results.length, results }
  fs.writeFileSync(path.join(here, 'harness_output.json'), JSON.stringify(out, null, 2))
  const evidence = 'D:/ghassan/docs/audit/evidence/khalsni-total-closure-2026-11-01/mobile'
  fs.mkdirSync(evidence, { recursive: true })
  fs.writeFileSync(path.join(evidence, 'mobile_harness_output.json'), JSON.stringify(out, null, 2))
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}`)
  console.log(`${out.passed}/${out.total}`)
  process.exit(out.passed === out.total ? 0 : 1)
}

main().catch((e) => { console.error(e); server.close(); process.exit(2) })
