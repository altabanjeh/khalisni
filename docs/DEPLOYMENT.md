# Deployment

This project is prepared for single-server deployment with Docker Compose.

## What the stack does

- `frontend`: nginx serving the built React app on port `80` inside the container.
- `backend`: Django + Gunicorn on port `8000` inside the internal network.
- `db`: PostgreSQL 16 with a persistent named volume.
- nginx proxies `/api/` and `/admin/` to Django.
- nginx serves `/static/` and `/media/` directly from shared Docker volumes.
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
   - `DJANGO_ADMIN_EMAIL`
   - `DJANGO_ADMIN_PASSWORD`
3. For a public domain, set the host and origin variables with the exact deployed domain. Example for `app.example.com`:

```env
DJANGO_ALLOWED_HOSTS=app.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
```
4. Build and start the stack:

```bash
docker compose up -d --build
```

If `POSTGRES_PASSWORD` or another required variable is missing, `docker compose` now stops immediately with a configuration error instead of letting the PostgreSQL container enter a restart loop.
The backend does not rely on Compose-level database health to start. It waits for a real PostgreSQL connection in its entrypoint, which is more reliable on platforms like Coolify where container health can be reported before init work fully settles.
The backend healthcheck is proxy-aware and uses loopback-safe headers so production settings like `ALLOWED_HOSTS` and `SECURE_SSL_REDIRECT` do not cause false negatives during container startup.
On a first deploy, the backend healthcheck allows extra time for database readiness, migrations, static collection, and seed commands before Gunicorn starts serving requests.
`DJANGO_SEED_INITIAL_DATA=True` now seeds only the baseline catalog data required by the app. Public demo users and example orders are intentionally excluded from automatic startup seeding.
Use `python manage.py seed_demo` only on non-public demo environments when you explicitly want sample accounts, public-site content, and example orders. Re-run `python manage.py seed_demo --reset-passwords` only when you intentionally want the demo passwords reset.

## Operational notes

- The public entrypoint is the `frontend` container. Only that container is published to the host.
- Django migrations, `collectstatic`, role setup, admin creation, and seed initialization run automatically on backend startup.
- Uploaded files and collected static assets are persisted through Docker named volumes.
- For direct HTTPS on the server, terminate TLS with a host-level reverse proxy such as Caddy, Nginx, or Traefik and forward traffic to the published frontend port.
- If a deployment platform already provides HTTPS and proxy headers, keep `DJANGO_SECURE_SSL_REDIRECT=True`.

## Health checks

- Backend health endpoint: `/api/health/`
- Frontend container health: `/`

## Useful commands

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend python manage.py check --deploy
```
