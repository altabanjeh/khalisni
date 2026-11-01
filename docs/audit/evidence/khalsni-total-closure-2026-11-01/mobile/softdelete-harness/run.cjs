// SD-MOB harness: mobile admin delete / restore + Active/Deleted/All filter.
// Node + axios Node adapter against an echo server on 8098. Proves the client
// contract (URLs, query params, DELETE body, Accept-Language, error display,
// role gating) and the screen wiring by source inspection; no RN rendering.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const here = __dirname
const results = []
const check = (id, name, pass, evidence) => results.push({ id, name, pass: Boolean(pass), evidence })
const src = (p) => fs.readFileSync(path.join('D:/ghassan/mobile', p), 'utf8')

const PASSWORD = 'Password@123'
const seen = []
const server = http.createServer((req, res) => {
  const chunks = []
  req.on('data', (c) => chunks.push(c))
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    const url = new URL(req.url, 'http://127.0.0.1:8098')
    const body = raw ? JSON.parse(raw) : null
    seen.push({ method: req.method, path: url.pathname, query: url.search, lang: req.headers['accept-language'] || null, contentType: req.headers['content-type'] || null, body })
    const json = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
    const q = url.searchParams
    const withDeleted = q.get('include_deleted') === 'true'
    const narrow = (rows) => {
      if (!withDeleted) return rows.filter((r) => !r.is_deleted)
      if (q.get('is_deleted') === 'true') return rows.filter((r) => r.is_deleted)
      return rows
    }

    const services = [{ id: 5, name_ar: 'خدمة نشطة', slug: 's5', is_deleted: false }, { id: 6, name_ar: 'خدمة محذوفة', slug: 's6', is_deleted: true }]
    const users = [{ id: 7, full_name: 'مستخدم', role: 'employee', is_deleted: false, role_options: ['admin', 'employee'] }, { id: 8, full_name: 'محذوف', role: 'provider', is_deleted: true }]
    const ads = [{ advertisement_id: 3, title_ar: 'إعلان', is_deleted: false }, { advertisement_id: 4, title_ar: 'إعلان محذوف', is_deleted: true }]

    if (req.method === 'GET' && url.pathname === '/api/admin/services/') { const r = narrow(services); return json(200, { count: r.length, next: null, previous: null, results: r }) }
    if (req.method === 'GET' && url.pathname === '/api/admin/users/') { const r = narrow(users); return json(200, { count: r.length, next: null, previous: null, results: r }) }
    // The advertisements endpoint ignores is_deleted (only include_deleted), like AdvertisementAdminViewSet.
    if (req.method === 'GET' && url.pathname === '/api/admin/public-site/advertisements/') return json(200, withDeleted ? ads : ads.filter((r) => !r.is_deleted))

    const del = /^\/api\/admin\/(services|users|public-site\/advertisements)\/(\d+)\/$/.exec(url.pathname)
    if (req.method === 'DELETE' && del) {
      if (del[2] === '403') return json(403, { detail: 'الحذف أو الإيقاف متاح للمديرين فقط.' })
      if (!body || !body.delete_password) return json(400, { delete_password: 'أدخل كلمة مرور حسابك الإداري الحالية لتأكيد الحذف.' })
      if (body.delete_password !== PASSWORD) return json(400, { delete_password: 'كلمة مرور حسابك الإداري غير صحيحة.' })
      res.statusCode = 204
      return res.end()
    }
    const restore = /^\/api\/admin\/(services|users|public-site\/advertisements)\/(\d+)\/restore\/$/.exec(url.pathname)
    if (req.method === 'POST' && restore) return json(200, { id: Number(restore[2]), is_deleted: false })
    return json(404, { detail: 'Not found.' })
  })
})

const last = (method, p) => [...seen].reverse().find((r) => r.method === method && r.path === p)

