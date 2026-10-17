# Khalsni production environment requirements

Written 2026-10-12 for the `hardening/release-gate` branch. These are the settings and checks the release depends on that cannot be proven from the repository. Until the verification commands below pass on the deployed site, KHS-033 and KHS-040 stay open.

## 1. Request path, as far as the repository shows

```
browser
  → Coolify's Traefik proxy on the server (TLS)        appends the client address to X-Forwarded-For
    → frontend container: nginx                         appends Traefik's address  (frontend/nginx.conf, $proxy_add_x_forwarded_for)
      → backend container: gunicorn / Django            reads X-Forwarded-For
```

Evidence:

| Fact | Source |
|---|---|
| Deployment is Docker Compose under Coolify, with Traefik in front | `docs/DEPLOYMENT.md`; `backend/config/settings.py` ("Trust Coolify's Traefik proxy") |
| nginx is the only service Traefik routes to; the backend is reachable only through nginx `/api/` | `docker-compose.yml` (`expose`, no published ports) |
| nginx appends to `X-Forwarded-For`, it does not replace it | `frontend/nginx.conf` |
| No CDN is visible in DNS: `khalisnidev.raedaltabanjeh.com` resolves directly to one address | DNS lookup on 2026-10-12 |

**Expected trusted proxy count: 2** (Traefik + nginx). Add 1 for each additional proxy or CDN placed in front later.

This is the expected value, not a verified one. The server was not reachable from the development machine, so whether another proxy sits in front, and how Traefik treats an incoming `X-Forwarded-For`, was not observed. Confirm with section 4 before relying on it.

### Why the count matters

Each proxy appends the address it received the request from. Only the right-most entries are written by our own proxies; everything to their left is whatever the caller sent. `API_THROTTLE_NUM_PROXIES=N` tells the application to take the N-th entry from the right.

| Setting | Identity used for rate limits | Result |
|---|---|---|
| unset (today) | the whole header text | A caller gets a fresh rate-limit budget by changing the header. Limits are bypassable. |
| too low (1 when the chain has 2) | Traefik's address | Every visitor shares one budget. Legitimate users are throttled together. |
| correct (2) | the address Traefik saw | Limits apply per real client. |
| too high (3 when the chain has 2) | an entry the caller controls | Bypassable again. |

The same value now drives the password-reset limit and the address stored in the audit log (`backend/core/client_ip.py`).

## 2. Required variables

Set these in Coolify for the backend service. `docker-compose.yml` now passes all of them through; before this branch several were silently ignored.

| Variable | Required value | Why |
|---|---|---|
| `API_THROTTLE_NUM_PROXIES` | `2` if section 4 confirms the chain above | Rate limits, reset limits and audit addresses use the real client. No default on purpose. |
| `REDIS_URL` | `redis://<host>:6379/0` | Rate-limit counters are otherwise kept per gunicorn worker (2 workers by default), so every limit is effectively doubled and resets on restart. |
| `FRONTEND_BASE_URL` | `https://<public host>` | Password-reset links. Falls back to the first CORS origin when empty. |
| `DJANGO_DEBUG` | `False` | Already the default. |
| `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DJANGO_CSRF_TRUSTED_ORIGINS` | the public host | Unchanged. |
| `FILE_UPLOAD_MAX_SIZE` | `10485760` or lower | nginx now accepts 50 MB per request, enough for five 10 MB documents. Compose still defaults this to 5 MB. |

Optional, with their defaults:

| Variable | Default |
|---|---|
| `API_THROTTLE_AUTH_LOGIN_RATE` | `20/minute` |
| `API_THROTTLE_AUTH_REGISTER_RATE` | `20/hour` |
| `API_THROTTLE_ORDER_TRACKING_RATE` | `10/minute` (also covers the anonymous final-document link) |
| `API_THROTTLE_AUTH_PASSWORD_RESET_RATE` | `5/hour` |
| `PASSWORD_RESET_EMAIL_ASYNC` | `True` (not passed through Compose; leave unset) |
| `JWT_ACCESS_TOKEN_MINUTES`, `JWT_REFRESH_TOKEN_DAYS` | `30`, `7` |

### Redis

- The Python `redis` client was missing from `backend/requirements.txt`. With `REDIS_URL` set, the first throttled request would have failed. It is now listed; rebuild the backend image.
- Compose does not define a Redis service. Add one in Coolify (for example `redis:7-alpine`, no published port) and point `REDIS_URL` at it.
- Verified locally against a `redis:7-alpine` container: cache `set`/`incr` work and the login, registration, reset and proxy tests pass (47 tests).

## 3. Deployment order

1. Take a PostgreSQL backup.
2. Restore the backup into a separate database and rehearse the migration (section 5). Do not run it first on production.
3. Build and deploy both images (the frontend image now includes `nginx-security-headers.conf`).
4. The one-shot `db-init` service runs `migrate` as the database owner role before the backend starts (the backend itself connects as the app role and no longer migrates; see `docs/DEPLOYMENT.md`, "Database roles"). Migration `orders.0015` adds one nullable column; `orders.0016` fills it in batches of 500 with one commit per batch and can be re-run.
5. Run the checks in section 4.

## 4. Verification on the deployed site

