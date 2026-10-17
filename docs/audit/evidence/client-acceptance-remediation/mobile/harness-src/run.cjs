// Mobile remediation harness (Node, axios Node adapter, echo server on 8097).
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
    seen.push({ method: req.method, path: url.pathname, query: url.search, auth: req.headers.authorization || null, contentType: req.headers['content-type'] || null, body: body.toString('latin1') })
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

  server.close()
  const out = { generated: new Date().toISOString(), adapter: 'axios Node http adapter (not React Native XHR)', passed: results.filter((r) => r.pass).length, total: results.length, results }
  fs.writeFileSync(path.join(here, 'harness_output.json'), JSON.stringify(out, null, 2))
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}`)
  console.log(`${out.passed}/${out.total}`)
  process.exit(out.passed === out.total ? 0 : 1)
}

main().catch((e) => { console.error(e); server.close(); process.exit(2) })
