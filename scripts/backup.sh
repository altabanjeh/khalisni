#!/bin/sh
# Khalsni backup: one backup set = PostgreSQL dump + uploaded media + manifest.
#
#   sh scripts/backup.sh [output-directory]          (default ./backups)
#
# Run on the server from the repository root. Reads the database credentials
# from the db container itself, so none are passed on the command line.
#
# Environment (optional):
#   COMPOSE                     Compose command for the stack, e.g.
#                               "docker compose -p <project> -f docker-compose.yml".
#                               Default: docker compose -f docker-compose.yml
#   KHALSNI_BACKUP_RESULT_FILE  If set, the path of the finished backup set is
#                               written to this file (used by backup_scheduled.sh).
#
# Output: <output-directory>/khalsni-<UTC stamp>/
#   database.dump        pg_dump custom format (whole database)
#   database.toc         pg_restore --list of that dump (proves it reads back)
#   media.tar.gz         every file of the media volume (paths media/...)
#   media.inventory.tsv  sha256, size and path of every archived media file
#   manifest.json        commit, time, database name and version, row counts of
#                        key tables, media file count/bytes, size and sha256 of
#                        every artifact
#   SHA256SUMS           checksums of all of the above
#
# The set is built in "<name>.partial" and renamed only when every step passed.
# Any failure exits non-zero and leaves the ".partial" directory for
# inspection: a directory without that suffix is a complete backup set.
# A backup on the same disk does not survive losing the disk: schedule
# scripts/backup_scheduled.sh with an off-server copy.
set -eu

OUT_DIR="${1:-./backups}"
HERE="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FINAL="${OUT_DIR}/khalsni-${STAMP}"
TARGET="${FINAL}.partial"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-backup: $*"; }
fail() {
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-backup: BACKUP FAILED: $1" >&2
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-backup: incomplete output left in ${TARGET}" >&2
  exit 1
}
json_text() { printf '%s' "$1" | tr -d '"\\\000-\037'; }

# Row counts of the tables a restore must bring back, as one JSON object.
# The same statement runs again after a restore (scripts/restore.sh).
COUNT_SQL="select json_build_object(
  'users', (select count(*) from accounts_customuser),
  'services', (select count(*) from services_service),
  'orders', (select count(*) from orders_order),
  'documents', (select count(*) from documents_document),
  'order_consents', (select count(*) from orders_orderconsent),
  'payments', (select count(*) from payment_payment),
  'audit_logs', (select count(*) from audit_auditlog),
  'migrations', (select count(*) from django_migrations))::text;"

db_sql() {
  printf '%s\n' "$1" | ${COMPOSE} exec -T db sh -c 'psql -X -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
}

mkdir -p "${TARGET}" || { echo "BACKUP FAILED: cannot create ${TARGET}" >&2; exit 1; }
log "start: ${FINAL}"

# Media is read through the backend image (it mounts the media volume). Use the
# running container when there is one, otherwise a one-off container.
if [ -n "$(${COMPOSE} ps -q --status running backend 2>/dev/null || true)" ]; then
  media_cmd() { ${COMPOSE} exec -T backend "$@"; }
  log "media source: running backend container"
else
  media_cmd() { ${COMPOSE} run --rm -T --no-deps backend "$@"; }
  log "media source: one-off backend container (backend is not running)"
fi

DB_INFO="$(db_sql "select current_database() || '|' || current_setting('server_version');")" \
  || fail "cannot reach the database"