async function main() {
  await new Promise((r) => server.listen(8098, '127.0.0.1', r))
  const { servicesApi, usersApi, adminApi, softDelete, getDisplayError } = require(path.join(here, 'bundle.cjs'))

  // 1. Filter options and params
  check('SD-MOB-1', 'filter options are Active/Deleted/All in Arabic with Active as default; params mirror the web (include_deleted, server-side is_deleted where supported)',
    softDelete.DEFAULT_SOFT_DELETE_STATUS === 'active'
      && softDelete.SOFT_DELETE_STATUS_OPTIONS.map((o) => o.value).join('|') === 'active|deleted|all'
      && softDelete.SOFT_DELETE_STATUS_OPTIONS.map((o) => o.label).join('|') === 'النشطة|المحذوفة|الكل'
      && JSON.stringify(softDelete.softDeleteListParams('active', true)) === '{}'
      && JSON.stringify(softDelete.softDeleteListParams('deleted', true)) === '{"include_deleted":true,"is_deleted":true}'
      && JSON.stringify(softDelete.softDeleteListParams('deleted')) === '{"include_deleted":true}'
      && JSON.stringify(softDelete.softDeleteListParams('all', true)) === '{"include_deleted":true}',
    { options: softDelete.SOFT_DELETE_STATUS_OPTIONS })

  // 2. Lists
  const svcDeleted = softDelete.filterBySoftDeleteStatus(await servicesApi.getAdminServices(softDelete.softDeleteListParams('deleted', true)), 'deleted')
  const svcQuery = last('GET', '/api/admin/services/').query
  const svcActive = await servicesApi.getAdminServices(softDelete.softDeleteListParams('active', true))
  const usrAll = await usersApi.getUsers(softDelete.softDeleteListParams('all', true))
  const usrQuery = last('GET', '/api/admin/users/').query
  const adsDeleted = softDelete.filterBySoftDeleteStatus(await adminApi.getAdminAdvertisements(softDelete.softDeleteListParams('deleted')), 'deleted')
  const adsQuery = last('GET', '/api/admin/public-site/advertisements/').query
  check('SD-MOB-2', 'lists: services deleted -> ?include_deleted=true&is_deleted=true; active -> no params; users all -> include_deleted only; advertisements deleted -> include_deleted then client filter',
    svcQuery === '?include_deleted=true&is_deleted=true' && svcDeleted.map((r) => r.id).join() === '6' && svcActive.map((r) => r.id).join() === '5'
      && usrQuery === '?include_deleted=true' && usrAll.length === 2
      && adsQuery === '?include_deleted=true' && adsDeleted.map((r) => r.advertisement_id).join() === '4',
    { svcQuery, usrQuery, adsQuery, svcDeleted: svcDeleted.map((r) => r.id), adsDeleted: adsDeleted.map((r) => r.advertisement_id) })

  // 3. Guarded DELETE body
  await servicesApi.deleteAdminService(5, ` ${PASSWORD} `, '  خدمة متوقفة  ')
  await usersApi.deleteUser(7, PASSWORD, 'حساب مكرر')
  await adminApi.deleteAdminAdvertisement(3, PASSWORD, 'إعلان منتهي')
  const d1 = last('DELETE', '/api/admin/services/5/')
  const d2 = last('DELETE', '/api/admin/users/7/')
  const d3 = last('DELETE', '/api/admin/public-site/advertisements/3/')
  check('SD-MOB-3', 'DELETE sends JSON { delete_password, delete_reason } (trimmed) with Accept-Language: ar for services, users and advertisements',
    [d1, d2, d3].every((r) => r && r.lang === 'ar' && /application\/json/.test(r.contentType || '') && r.body.delete_password === PASSWORD)
      && d1.body.delete_reason === 'خدمة متوقفة' && d2.body.delete_reason === 'حساب مكرر' && d3.body.delete_reason === 'إعلان منتهي',
    { services: d1 && d1.body, users: d2 && d2.body, ads: d3 && d3.body })

  // 4. Server errors are shown as sent (localized by the API)
  let wrong = null
  let forbidden = null
  let empty = null
  try { await servicesApi.deleteAdminService(5, 'Wrong@123', 'سبب') } catch (e) { wrong = getDisplayError(e) }
  try { await usersApi.deleteUser(403, PASSWORD, 'سبب') } catch (e) { forbidden = getDisplayError(e) }
  const before = seen.length
  try { await adminApi.deleteAdminAdvertisement(3, '   ', 'سبب') } catch (e) { empty = getDisplayError(e) }
  check('SD-MOB-4', 'wrong password / 403 show the Arabic server message; an empty password is refused before any request',
    wrong === 'كلمة مرور حسابك الإداري غير صحيحة.' && forbidden === 'الحذف أو الإيقاف متاح للمديرين فقط.' && empty === 'كلمة مرور المشرف الحالية مطلوبة.' && seen.length === before,
    { wrong, forbidden, empty })

  // 5. Restore
  await servicesApi.restoreAdminService(6)
  await usersApi.restoreUser(8)
  await adminApi.restoreAdminAdvertisement(4)
  const r1 = last('POST', '/api/admin/services/6/restore/')
  const r2 = last('POST', '/api/admin/users/8/restore/')
  const r3 = last('POST', '/api/admin/public-site/advertisements/4/restore/')
  check('SD-MOB-5', 'restore POSTs <resource>/<id>/restore/ for services, users and advertisements (advertisement_id key)',
    [r1, r2, r3].every((r) => r && r.lang === 'ar'), { r1: !!r1, r2: !!r2, r3: !!r3 })

  // 6. Form validation
  const errs = softDelete.validateSoftDeleteForm({ delete_reason: '  ', delete_password: '' })
  const ok = softDelete.validateSoftDeleteForm({ delete_reason: 'سبب', delete_password: 'x' })
  check('SD-MOB-6', 'modal validation: reason and admin password both required, Arabic messages',
    errs.delete_reason === 'سبب الحذف مطلوب.' && errs.delete_password === 'كلمة مرور حسابك الإداري الحالية مطلوبة.' && Object.keys(ok).length === 0, { errs })

  // 7. Role gating
  const c = softDelete.canSoftDeleteRecords
  const matrix = {
    admin: c({ role: 'admin' }), employee: c({ role: 'employee' }), support: c({ role: 'support' }), provider: c({ role: 'provider' }), customer: c({ role: 'customer' }), none: c(null),
    superuser: c({ role: 'employee', is_superuser: true }),
    platformMembership: c({ role: 'employee', memberships: [{ role: 'platform_super_admin', is_active: true }] }),
    inactiveMembership: c({ role: 'employee', memberships: [{ role: 'platform_super_admin', is_active: false }] }),
    partnerOwner: c({ role: 'employee', memberships: [{ role: 'partner_owner', is_active: true }] }),
  }
  const m = softDelete.canManageUserRecord
  check('SD-MOB-7', 'actions only for backend is_platform_super_admin (admin role, superuser, active platform_super_admin membership); per-row admin-account rule matches the web',
    matrix.admin && !matrix.employee && !matrix.support && !matrix.provider && !matrix.customer && !matrix.none && matrix.superuser && matrix.platformMembership && !matrix.inactiveMembership && !matrix.partnerOwner
      && m({ role: 'admin' }, true) && !m({ role: 'admin' }, false) && !m({ role: 'employee', is_super_admin: true }, false) && m({ role: 'employee' }, false),
    matrix)

  // 8. Screen wiring (source)
  const screens = {
    ManageServicesScreen: { key: "['admin-services']", file: src('src/features/admin/screens/ManageServicesScreen.tsx') },
    ManageUsersScreen: { key: "['admin-users']", file: src('src/features/admin/screens/ManageUsersScreen.tsx') },
    ManageAdvertisementsScreen: { key: "['admin-ads']", file: src('src/features/admin/screens/ManageAdvertisementsScreen.tsx') },
  }
  const wiring = Object.fromEntries(Object.entries(screens).map(([name, { key, file }]) => [name, {
    filter: file.includes('<SoftDeleteFilter value={status}') && file.includes('useState<SoftDeleteStatus>(DEFAULT_SOFT_DELETE_STATUS)'),
    modal: file.includes('<AdminSoftDeleteModal') && file.includes('serverError={softDelete.deleteError}'),
    restore: file.includes('<ConfirmDialog') && file.includes('onRestore={() => softDelete.requestRestore(item)}'),
    gated: file.includes('{softDelete.canSoftDelete ? ('),
    invalidates: file.includes(`invalidateKeys: [${key}]`),
  }]))
  const hook = src('src/features/admin/hooks/useAdminSoftDelete.ts')
  check('SD-MOB-8', 'services, users and advertisements screens: filter (default Active), delete modal with server error, restore confirm, role-gated actions, list invalidation after mutations',
    Object.values(wiring).every((w) => Object.values(w).every(Boolean)) && hook.includes('invalidateQueries({ queryKey })') && hook.includes('onError: (error) => setDeleteError(getDisplayError(error))'),
    wiring)

  // 9. Accessibility
  const filter = src('src/components/SoftDeleteFilter.tsx')
  const modal = src('src/components/AdminSoftDeleteModal.tsx')
  const actions = src('src/components/SoftDeleteRowActions.tsx')
  check('SD-MOB-9', 'a11y: radiogroup/radio with checked state and 44pt options; modal shows record name + impact, secure password field, alert role on server error; row buttons 44pt with labels naming the record',
    filter.includes('accessibilityRole="radiogroup"') && filter.includes('accessibilityRole="radio"') && filter.includes('accessibilityState={{ checked: selected, selected }}') && filter.includes('minHeight: 44')
      && modal.includes('{recordName}') && modal.includes('{impact}') && modal.includes('secureTextEntry') && modal.includes('accessibilityRole="alert"') && modal.includes('accessibilityViewIsModal')
      && actions.includes('minHeight: 44') && actions.includes('accessibilityLabel={`${deleteLabel}: ${recordName}`}'),
    {})

  server.close()
  const out = { generated: new Date().toISOString(), requirement: 'SD-MOB', adapter: 'axios Node http adapter (not React Native XHR)', passed: results.filter((r) => r.pass).length, total: results.length, results }
  fs.writeFileSync(path.join(here, '..', 'mobile_softdelete_harness_output.json'), JSON.stringify(out, null, 2))
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}`)
  console.log(`${out.passed}/${out.total}`)
  process.exit(out.passed === out.total ? 0 : 1)
}

main().catch((e) => { console.error(e); server.close(); process.exit(2) })
