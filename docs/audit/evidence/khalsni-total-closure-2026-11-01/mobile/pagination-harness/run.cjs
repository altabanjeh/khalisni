// Mobile admin pagination + deletion-details harness (loose-end closure 2026-11-02).
// Node + axios Node adapter against a DRF-shaped server on 8099 (page size 20,
// `next` links built with an internal host, as behind a proxy). Proves that rows
// beyond page 1 are reachable through the same infinite-query options the
// screens use (usePagedList), that pickers read every page, and that a deleted
// row shows the reason / time / actor the API returns. Screen wiring is checked
// by source inspection; no RN rendering.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const here = __dirname
const results = []
const check = (id, name, pass, evidence) => results.push({ id, name, pass: Boolean(pass), evidence })
const src = (p) => fs.readFileSync(path.join('D:/ghassan/mobile/src', p), 'utf8')

const PAGE_SIZE = 20
const rows = (n, make) => Array.from({ length: n }, (_, i) => make(i + 1))
const data = {
  '/api/admin/services/': rows(45, (id) => ({ id, name_ar: `خدمة ${id}`, slug: `s${id}`, is_deleted: false })),
  '/api/admin/users/': rows(25, (id) => ({ id, full_name: `مستخدم ${id}`, role: 'employee', is_deleted: false })),
  '/api/admin/orders/': rows(30, (id) => ({ id, order_number: `KH-2026-${String(id).padStart(6, '0')}`, status: 'NEW' })),
  '/api/provider/orders/': rows(22, (id) => ({ id, order_number: `KH-2026-${String(id).padStart(6, '0')}`, status: 'ASSIGNED' })),
  '/api/admin/providers/': rows(23, (id) => ({ id, full_name: `مزود ${id}` })),
}
const seen = []
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:8099')
  seen.push({ path: url.pathname, query: url.search })
  const json = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
  if (url.pathname === '/api/admin/public-site/advertisements/') return json(200, rows(3, (id) => ({ advertisement_id: id, title_ar: `إعلان ${id}` })))
  const all = data[url.pathname]
  if (!all) return json(404, { detail: 'Not found.' })
  const page = Number(url.searchParams.get('page') || 1)
  const results = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasNext = page * PAGE_SIZE < all.length
  return json(200, {
    count: all.length,
    next: hasNext ? `http://backend.internal:8000${url.pathname}?page=${page + 1}` : null,
    previous: page > 1 ? `http://backend.internal:8000${url.pathname}?page=${page - 1}` : null,
    results,
  })
})

async function drain(m, url, key) {
  const qc = new m.QueryClient({ defaultOptions: { queries: { retry: false } } })
  const observer = new m.InfiniteQueryObserver(qc, m.pagination.pagedListQueryOptions([key], url))
  const unsubscribe = observer.subscribe(() => {})
  const wait = async () => { for (let i = 0; i < 200 && observer.getCurrentResult().fetchStatus !== 'idle'; i++) await new Promise((r) => setTimeout(r, 10)) }
  await wait()
  const steps = []
  let result = observer.getCurrentResult()
  steps.push({ loaded: m.pagination.flattenPages(result.data?.pages).length, hasNext: result.hasNextPage })
  while (result.hasNextPage && steps.length < 10) {
    await observer.fetchNextPage()
    await wait()
    result = observer.getCurrentResult()
    steps.push({ loaded: m.pagination.flattenPages(result.data?.pages).length, hasNext: result.hasNextPage })
  }
  unsubscribe()
  const items = m.pagination.flattenPages(result.data?.pages)
  return { steps, items, total: m.pagination.pagedTotal(result.data?.pages) }
}

