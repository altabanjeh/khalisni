# Khalsni release gate

2026-10-13. Companion to `KHALSNI_TOTAL_AUDIT_FINAL.md`. Updated after release closure on branch `hardening/total-assurance-release` (base `b6a4242`).

**Release candidate: READY TO MERGE WITH DEPLOYMENT GATES.** The build deployed today stays on **HOLD** until this branch is deployed: it still has both critical findings.

Nothing in this document was verified on the server. Every server-side step below is a command for the operator.

| Area | State |
|---|---|
| Critical findings open | 0 |
| High findings open | 1: KTA-012, no scheduled backup (server-side) |
| CI | WRITTEN / AWAITING FIRST REMOTE RUN |
| Web release | READY, behind gates G1 to G7 |
| Mobile release | HOLD |
| Demo account check | Command ready; NEEDS PRODUCTION EXECUTION |
| Backup | Scripts ready and tested locally; NOT READY on the server (nothing scheduled) |
| Restore drill | Done locally (12 s); NOT RUN on a production backup |
| Redis | READY in the Compose file; tested locally with two workers |
| Trusted proxy count | NEEDS SERVER VERIFICATION (expected 2) |

## Hold conditions

| Condition | On the branch | Evidence |
|---|---|---|
| Open CRITICAL | None | KTA-001, 002 fixed; `LegacyRoleEscalationTests`, `CrossTenantAccountTakeoverTests`, `tests_release_closure.py` |
| Open HIGH security issue in code | None | KTA-003 to 008 and KTA-041 fixed |
| Cross-tenant access | None known | Tenant suites on PostgreSQL; `ProviderRoleScopeTests` |
| Cross-customer access | None known | `OperationsLedgerBoundaryTests` |
| Unauthorized document access | None known | Download tests; `FinalResultSupersededTests` |
| Workflow bypass | None known | KTA-016 fixed |
| Privilege escalation | None known | Six account-management properties proven in `tests_release_closure.py` |
| Unreliable migration | No | No new migration; chain applies from scratch on PostgreSQL 16 |
| Data corruption | None found | Race tests on PostgreSQL |
| Full journey failure | No | Browser journey suites pass |
| Production build failure | No | `npm run build` and both image builds pass |
| Authentication bypass | None known | Session and refresh revocation tests |
| Unrecoverable backup problem | **Open on the server** | KTA-012: scripts proven locally; nothing scheduled, no drill on real data |
| Known deployment misconfiguration affecting security | **Open on the server** | KTA-020: proxy count unset |

## Deployment gates

### G1. Merge and CI

1. Push the branch and open a pull request to `main`. The workflow now also runs on `hardening/**` pushes.
2. All jobs green. Three have never run anywhere: `backend-postgres`, `deploy-artifacts`, and the role-journey step of `e2e`. A red first run on one of these is a CI setup issue to fix, not a reason to skip the job.

What CI covers once it runs:

| Requirement | Job |
|---|---|
| Backend tests | `backend` (SQLite) |
| PostgreSQL race and concurrency tests | `backend-postgres` (whole suite on PostgreSQL 16, migrations from scratch) |
| Frontend unit tests, lint, production build | `frontend` |
| Django checks, migration check | `backend` (`check`, `makemigrations --check`), `deploy-artifacts` (`check --deploy`) |
| Docker image builds | `deploy-artifacts` |
| Compose validation without the development override | `deploy-artifacts` |
| nginx configuration | `deploy-artifacts` (`nginx -t` in the built image) |
| Backup and restore scripts parse | `deploy-artifacts` |
| Browser: public pages, routes, accessibility; role journeys | `e2e` |
| Dependency audits | `backend-security`, `frontend` |
| Mobile type-check | `mobile` |

Locally: the workflow passes `actionlint`; every command in `deploy-artifacts` was run by hand and passed.

### G2. Back up before deploying

```bash
cd <repository root on the server>
sh scripts/backup.sh /srv/khalsni-backups ; echo "exit status: $?"
```

Exit status 0 and a directory without the `.partial` suffix. Copy it off the server. Under Coolify add `COMPOSE="docker compose -p <project> -f docker-compose.yml"` in front. The current deployed commit has no `scripts/backup.sh`; copy the script from this branch, it only needs the running `db` and `backend` containers. Details: `RECOVERY_RUNBOOK.md` section 3.

### G3. Access review

`PREDEPLOY_ACCESS_REVIEW.md` section 1. Run `audit_access_review`, give a platform membership to any real internal employee listed under `LOSES_ACCESS`, confirm everyone under `UNSCOPED_INTERNAL_STAFF`.

Also tell organization admins what changed for them: they can no longer attach existing accounts from outside their organization, create `support` accounts, edit shared categories, or approve and deactivate shared providers. New users they create must be placed in their organization (the web form now asks).

### G4. Deploy

```bash
docker compose -f docker-compose.yml up -d --build
docker compose -f docker-compose.yml ps        # db, redis, backend, frontend all healthy
docker compose -f docker-compose.yml logs backend | tail -30
```

Expect `Admin user exists: … (unchanged)` and no `ERROR` or `WARNING:` lines. Never run a plain `docker compose up` on the server: it would load `docker-compose.override.yml`, which is for development.

### G5. Redis

