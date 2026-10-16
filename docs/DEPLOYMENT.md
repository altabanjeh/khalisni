# Deployment

This project is prepared for single-server deployment with Docker Compose.

## What the stack does

- `frontend`: nginx serving the built React app on port `80` inside the container.
- `backend`: Django + Gunicorn on port `8000` inside the internal network.
- `db`: PostgreSQL 16 with a persistent named volume.
- `db-init`: one-shot job (backend image). Creates or updates the database roles, applies migrations as the owner role, grants the app role, then exits. The backend starts only after it succeeds.
- `redis`: in-memory store for rate-limit counters. No data is kept in it.
- nginx proxies `/api/` and `/django-admin/` to Django.
- nginx serves `/static/` and only the public media folders (catalog, CMS, branding, manual). Customer documents are never served by nginx; they go through the API.
- The Compose file intentionally does not define a custom Docker network. Coolify injects its own network and proxy wiring, and custom networks can cause intermittent timeouts.

## Required server prerequisites

- Docker Engine with the Compose plugin
- A Linux server with ports `80` and, if you terminate TLS on-host, `443` open
- A DNS record pointing your domain to the server

## First-time deployment

1. Copy `.env.example` to `.env`.
2. Set real values for:
   - `DJANGO_SECRET_KEY`
   - `DJANGO_ALLOWED_HOSTS`
   - `DJANGO_CSRF_TRUSTED_ORIGINS`
   - `CORS_ALLOWED_ORIGINS`
   - `POSTGRES_PASSWORD`
   - `KHALSNI_DB_OWNER_USER`, `KHALSNI_DB_OWNER_PASSWORD`
   - `KHALSNI_DB_APP_USER`, `KHALSNI_DB_APP_PASSWORD`
   - `DJANGO_ADMIN_EMAIL`
   - `DJANGO_ADMIN_PASSWORD`

   The three database passwords must be different, and the three role names must be different (see "Database roles").
3. For a public domain, set the host and origin variables with the exact deployed domain. Example for `app.example.com`:

```env
DJANGO_ALLOWED_HOSTS=app.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
```
4. Build and start the stack:

```bash
docker compose -f docker-compose.yml up -d --build
```

Always pass `-f docker-compose.yml` on a server. A plain `docker compose up` also applies `docker-compose.override.yml`, which is for local development: it mounts the source tree, seeds data and publishes the database and backend ports (on loopback only).

If `POSTGRES_PASSWORD` or another required variable is missing, `docker compose` now stops immediately with a configuration error instead of letting the PostgreSQL container enter a restart loop.
The backend does not rely on Compose-level database health to start. It waits for a real PostgreSQL connection in its entrypoint, which is more reliable on platforms like Coolify where container health can be reported before init work fully settles.
The backend healthcheck is proxy-aware and uses loopback-safe headers so production settings like `ALLOWED_HOSTS` and `SECURE_SSL_REDIRECT` do not cause false negatives during container startup.
On a first deploy, the backend healthcheck allows extra time for database readiness, migrations, static collection, and seed commands before Gunicorn starts serving requests.
`DJANGO_SEED_INITIAL_DATA=True` now seeds only the baseline catalog data required by the app. Public demo users and example orders are intentionally excluded from automatic startup seeding.
Use `python manage.py seed_demo` only on non-public demo environments when you explicitly want sample accounts, public-site content, and example orders. Re-run `python manage.py seed_demo --reset-passwords` only when you intentionally want the demo passwords reset.

## Database roles

The deployment uses three PostgreSQL roles. The running backend never holds the admin or owner credentials.

| Role | Variables | Used by | Rights |
|---|---|---|---|
| Cluster admin | `POSTGRES_USER`, `POSTGRES_PASSWORD` | the `db` container (created by the postgres image as a superuser), `db-init`, `scripts/backup.sh`, `scripts/restore.sh` | superuser |
| Owner | `KHALSNI_DB_OWNER_USER`, `KHALSNI_DB_OWNER_PASSWORD` | `db-init` only, to run migrations | LOGIN, not superuser, no CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS; owns the database, the `public` schema and every table, sequence, index and function in it |
| App | `KHALSNI_DB_APP_USER`, `KHALSNI_DB_APP_PASSWORD` | the running backend (Gunicorn and its management commands) | LOGIN, not superuser, no CREATEDB/CREATEROLE/REPLICATION/BYPASSRLS; owns nothing |

Exact grants applied by `backend/ops/db_bootstrap.py` (re-applied on every `db-init` run):

