# Deployment

This project is prepared for single-server deployment with Docker Compose.

## What the stack does

- `frontend`: nginx serving the built React app on port `80` inside the container.
- `backend`: Django + Gunicorn on port `8000` inside the internal network.
- `db`: PostgreSQL 16 with a persistent named volume.
- nginx proxies `/api/` and `/admin/` to Django.
- nginx serves `/static/` and `/media/` directly from shared Docker volumes.

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
   - `POSTGRES_PASSWORD`
   - `DJANGO_ADMIN_EMAIL`
   - `DJANGO_ADMIN_PASSWORD`
3. If you are publishing on a non-default port, change `APP_PORT`.
4. Build and start the stack:

```bash
docker compose up -d --build
```

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