DB_NAME="$(json_text "${DB_INFO%%|*}")"
PG_VERSION="$(json_text "${DB_INFO#*|}")"
COUNTS_BEFORE="$(db_sql "${COUNT_SQL}")" || fail "cannot count rows before the dump"

log "dumping database ${DB_NAME} (PostgreSQL ${PG_VERSION})"
${COMPOSE} exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "${TARGET}/database.dump" \
  || fail "pg_dump did not complete"
[ -s "${TARGET}/database.dump" ] || fail "database dump is empty"
COUNTS_AFTER="$(db_sql "${COUNT_SQL}")" || fail "cannot count rows after the dump"
${COMPOSE} exec -T db pg_restore --list < "${TARGET}/database.dump" > "${TARGET}/database.toc" \
  || fail "database dump cannot be read back (pg_restore --list)"
for table in orders_order orders_orderconsent documents_document accounts_customuser; do
  grep -q "TABLE DATA public ${table} " "${TARGET}/database.toc" || fail "database dump has no data for ${table}"
done
# Taken before and after the dump: equal means no key table changed while it ran.
if [ "${COUNTS_BEFORE}" = "${COUNTS_AFTER}" ]; then COUNTS_STABLE=true; else COUNTS_STABLE=false
  log "WARNING: key tables changed during the dump; row counts are those after the dump"
fi

log "inventorying media"
media_cmd python - /app/media < "${HERE}/lib/media_inventory.py" > "${TARGET}/media.inventory.tsv" \
  || fail "media inventory did not complete"
MEDIA_FILES="$(grep -c . "${TARGET}/media.inventory.tsv" || true)"
MEDIA_BYTES="$(awk -F '\t' '{ total += $2 } END { printf "%d", total + 0 }' "${TARGET}/media.inventory.tsv")"

log "archiving ${MEDIA_FILES} media file(s), ${MEDIA_BYTES} bytes"
# Exactly the inventoried files, so archive and inventory describe the same set.
# A file deleted between the two steps fails the backup (retry), never silently.
cut -f3 "${TARGET}/media.inventory.tsv" | tr '\n' '\000' \
  | media_cmd tar -C /app --null --no-recursion -T - -czf - > "${TARGET}/media.tar.gz" \
  || fail "media archive did not complete"
gzip -t "${TARGET}/media.tar.gz" || fail "media archive is corrupt"
tar -tzf - < "${TARGET}/media.tar.gz" | grep -v '/$' | LC_ALL=C sort > "${TARGET}/.archive-list" \
  || fail "media archive cannot be listed"
cut -f3 "${TARGET}/media.inventory.tsv" | LC_ALL=C sort > "${TARGET}/.inventory-list"
cmp -s "${TARGET}/.archive-list" "${TARGET}/.inventory-list" || fail "media archive does not match the inventory"
rm -f "${TARGET}/.archive-list" "${TARGET}/.inventory-list"

BUCKET="$(media_cmd sh -c 'printf "%s" "${AWS_STORAGE_BUCKET_NAME:-none}"' 2>/dev/null || echo unknown)"
RELEASE_SHA="$(media_cmd sh -c 'printf "%s" "${BUILD_SHA:-unknown}"' 2>/dev/null || echo unknown)"
REPO_COMMIT="$(git -C "${HERE}/.." rev-parse HEAD 2>/dev/null || echo unknown)"

artifact_json() {
  printf '    "%s": {"bytes": %s, "sha256": "%s"}' "$1" \
    "$(wc -c < "${TARGET}/$1" | tr -d '[:space:]')" \
    "$(sha256sum "${TARGET}/$1" | cut -d ' ' -f 1)"
}

log "writing manifest"
{
  echo '{'
  echo '  "format": "khalsni-backup/2",'
  echo "  \"created_at\": \"${CREATED_AT}\","
  echo "  \"release_sha\": \"$(json_text "${RELEASE_SHA}")\","
  echo "  \"repository_commit\": \"$(json_text "${REPO_COMMIT}")\","
  echo "  \"database\": {\"name\": \"${DB_NAME}\", \"server_version\": \"${PG_VERSION}\", \"row_counts_stable\": ${COUNTS_STABLE}},"
  echo "  \"row_counts\": ${COUNTS_AFTER},"
  echo "  \"media\": {\"file_count\": ${MEDIA_FILES}, \"bytes\": ${MEDIA_BYTES}, \"object_storage_bucket\": \"$(json_text "${BUCKET}")\"},"
  echo '  "artifacts": {'
  artifact_json database.dump; echo ','
  artifact_json database.toc; echo ','
  artifact_json media.tar.gz; echo ','
  artifact_json media.inventory.tsv; echo
  echo '  }'
  echo '}'
} > "${TARGET}/manifest.json" || fail "cannot write manifest.json"

( cd "${TARGET}" && sha256sum database.dump database.toc media.tar.gz media.inventory.tsv manifest.json > SHA256SUMS ) \
  || fail "cannot write checksums"

mv "${TARGET}" "${FINAL}" || fail "cannot finalize ${FINAL}"
[ -z "${KHALSNI_BACKUP_RESULT_FILE:-}" ] || printf '%s\n' "${FINAL}" > "${KHALSNI_BACKUP_RESULT_FILE}"

log "BACKUP OK ${FINAL}"
log "database=${DB_NAME} postgres=${PG_VERSION} row_counts=${COUNTS_AFTER}"
log "media files=${MEDIA_FILES} bytes=${MEDIA_BYTES} bucket=${BUCKET} release_sha=${RELEASE_SHA}"
if [ "${BUCKET}" != "none" ]; then
  log "NOTE: uploads are configured for object storage (${BUCKET}); back up the bucket separately."
fi
