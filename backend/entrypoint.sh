#!/bin/sh
set -e

echo "Waiting for database..."
until python - <<'EOF'
import psycopg, os, sys
try:
    psycopg.connect(
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
        host=os.environ.get("POSTGRES_HOST", "db"),
        port=int(os.environ.get("POSTGRES_PORT", "5432")),
    ).close()
except Exception:
    sys.exit(1)
EOF
do
    printf '.'
    sleep 2
done
echo ""
echo "Database ready."

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py setup_roles || true
python manage.py create_admin || true
python manage.py seed_initial_data || true

GUNICORN_WORKERS="${GUNICORN_WORKERS:-2}"
GUNICORN_TIMEOUT="${GUNICORN_TIMEOUT:-120}"

exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "$GUNICORN_WORKERS" \
  --timeout "$GUNICORN_TIMEOUT" \
  --access-logfile - \
  --error-logfile -
