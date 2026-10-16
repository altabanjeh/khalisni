#!/bin/sh
set -e

echo "Waiting for database..."
db_attempt=0
until python - <<'EOF'
import psycopg, os, sys
try:
    psycopg.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "db"),
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
        connect_timeout=5,
    ).close()
except Exception as exc:
    print(f"Database connection failed: {exc}", flush=True)
    sys.exit(1)
EOF
do
    db_attempt=$((db_attempt + 1))
    echo "Database not ready yet (attempt ${db_attempt}). Retrying in 2s..."
    sleep 2
done
echo ""
echo "Database ready."

# Migrations are not run here. The one-shot `db-init` service applies them as
# the database OWNER role (backend/ops/db_init.sh); this process connects as
# the APP role, which owns nothing and cannot alter the schema. Wait until
# every migration is applied (Coolify may start services before db-init ends).
echo "Waiting for migrations (applied by db-init)..."
migration_attempt=0
until python manage.py migrate --check >/dev/null 2>&1
do
    migration_attempt=$((migration_attempt + 1))
    if [ "$migration_attempt" -ge "${KHALSNI_MIGRATION_WAIT_ATTEMPTS:-150}" ]; then
        echo "Unapplied migrations remain. Run the db-init service (docker compose -f docker-compose.yml run --rm db-init)." >&2
        python manage.py showmigrations --plan | grep -F '[ ]' >&2 || true
        exit 1
    fi
    echo "Migrations not applied yet (attempt ${migration_attempt}). Retrying in 2s..."
    sleep 2
done
echo "Migrations applied."
echo "Collecting static files..."
python manage.py collectstatic --noinput
echo "Syncing roles..."
python manage.py setup_roles || echo "WARNING: setup_roles failed; role groups may be out of date." >&2
echo "Creating admin user if configured..."
python manage.py create_admin || echo "WARNING: create_admin failed; see the message above." >&2
# Expired refresh tokens accumulate in the blacklist tables; trim them on start.
python manage.py flushexpiredtokens >/dev/null 2>&1 || true

if [ "${DJANGO_SEED_INITIAL_DATA:-False}" = "True" ]; then
    echo "Seeding initial data..."
    python manage.py seed_initial_data
else
    echo "Skipping initial data seed."
fi

# Give services their initial representative images. Idempotent: only fills
# services that have no image yet, so it is safe to run on every deploy.
# Set DJANGO_SEED_SERVICE_IMAGES=False to skip, or run
#   python manage.py seed_service_images --force
# once to reset every image back to the shipped defaults.
if [ "${DJANGO_SEED_SERVICE_IMAGES:-True}" = "True" ]; then
    echo "Seeding service images..."
    python manage.py seed_service_images --verbosity 0 || true
else
    echo "Skipping service image seed."
fi

GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-120}"

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "$GUNICORN_WORKERS" \
  --timeout "$GUNICORN_TIMEOUT" \
  --access-logfile - \
  --error-logfile -