async function main() {
  await new Promise((r) => server.listen(8099, '127.0.0.1', r))
  const m = require(path.join(here, 'bundle.cjs'))

  const services = await drain(m, m.ADMIN_SERVICES_URL, 'admin-services')
  const servicePages = seen.filter((r) => r.path === '/api/admin/services/').map((r) => r.query)
  check('PG-1', 'services: page 1 shows 20 of 45 with more to load; load-more reaches pages 2 and 3; row 45 (page 3) is reachable; the internal-host next link is followed on the configured base URL',
    JSON.stringify(services.steps) === JSON.stringify([{ loaded: 20, hasNext: true }, { loaded: 40, hasNext: true }, { loaded: 45, hasNext: false }])
      && services.items.some((row) => row.id === 45) && services.total === 45
      && servicePages.join(',') === '?page=1,?page=2,?page=3',
    { steps: services.steps, requests: servicePages })
  check('PG-2', 'footer text: «معروض 20 من 45» after page 1, «تم عرض كل السجلات (45)» at the end',
    m.pagination.pageSummary(20, 45) === 'معروض 20 من 45' && m.pagination.pageSummary(45, 45) === 'تم عرض كل السجلات (45)',
    { first: m.pagination.pageSummary(20, 45), last: m.pagination.pageSummary(45, 45) })

  const users = await drain(m, m.ADMIN_USERS_URL, 'admin-users')
  const orders = await drain(m, m.ADMIN_ORDERS_URL, 'admin-orders')
  const provider = await drain(m, m.PROVIDER_ORDERS_URL, 'provider-orders')
  check('PG-3', 'users (25), admin/employee orders (30) and provider orders (22) all reach their page-2 rows',
    users.items.length === 25 && users.items.some((r) => r.id === 25)
      && orders.items.length === 30 && orders.items.some((r) => r.id === 30)
      && provider.items.length === 22 && provider.items.some((r) => r.id === 22),
    { users: users.steps, orders: orders.steps, provider: provider.steps })

  const ads = await drain(m, m.ADMIN_ADVERTISEMENTS_URL, 'admin-ads')
  check('PG-4', 'an unpaginated list (advertisements) is one complete page with no load-more',
    JSON.stringify(ads.steps) === JSON.stringify([{ loaded: 3, hasNext: false }]) && ads.total === 3, { steps: ads.steps })

  const allServices = await m.servicesApi.getAllAdminServices()
  const allUsers = await m.usersApi.getAllUsers()
  const providers = await m.adminApi.getProviders({ order: 7 })
  check('PG-5', 'pickers read every page: prices (45 services), permissions (25 users), provider assignment (23 providers)',
    allServices.length === 45 && allUsers.length === 25 && providers.length === 23
      && seen.some((r) => r.path === '/api/admin/providers/' && r.query.includes('order=7') && r.query.includes('page=2')),
    { services: allServices.length, users: allUsers.length, providers: providers.length })

  const fmt = (value) => `T(${value})`
  const full = m.softDelete.deletionDetails({ is_deleted: true, delete_reason: ' خدمة متوقفة ', deleted_at: '2026-11-02T09:00:00Z', deleted_by_name: 'مدير الحذف' }, fmt)
  const partial = m.softDelete.deletionDetails({ is_deleted: true, delete_reason: 'مكرر' }, fmt)
  const live = m.softDelete.deletionDetails({ is_deleted: false, delete_reason: 'x' }, fmt)
  check('DEL-1', 'deleted row shows reason, time and actor when the API returns them; missing facts are omitted; live rows show none',
    JSON.stringify(full) === JSON.stringify(['السبب: خدمة متوقفة', 'تاريخ الحذف: T(2026-11-02T09:00:00Z)', 'حذفه: مدير الحذف'])
      && JSON.stringify(partial) === JSON.stringify(['السبب: مكرر']) && live.length === 0,
    { full, partial, live })

  const screens = {
    services: src('features/admin/screens/ManageServicesScreen.tsx'),
    users: src('features/admin/screens/ManageUsersScreen.tsx'),
    ads: src('features/admin/screens/ManageAdvertisementsScreen.tsx'),
    orders: src('features/admin/screens/ManageOrdersScreen.tsx'),
    tasks: src('features/employee/screens/EmployeeTasksScreen.tsx'),
    review: src('features/employee/screens/ReviewOrdersScreen.tsx'),
    assigned: src('features/provider/screens/AssignedOrdersScreen.tsx'),
  }
  const wired = Object.fromEntries(Object.entries(screens).map(([k, s]) => [k, s.includes('usePagedList') && s.includes('<LoadMoreFooter')]))
  const prices = src('features/admin/screens/ManagePricesScreen.tsx')
  const roles = src('features/admin/screens/ManageRolesScreen.tsx')
  const assign = src('api/admin.api.ts')
  check('SRC-1', 'every paged admin/staff list screen uses usePagedList + LoadMoreFooter; the id pickers use the all-pages readers',
    Object.values(wired).every(Boolean) && prices.includes('getAllAdminServices') && roles.includes('getAllUsers')
      && /getProviders[\s\S]{0,200}fetchAllPages/.test(assign),
    { wired })
  const badge = src('components/SoftDeleteRowActions.tsx')
  check('SRC-2', 'the three deleted views render DeletedBadge with the whole record (reason, time, actor)',
    ['services', 'users', 'ads'].every((k) => screens[k].includes('<DeletedBadge record={item} />')) && badge.includes('deletionDetails(record'),
    {})

  server.close()
  const passed = results.filter((r) => r.pass).length
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name}`)
  console.log(`${passed}/${results.length} passed`)
  fs.writeFileSync(path.join(here, '..', 'mobile_pagination_harness_output.json'), JSON.stringify({ generated: new Date().toISOString(), passed, total: results.length, results }, null, 1))
  process.exit(passed === results.length ? 0 : 1)
}
main().catch((e) => { console.error(e); server.close(); process.exit(1) })
