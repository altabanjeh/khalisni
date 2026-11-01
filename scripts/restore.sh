#!/bin/sh
# Khalsni restore: load one backup set made by scripts/backup.sh into a Compose stack.
#
#   sh scripts/restore.sh <backup-directory> --yes-overwrite
#
# DESTRUCTIVE: replaces the database and the media volume of the stack that
# COMPOSE names (default: docker compose -f docker-compose.yml). Rehearse on a
# separate stack first (docs/total-audit/RECOVERY_RUNBOOK.md). The flag is
# required on purpose.
#
# Steps, each one fatal on failure (exit non-zero):
#   1. scripts/verify_backup.sh on the set (checksums, pg_restore --list, media list)
#   2. stop backend and frontend so nothing writes
#   3. database: the dump is first converted to SQL; then, in ONE transaction,
#      the public schema is dropped, re-created and loaded. A failure rolls the
#      whole database back to what it was before step 3.
#   4. media: extracted into a temporary folder on the media volume, checked
#      against media.inventory.tsv (sha256 of every file), then swapped in
#   5. db-init: restored objects go back to the owner role, newer migrations
#      are applied as the owner, the app role is re-granted (DML only)
#   6. backend and frontend started and waited for
#   7. checks: key-table row counts equal manifest.json, media byte-identical
#      to the inventory, backend connected as the app role (not superuser, owns
#      nothing), consent append-only triggers enabled
set -eu

