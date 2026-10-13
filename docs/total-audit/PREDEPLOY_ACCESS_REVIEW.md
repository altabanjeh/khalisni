# Pre-deployment access review

2026-10-13. For the platform administrator. Run before (or immediately after) deploying branch `hardening/total-assurance-release`.

Two read-only commands ship with this release. Neither changes a row, grants a role or prints a password. Both were run in the production image against a local PostgreSQL stack; **neither has been run against the deployed database**.

## 1. Who loses or changes access

### Why

Before this release an account with the legacy role `employee` or `support` and no working organization membership could read every organization's orders. That included partner staff whose membership had been removed. The release reverses it: an account that was ever attached to a partner or provider organization and no longer has a working membership reads nothing.

The same rule would also cut off a real internal employee who was once given a partner membership (for a test, a migration, a temporary assignment) and has no platform membership. That person needs a platform membership, granted deliberately by a platform administrator.

### Command

```bash
# on the server, in the running backend container of the new release
docker compose -f docker-compose.yml exec backend python manage.py audit_access_review

# counts only, or with masked addresses for a ticket
docker compose -f docker-compose.yml exec backend python manage.py audit_access_review --counts-only
docker compose -f docker-compose.yml exec backend python manage.py audit_access_review --mask-emails

# as a gate: exit status 1 when anyone is in LOSES_ACCESS
docker compose -f docker-compose.yml exec backend python manage.py audit_access_review --fail-on-findings
```

To run it before the new release serves traffic, build the new image beside the running one and point it at the live database without starting the service:

```bash
docker compose -f docker-compose.yml build backend
docker compose -f docker-compose.yml run --rm --no-deps --entrypoint python backend manage.py audit_access_review
```

This release adds no migration, so the new code reads the current schema as it is. Under Coolify, where a second image is awkward, deploy first and run the command straight away: the failure direction is safe (a person loses access until corrected; nobody gains any).

### What it reports

| Group | Meaning | Action |
|---|---|---|
| `LOSES_ACCESS` | Employee or support account, once attached to a partner or provider organization, no working partner-staff membership now, no platform membership. Read every tenant before; reads none after. | Internal staff: add a `platform_support` (or `platform_super_admin`) membership on the platform organization. Former partner staff: nothing; losing access is the fix. |
| `SUPPORT_ROLE_SCOPED` | Legacy `support` role, currently working partner staff. Keeps organization-scoped access; no longer counts as platform support. | Add a platform membership only if the person is platform staff. |
| `PROVIDER_ROLE_PARTNER_STAFF` | Legacy `provider` role that is also partner staff. Now scoped as partner staff of its own organization (KTA-041). | Confirm the combination is intended. |
| `UNSCOPED_INTERNAL_STAFF` | Employee or support account with no membership at all. **Unchanged**: still reads every organization. | Confirm each one is a real internal employee. Deactivate any that is not. |

Each line shows the user id, address, legacy role, last sign-in date and every membership with its state (`active`, `inactive`, `removed`, `organization closed`).

### Granting a platform membership

As a platform super admin, in the web admin or through the API:

```http
POST /api/organization-memberships/
{"user": <user id>, "organization": <platform organization id>, "role": "platform_support"}
```

The command prints whether a platform organization exists. If it prints `NO`, create one first (organization type `platform`).

### Results so far

| Database | LOSES_ACCESS | SUPPORT_ROLE_SCOPED | PROVIDER_ROLE_PARTNER_STAFF | UNSCOPED_INTERNAL_STAFF |
|---|---:|---:|---:|---:|
| Local development database (migrated copy) | 0 | 0 | 0 | 1 (`employee@khalisni.local`, the demo employee) |
| Local release-candidate stack, fresh PostgreSQL | 0 | 0 | 0 | 0 |
| QA fixture (`seed_client_audit_qa`) | 0 | 0 | 0 | 1 (the QA employee, no membership) |
| **Deployed database** | **not run** | | | |

The QA and demo employees have no memberships, so they are unscoped internal staff and keep their access. No QA or demo account loses access.

The classification is tested: `config.tests_release_closure.PredeployReadOnlyCommandTests` checks that every account in `LOSES_ACCESS` really reads nothing, that every account in `UNSCOPED_INTERNAL_STAFF` still reads, and that the command leaves users and memberships byte-identical.

## 2. Demo and QA accounts

### Why

`docs/demo_seed_accounts.csv` and the seed code publish four email and password pairs, one of them a superuser. The repository is public. **Treat those four passwords as permanently compromised**: changing the file does not help, because the history keeps them.

Demo seeding refuses to run outside debug mode, so a production database should not contain them. That has to be checked, not assumed.

### Command

```bash
docker compose -f docker-compose.yml exec backend python manage.py audit_demo_accounts

# as a gate: exit status 1 when any demo or QA account can sign in
docker compose -f docker-compose.yml exec backend python manage.py audit_demo_accounts --fail-on-findings
```

It looks for the four published addresses (and any `DEMO_*_EMAIL` override set in the environment), every other `@khalisni.local` address, the QA fixture addresses (`client-audit-qa-…@example.test`) and the inactive seed actor. For each it prints: exists, id, active, deleted, role, superuser, staff, whether it can sign in, whether the **published password still works** (yes or no only), last sign-in date, organizations, and a remediation line.

### Remediation

| Finding | Do this |
|---|---|
| A published demo account exists and is staff, admin or superuser | **DISABLE** now (`is_active = false`), then **DELETE** once nothing depends on it. Review the audit log for its activity since the first deployment. |
| A published demo account exists, customer or provider, published password works | **DISABLE**. If a real person has been using it, **ROTATE**: set a new password and change the address to their own. |
| A published demo account exists, password already changed | **DISABLE** unless a real person owns it; the address itself is a known target. |
| A QA fixture account exists | **DELETE**. The QA seed must never have run on production. |
| The seed actor (`seed-system@internal.local`) exists, inactive, no password | Nothing. It cannot sign in. |
| `last_login` is not `never` on any demo account | Treat as a possible intrusion: review `/api/admin/audit-logs/` for that user id before deleting anything. |

Disable through the web admin (Users → edit → Account active off) or:

```http
PATCH /api/admin/users/<id>/
{"is_active": false}
```

Deactivating an account ends its sessions: access and refresh tokens are refused from the next request.

### Results so far

| Database | Found | Can sign in | Published password works |
|---|---:|---:|---:|
| Local development database | 4 (admin, customer, employee, provider) | 4 | 4 |
| Local release-candidate stack, fresh PostgreSQL, production settings | 0 | 0 | 0 |
| QA fixture database (`seed_client_audit_qa`, debug only) | 6 QA accounts | 6 | 0 |
| **Deployed database** | **not run** | | |

The local development result is expected: that database was built with `seed_demo`.

## 3. Sign-off

| Check | Result | By | Date |
|---|---|---|---|
| `audit_access_review` run on the deployed database | | | |
| Every `LOSES_ACCESS` account reviewed | | | |
| Every `UNSCOPED_INTERNAL_STAFF` account confirmed | | | |
| `audit_demo_accounts --fail-on-findings` exits 0 on the deployed database | | | |
