#!/bin/sh
# One-shot database initialisation for the Compose deployment (service `db-init`).
#
#   1. roles:   create/update the owner and app roles, move every object in the
#               public schema to the owner (cluster admin credentials)
#   2. migrate: apply Django migrations as the OWNER role
#   3. grants:  give the app role DML on every table and sequence
#
# Idempotent. Runs before the backend starts and again after a restore
# (scripts/restore.sh). The running backend never receives the admin or owner
# credentials; it connects as the app role only.
set -eu

cd /app

echo "db-init: bootstrapping roles..."
python ops/db_bootstrap.py roles

echo "db-init: applying migrations as ${KHALSNI_DB_OWNER_USER}..."
POSTGRES_USER="${KHALSNI_DB_OWNER_USER}" POSTGRES_PASSWORD="${KHALSNI_DB_OWNER_PASSWORD}" \
    python manage.py migrate --noinput

echo "db-init: applying app-role grants..."
python ops/db_bootstrap.py grants

echo "db-init: done."