SOURCE="${1:?usage: scripts/restore.sh <backup-directory> --yes-overwrite}"
SOURCE="${SOURCE%/}"
[ "${2:-}" = "--yes-overwrite" ] || { echo "Refusing to run without --yes-overwrite." >&2; exit 2; }
HERE="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml}"
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-restore: $*"; }
fail() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-restore: RESTORE FAILED: $1" >&2; exit 1; }
db_sql() {
  printf '%s\n' "$1" | ${COMPOSE} exec -T db sh -c 'psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}
STARTED="$(date +%s)"
CHECK="$(mktemp)"
trap 'rm -f "${CHECK}"' EXIT

log "1/7 verifying ${SOURCE}"
sh "${HERE}/verify_backup.sh" "${SOURCE}" || fail "backup set did not verify; nothing was changed"
FORMAT=2
[ -f "${SOURCE}/manifest.json" ] || FORMAT=1

log "2/7 stopping backend and frontend"
${COMPOSE} stop backend frontend || fail "cannot stop the application"
${COMPOSE} up -d db || fail "cannot start the database"
for attempt in $(seq 1 60); do
  ${COMPOSE} exec -T db sh -c 'pg_isready -q -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' && break
  [ "${attempt}" -lt 60 ] || fail "database is not ready"
  sleep 2
done

log "3/7 restoring database (single transaction)"
# --no-owner/--no-privileges: objects are created by the cluster admin and
# db-init (step 5) hands them to the owner role and re-grants the app role,
# so the restore works whether or not those roles exist yet.
${COMPOSE} exec -T db sh -c '
  set -eu
  sql=/tmp/khalsni-restore.sql
  all=/tmp/khalsni-restore-all.sql
  trap "rm -f /tmp/khalsni-restore.dump \"$sql\" \"$all\"" EXIT
  cat > /tmp/khalsni-restore.dump
  pg_restore --no-owner --no-privileges -f "$sql" /tmp/khalsni-restore.dump
  # PostgreSQL 15+ dumps do not re-create the public schema; older ones may.
  create="CREATE SCHEMA public;"
  ! grep -q "^CREATE SCHEMA public;" "$sql" || create=""
  { echo "SET client_min_messages = warning;"
    echo "DROP SCHEMA IF EXISTS public CASCADE;"
    echo "$create"
    cat "$sql"; } > "$all"
  # -1 with -f: the whole file is one transaction; any error rolls all of it back.
  psql -X -q -v ON_ERROR_STOP=1 --single-transaction -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$all" > /dev/null
' < "${SOURCE}/database.dump" || fail "database restore failed (the transaction was rolled back)"

log "4/7 restoring media"
# Extract next to the live files, check, then swap: a failed extraction leaves
# the current media untouched.
${COMPOSE} run --rm -T --no-deps backend sh -c '
  set -eu
  cd /app/media
  tmp=.khalsni-restore
  rm -rf "$tmp" && mkdir "$tmp"
  tar -C "$tmp" -xzf -
' < "${SOURCE}/media.tar.gz" || fail "media archive could not be extracted (current media unchanged)"
if [ "${FORMAT}" = 2 ]; then
  ${COMPOSE} run --rm -T --no-deps backend python - /app/media/.khalsni-restore/media < "${HERE}/lib/media_inventory.py" \
    > "${CHECK}" 2>/dev/null || printf '' > "${CHECK}"
  # Inventory paths are relative to the parent of the scanned folder: media/...
  if ! cmp -s "${CHECK}" "${SOURCE}/media.inventory.tsv"; then
    ${COMPOSE} run --rm -T --no-deps backend sh -c 'rm -rf /app/media/.khalsni-restore' || true
    rm -f "${CHECK}"
    fail "extracted media differ from media.inventory.tsv (current media unchanged)"
  fi
  rm -f "${CHECK}"
fi
${COMPOSE} run --rm -T --no-deps backend sh -c '
  set -eu
  cd /app/media
  tmp=.khalsni-restore
  find . -mindepth 1 -maxdepth 1 ! -name "$tmp" -exec rm -rf {} +
  if [ -d "$tmp/media" ]; then find "$tmp/media" -mindepth 1 -maxdepth 1 -exec mv {} . \; ; fi
  rm -rf "$tmp"
' || fail "media swap failed"

log "5/7 re-applying roles, migrations and grants (db-init)"
${COMPOSE} run --rm db-init || fail "db-init failed"

log "6/7 starting backend and frontend"
${COMPOSE} up -d --wait --wait-timeout 600 backend frontend || fail "application did not become healthy"

log "7/7 checking the restored stack"
if [ "${FORMAT}" = 2 ]; then
  EXPECTED="$(sed -n 's/^  "row_counts": \(.*\),$/\1/p' "${SOURCE}/manifest.json")"
  COUNT_SQL="select json_build_object(
    'users', (select count(*) from accounts_customuser),
    'services', (select count(*) from services_service),
    'orders', (select count(*) from orders_order),
    'documents', (select count(*) from documents_document),
    'order_consents', (select count(*) from orders_orderconsent),
    'payments', (select count(*) from payment_payment),
    'audit_logs', (select count(*) from audit_auditlog),
    'migrations', (select count(*) from django_migrations))::text;"
  ACTUAL="$(db_sql "${COUNT_SQL}")" || fail "cannot count restored rows"
  log "row counts expected ${EXPECTED}"
  log "row counts restored ${ACTUAL}"
  # migrations may grow when db-init applied migrations newer than the backup.
  strip() { printf '%s' "$1" | sed 's/, *"migrations" *: *[0-9]*//'; }
  [ "$(strip "${EXPECTED}")" = "$(strip "${ACTUAL}")" ] || fail "restored row counts differ from manifest.json"

  ${COMPOSE} exec -T backend python - /app/media < "${HERE}/lib/media_inventory.py" > "${CHECK}" \
    || fail "cannot inventory restored media"
  # Every backed-up file must be present with the same sha256 and size. The
  # backend start may add files (seed_service_images fills services that have
  # no image yet); those are listed, not treated as a failure.
  LC_ALL=C sort "${SOURCE}/media.inventory.tsv" > "${CHECK}.want"
  LC_ALL=C sort "${CHECK}" > "${CHECK}.have"
  MISSING="$(LC_ALL=C comm -23 "${CHECK}.want" "${CHECK}.have")"
  EXTRA="$(LC_ALL=C comm -13 "${CHECK}.want" "${CHECK}.have")"
  rm -f "${CHECK}.want" "${CHECK}.have"
  if [ -n "${MISSING}" ]; then
    printf '%s\n' "${MISSING}" | cut -f3 | sed 's/^/  missing or changed: /' >&2
    fail "restored media are not byte-identical to the backup inventory"
  fi
  [ -z "${EXTRA}" ] || printf '%s\n' "${EXTRA}" | cut -f3 | sed 's/^/  added after the restore by the backend start (not in the backup): /'
  log "media: all $(grep -c . "${SOURCE}/media.inventory.tsv" || true) backed-up file(s) present and byte-identical (sha256)"
fi

ROLE_CHECK="$(${COMPOSE} exec -T backend python manage.py shell -c "
from django.db import connection
with connection.cursor() as c:
    c.execute('select current_user, r.rolsuper from pg_roles r where r.rolname = current_user')
    user, superuser = c.fetchone()
    c.execute(\"select count(*) from pg_class k join pg_namespace n on n.oid = k.relnamespace where n.nspname = 'public' and pg_get_userbyid(k.relowner) = current_user\")
    owned = c.fetchone()[0]
    c.execute(\"select count(*) from pg_trigger where tgrelid = 'orders_orderconsent'::regclass and not tgisinternal and tgenabled <> 'D'\")
    triggers = c.fetchone()[0]
print(f'backend_role={user} superuser={superuser} owned_objects={owned} consent_triggers_enabled={triggers}')
" 2>/dev/null | tail -n 1)" || fail "cannot query the backend database role"
log "${ROLE_CHECK}"
case "${ROLE_CHECK}" in
  *"superuser=False owned_objects=0 consent_triggers_enabled="[1-9]*) ;;
  *) fail "backend role or consent triggers are not as required: ${ROLE_CHECK}";;
esac

log "RESTORE OK from ${SOURCE} in $(( $(date +%s) - STARTED )) s"
log "next: ${COMPOSE} exec backend python manage.py check_system_consistency"
