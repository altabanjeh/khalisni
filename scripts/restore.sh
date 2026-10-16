#!/bin/sh
# Khalsni restore: load a backup made by scripts/backup.sh into the Compose stack.
#
#   scripts/restore.sh <backup-directory> --yes-overwrite
#
# DESTRUCTIVE: replaces the database contents and the media volume of the
# stack it runs against. Rehearse on a separate stack first (see
# docs/total-audit/RECOVERY_RUNBOOK.md). The flag is required on purpose.
set -eu

SOURCE="${1:?usage: scripts/restore.sh <backup-directory> --yes-overwrite}"
[ "${2:-}" = "--yes-overwrite" ] || { echo "Refusing to run without --yes-overwrite." >&2; exit 2; }
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml}"

( cd "${SOURCE}" && sha256sum -c SHA256SUMS )

echo "Stopping the application so nothing writes during the restore..."
${COMPOSE} stop backend frontend

echo "Restoring database..."
${COMPOSE} exec -T db sh -c 'pg_restore --clean --if-exists --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${SOURCE}/database.dump"

echo "Restoring media..."
${COMPOSE} run --rm -T --no-deps --entrypoint sh backend -c 'rm -rf /app/media/* && tar -C /app -xzf -' < "${SOURCE}/media.tar.gz"

# The dump is restored by the cluster admin with --no-owner, so the restored
# objects belong to the admin. db-init moves them back to the owner role,
# applies any newer migrations as the owner and re-grants the app role.
echo "Re-applying database roles, migrations and grants (db-init)..."
${COMPOSE} run --rm db-init

echo "Starting the application..."
${COMPOSE} up -d backend frontend

echo "Restored. Expected contents:"
cat "${SOURCE}/manifest.txt"
echo "Now run: ${COMPOSE} exec backend python manage.py check_system_consistency"