- `REVOKE ALL ON DATABASE <db> FROM PUBLIC`; `GRANT CONNECT ON DATABASE <db> TO <app>`
- `REVOKE CREATE ON SCHEMA public FROM PUBLIC`; `GRANT USAGE ON SCHEMA public TO <app>`
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <app>`
- `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <app>`
- `ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO <app>` (and `USAGE, SELECT ON SEQUENCES`) so tables created by later migrations are covered
- `REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM <app>`
- `db-init` fails if the app role owns any object in `public` or is a superuser.

What this guarantees: the app role cannot `ALTER`, `DROP` or `TRUNCATE` tables, cannot disable or drop triggers (only an owner can), cannot set `session_replication_role` (superuser only), and cannot create objects. The append-only consent triggers (`orders.0019`) therefore bind every request the backend serves. Raw `UPDATE` or `DELETE` of `orders_orderconsent` by the app role reaches the trigger and is refused.

`db-init` is idempotent: it creates missing roles, resets their passwords from the environment (so changing a password in the environment and re-running it rotates the password), moves objects owned by any other role to the owner, applies migrations as the owner and re-grants. Re-run it by hand with:

```bash
docker compose -f docker-compose.yml run --rm db-init
```

### Upgrading an existing deployment (one superuser owning everything)

Deployments created before this change run the backend as the cluster admin, which owns every table and can disable the consent triggers. To move to the role model:

1. Take and verify a backup (`scripts/backup.sh`, `scripts/verify_backup.sh`).
2. Add `KHALSNI_DB_OWNER_USER`, `KHALSNI_DB_OWNER_PASSWORD`, `KHALSNI_DB_APP_USER`, `KHALSNI_DB_APP_PASSWORD` to the environment (Coolify: the project's environment variables; plain server: `.env`). Keep `POSTGRES_USER` and `POSTGRES_PASSWORD` unchanged: they stay the cluster admin.
3. Deploy. `db-init` runs first, moves every table, sequence and function to the owner role, applies migrations and grants the app role; the backend then starts as the app role.
4. Confirm:

```bash
docker compose -f docker-compose.yml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\du"'
docker compose -f docker-compose.yml exec db sh -c 'psql -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select distinct pg_get_userbyid(relowner) from pg_class c join pg_namespace n on n.oid = c.relnamespace where nspname = '"'"'public'"'"'"'
docker compose -f docker-compose.yml exec backend python manage.py shell -c "from django.db import connection; c = connection.cursor(); c.execute('select current_user'); print(c.fetchone()[0])"
```

The first must show the owner and app roles without `Superuser`, the second only the owner role, the third the app role.

Coolify: the `db-init` service appears as a one-shot container that exits with code 0; that is expected. If Coolify starts the backend before `db-init` finishes, the backend waits until every migration is applied (`entrypoint.sh`), and gives up with an explicit message after about five minutes (`KHALSNI_MIGRATION_WAIT_ATTEMPTS`).

Local development: `docker-compose.override.yml` builds on the same file, so a local `.env` needs the four new variables as well.

## Operational notes

- The public entrypoint is the `frontend` container. The base Compose file publishes no ports; the platform proxy (Coolify/Traefik) routes to it. On a plain server put a TLS reverse proxy in front and forward to the frontend container.
- Set `API_THROTTLE_NUM_PROXIES` to the number of proxies in front of Django (see `docs/hardening/KHALSNI_PRODUCTION_ENV_REQUIREMENTS.md`). Without it rate limits can be bypassed.
- Errors are written to the backend container log (stderr). `docker compose logs backend | grep ERROR` shows unhandled exceptions with tracebacks.
- Backups are not automatic until scheduled on the server. Schedule `scripts/backup_scheduled.sh` (backup, verification, optional off-server copy and rotation) before go-live: `docs/total-audit/RECOVERY_RUNBOOK.md`. Retention has no default; it follows the client's data-retention policy.
- `create_admin` creates the admin from `DJANGO_ADMIN_*` on first start. On later starts it changes nothing unless `DJANGO_ADMIN_RESET_PASSWORD=True`, and it refuses to promote an existing non-admin account.
- Django migrations run in `db-init` as the owner role. `collectstatic`, role setup, admin creation, and seed initialization run on backend startup as the app role.
- Uploaded files and collected static assets are persisted through Docker named volumes.
- For direct HTTPS on the server, terminate TLS with a host-level reverse proxy such as Caddy, Nginx, or Traefik and forward traffic to the published frontend port.
- If a deployment platform already provides HTTPS and proxy headers, keep `DJANGO_SECURE_SSL_REDIRECT=True`.

## Health checks

- Backend health endpoint: `/api/health/`
- Frontend container health: `/`

## Useful commands

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs -f backend
docker compose -f docker-compose.yml logs -f frontend
docker compose -f docker-compose.yml exec backend python manage.py check --deploy
sh scripts/backup.sh /srv/khalsni-backups
sh scripts/verify_backup.sh /srv/khalsni-backups/khalsni-<UTC time>
```