Replace `$HOST` with the public host. None of these change customer data.

**Health and headers**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/api/health/                         # 200
curl -sI https://$HOST/ | grep -iE 'content-security-policy|x-frame-options|x-content-type|referrer-policy'
```

**Private media is not served**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/media/secure_orders/                # 404
curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/media/payments/                     # 404
curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/media/anything-else/x               # 404
# a known public catalog image must still return 200:
curl -s -o /dev/null -w '%{http_code}\n' https://$HOST/media/services/<existing file>
```

**What the application sees as the client address**

Run inside the backend container while you make one request from a machine whose public address you know:

```bash
# 1. from your machine
curl -s -o /dev/null -X POST -H 'Content-Type: application/json' -H 'X-Forwarded-For: 198.51.100.77' \
     -d '{"email":"nobody@example.com"}' https://$HOST/api/auth/forgot-password/

# 2. in the backend container
python manage.py shell -c "
from audit.models import AuditLog
from django.conf import settings
print('NUM_PROXIES =', settings.REST_FRAMEWORK['NUM_PROXIES'])
print('cache =', settings.CACHES['default']['BACKEND'])
print('last reset request from', AuditLog.objects.filter(action='password_reset_request').latest('pk').ip_address)
"
```

Pass: the printed address is your machine's public address. If it is `198.51.100.77`, the count is too high. If it is a private or Docker address, the count is too low.

**Spoofed header does not reset the login limit**

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code} ' -X POST -H 'Content-Type: application/json' \
       -H "X-Forwarded-For: 198.51.100.$i" \
       -d '{"email":"nobody@example.com","password":"wrong"}' https://$HOST/api/auth/login/
done; echo
```

Pass: twenty `401` followed by `429`. Twenty-five `401` means the limit is being bypassed (count unset or too high), or counters are not shared (Redis missing). Wait one minute before signing in from that address again.

**Requirements snapshot**

```bash
python manage.py audit_requirements_snapshot --strict
```

Pass: `orders_without_snapshot` is `0` and `orders_whose_readiness_could_not_be_computed` is empty. The other two lists are for review; see the legacy snapshot assumption in `KHALSNI_HARDENING_FINAL.md`.

**Browser checks against the nginx configuration** (run from a development machine against a staging stack, not production):

```bash
cd frontend
E2E_NGINX=1 E2E_QA_MODE=1 KHALSNI_QA_PASSWORD=<qa password> \
E2E_BASE_URL=http://<staging host> E2E_API_URL=http://<staging host> \
npx playwright test nginx-deployment client-audit-acceptance hardening-access --project=desktop-1440
```

These need the QA fixture (`seed_client_audit_qa`, which refuses to run unless `DJANGO_DEBUG=True`). Never run it on production.

## 5. PostgreSQL migration rehearsal on a production copy

Not done: no production backup was available. What was done instead is in `KHALSNI_HARDENING_FINAL.md` (PostgreSQL 16, synthetic data). Run this on a restored copy before release.

```sql
-- before and after; every value except the snapshot counts must be identical
SELECT count(*) FROM orders_order;
SELECT status, count(*) FROM orders_order GROUP BY status ORDER BY status;
SELECT count(*) FROM documents_document;
SELECT count(*) FROM services_servicerequireddocument WHERE is_active AND NOT is_deleted;
SELECT md5(string_agg(id::text || ':' || status || ':' || order_number || ':' || coalesce(final_price::text, ''), ',' ORDER BY id))
  FROM orders_order;
```

```bash
python manage.py migrate --plan
time python manage.py migrate
```

```sql
-- after
SELECT count(*) FROM orders_order WHERE requirements_snapshot IS NULL;                       -- 0
SELECT count(*) FROM orders_order WHERE jsonb_typeof(requirements_snapshot) <> 'array';      -- 0
SELECT count(*) FROM documents_document d LEFT JOIN orders_order o ON o.id = d.order_id WHERE o.id IS NULL;  -- 0
```

```bash
python manage.py audit_requirements_snapshot --strict
python manage.py check_system_consistency
```

Rollback: `python manage.py migrate orders 0014` drops the new column and nothing else. Both directions were exercised in the rehearsal.

## 6. Client API changes in this branch

Other clients of the API (the mobile app in `mobile/` calls these endpoints) must follow the same contract.

| Endpoint | Change |
|---|---|
| `PATCH /api/customer/profile/` | Changing `email` or `phone` requires `current_password`. An email change returns `tokens` (new access and refresh) and invalidates all earlier tokens. |
| `GET /api/customer/orders/<id>/`, tracking, document download | A final result is listed and downloadable only after the order is completed. Timeline rows have no `changed_by` and carry a note only for customer-facing transitions. |
| `POST /api/customer/orders/<id>/documents/` | Accepted only while the order is new, under review or waiting for the customer, and only for the order's own document types. |
| `POST /api/orders/` | Validation errors for files also arrive as `document_errors` keyed by document type. A key conflict returns `code: submission_key_conflict`. |
| `GET /api/notifications/` | Only the caller's own notifications, for every role. |
| `GET /api/orders/track/`, anonymous document link | Both `order_number` and `phone` are required and non-empty. |
