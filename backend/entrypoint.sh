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

echo "Running migrations..."
python manage.py migrate --noinput
echo "Collecting static files..."
python manage.py collectstatic --noinput
echo "Syncing roles..."
python manage.py setup_roles || true
echo "Creating admin user if configured..."
python manage.py create_admin || true
echo "Seeding initial data..."
python manage.py seed_initial_data || true

GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-120}"

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "$GUNICORN_WORKERS" \
  --timeout "$GUNICORN_TIMEOUT" \
  --access-logfile - \
  --error-logfile -
