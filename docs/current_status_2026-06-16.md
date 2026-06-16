# Current Status 2026-06-16

## Fixed in this pass

- organization-scoped provider admin access
- scoped provider candidate lookup by order/service
- scoped category reorder with transaction safety
- scoped customer profile admin access
- session-only default web auth with optional remember-me persistence
- mobile provider instructions rendering
- safer mobile admin validation and confirmations
- resilient customer order draft restore with versioning and expiry
- throttling for order tracking, missing service requests, and password reset
- pagination re-enabled for selected high-volume APIs
- web and mobile paginated-response normalization
- stale docs corrected for password reset, notification read, and order-auth behavior

## Still open

- admin raw order-record endpoint remains higher risk than dedicated workflow actions
- notification unread-count and mark-all-read APIs are still missing
- mobile has no runtime test suite yet
- backend test suite is still slower than ideal

## Validation commands

Backend:

- `python manage.py check`
- `python manage.py test`
- `python manage.py check_system_consistency`

Frontend:

- `npm run lint`
- `npm test`
- `npm run build`

Mobile:

- `npm run typecheck`

## Latest validation result

- `python manage.py check`: passed
- `python manage.py test`: passed, 177 tests
- `python manage.py check_system_consistency`: command ran successfully but reported 2 live data issues on `KH-2026-000002` and `KH-2026-000003`
- `npm run lint`: passed
- `npm test`: passed, 19 files / 34 tests
- `npm run build`: passed
- `npm run typecheck`: passed

## Known risks

- generic admin order operations still require further workflow-hardening review
- missing service requests are still globally visible to internal staff because the model is not tenant-owned
- large data pages should continue migrating to server-driven pagination UX

## Production readiness checklist

- verify environment throttle rates for production traffic
- review any real data returned by `check_system_consistency`
- confirm JWT lifetime choices match security policy
- add mobile runtime tests before broad mobile release
- review raw admin endpoints for least-privilege exposure