`REDIS_URL` defaults to the bundled `redis` service; set it only to use an external Redis.

```bash
docker compose -f docker-compose.yml exec redis redis-cli ping            # PONG
curl -s -o /dev/null https://<host>/api/services/
docker compose -f docker-compose.yml exec redis redis-cli --scan --pattern '*throttle*'   # at least one key
```

Measured locally (two gunicorn workers, 2026-10-13):

| Situation | Result |
|---|---|
| Redis up, 26 wrong sign-ins from one client | 20 answered 401, then 429 from the 21st: one counter shared by both workers |
| Registration, 24 attempts | 429 from the 21st (limit 20 per hour) |
| Password reset, 8 attempts | 429 from the 6th (limit 5 per hour) |
| Redis stopped | No 500. One request per worker waits about 4 s, the rest 0.05 to 0.3 s. 4 log lines (`khalsni.throttle`). Sign-in, catalog, password reset all work. |
| Redis hung (paused) | No 500. One request waits 2 s, the rest are normal. |
| Redis back | Limits apply again within 30 s |

While Redis is down, and for up to 30 s after it returns, **rate limits are off**. That is the chosen trade: the alternative is that a Redis fault takes sign-in down. Alert on the log line `Rate-limit store unavailable`.

### G6. Trusted proxy count

`API_THROTTLE_NUM_PROXIES` has no default on purpose. The expected chain is Internet → Coolify Traefik → nginx → gunicorn, which is **2**, but that is read from the repository, not from the server. A CDN or a second proxy in front makes it 3. Prove it:

```bash
# 1. From your own machine, note your public address
curl -s https://api.ipify.org ; echo

# 2. Send one request with a forged header
curl -s -o /dev/null -H 'X-Forwarded-For: 203.0.113.99' https://<host>/api/services/

# 3. On the server, look at what the backend received and which identity it counted
docker compose -f docker-compose.yml exec redis redis-cli --scan --pattern '*throttle_anon*'
```

Read the key that appears:

| Key ends with | Meaning | Set `API_THROTTLE_NUM_PROXIES` to |
|---|---|---|
| your public address | Correct | keep the current value |
| several addresses, such as `203.0.113.99,<your address>,<an internal address>` | Unset: limits can be bypassed | the number of addresses that are not the forged one (2 in this example; the forged one is absent if Traefik discards incoming headers) |
| `203.0.113.99` | Too high: limits can be bypassed | one less |
| an internal address (10.x, 172.x, 192.168.x) | Too low: all visitors share one budget | one more |

Then confirm with the bypass test (must end in 429):

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w '%{http_code} ' -H "X-Forwarded-For: 203.0.113.$i" \
    -H 'Content-Type: application/json' -d '{"email":"nobody@example.com","password":"x"}' \
    https://<host>/api/auth/login/
done; echo
```

Twenty `401` then `429`. Twenty-five `401` means the count is still wrong.

Reproduced locally with a two-proxy chain: unset and 3 both let 26 of 26 forged attempts through; 1 put every client in one bucket; 2 limited correctly.

### G7. Demo accounts

`PREDEPLOY_ACCESS_REVIEW.md` section 2.

```bash
docker compose -f docker-compose.yml exec backend python manage.py audit_demo_accounts --fail-on-findings
```

Exit status 0, or follow the DELETE / DISABLE / ROTATE table. The four published passwords are permanently compromised whatever the result.

### G8. Before real customers

| Step | Owner |
|---|---|
| Schedule nightly backups with an off-server copy (`RECOVERY_RUNBOOK.md` section 3) | DevOps |
| One restore drill from a real backup on a separate stack; record the time (`RECOVERY_RUNBOOK.md` section 4) | DevOps |
| Decide: rewrite repository history to remove the demo credentials and the old database file, or accept and rely on G7 | Repository owner |
| D05 and D06 content | Client |
| B10 decisions; payment status rules (KTA-037); organization admins resetting customer passwords (KTA-039); backup retention period | Client |

## Web and mobile

**Web: READY.** Every backend contract changed by the audit was compared with the web client. One gap was found and fixed in closure: the create-user form now sends the organization and membership role when an organization admin uses it.

**Mobile: HOLD.** All four hold conditions apply:

| Condition | State |
|---|---|
| Run on a device or emulator | Never done. `tsc --noEmit` is the only check; there are no tests. |
| API mismatches | 71 distinct calls resolved against the backend URL table: 70 match. `orders.track` used POST where the server accepts GET; fixed in closure (no screen calls it). Open: the create-user screen does not send `organization_id` and `membership_role`, so it fails for organization admins (works for platform admins). Payload shapes were compared by reading, not by running. |
| Production API endpoint | `eas.json` production profile still points at `https://api.example.com`; preview at `http://127.0.0.1:8000`. |
| Dependency advisories | `npm audit --omit=dev`: 2 critical, 36 high, 14 moderate, 1 low. Not reviewed. Fixing needs an Expo SDK upgrade, which is a major-version change. |

The backend was not weakened for mobile.

## Rollback

Redeploy the previous commit. This release adds no migration, so no schema step is needed. Redis can stay running or be removed; the previous code ignores it unless `REDIS_URL` is set. Details in `RECOVERY_RUNBOOK.md` section 5.

Rolling back restores both critical findings. Prefer fixing forward.
