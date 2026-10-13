#!/bin/sh
# Khalsni backup: PostgreSQL dump + uploaded media, from the running Compose stack.
#
#   sh scripts/backup.sh [output-directory]
#
# Run on the server from the repository root. Reads POSTGRES_* from the db
# container itself, so no credentials are passed on the command line.
# Copy the output directory off the server: a backup kept on the same disk
# does not survive losing that disk.
#
# The backup is built in "<name>.partial" and renamed only after the dump and
# the archive have both been written and read back. Any failure exits non-zero
# and leaves the ".partial" directory behind for inspection; a directory
# without that suffix is a complete backup.
set -eu

OUT_DIR="${1:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="${OUT_DIR}/khalsni-${STAMP}"
TARGET="${FINAL}.partial"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.yml}"

fail() {
  echo "BACKUP FAILED: $1" >&2
  echo "Incomplete output left in ${TARGET}" >&2
  exit 1
}

mkdir -p "${TARGET}" || { echo "BACKUP FAILED: cannot create ${TARGET}" >&2; exit 1; }

echo "Dumping database..."
${COMPOSE} exec -T db sh -c 'pg_dump -Fc -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "${TARGET}/database.dump" \
  || fail "pg_dump did not complete"
[ -s "${TARGET}/database.dump" ] || fail "database dump is empty"
${COMPOSE} exec -T db pg_restore --list < "${TARGET}/database.dump" > "${TARGET}/database.toc" \
  || fail "database dump cannot be read back"
grep -q "TABLE DATA public orders_order" "${TARGET}/database.toc" || fail "database dump has no orders table"

echo "Archiving media (customer documents, payment receipts, catalog images)..."
${COMPOSE} exec -T backend tar -C /app -czf - media > "${TARGET}/media.tar.gz" \
  || fail "media archive did not complete"
gzip -t "${TARGET}/media.tar.gz" || fail "media archive is corrupt"
MEDIA_ARCHIVED="$(tar -tzf "${TARGET}/media.tar.gz" | grep -vc '/$' || true)"
MEDIA_LIVE="$(${COMPOSE} exec -T backend sh -c 'find /app/media -type f | wc -l' | tr -d '[:space:]')" \
  || fail "cannot count media files"
# Uploads may arrive while the archive is written, so the archive may hold
# fewer files than the later count, but never zero when files exist.
if [ "${MEDIA_LIVE}" -gt 0 ] && [ "${MEDIA_ARCHIVED}" -eq 0 ]; then
  fail "media archive is empty but the volume holds ${MEDIA_LIVE} files"
fi

echo "Recording what was captured..."
{
  echo "backup_utc=${STAMP}"
  echo "release_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "media_files_archived=${MEDIA_ARCHIVED}"
  echo "media_files_live=${MEDIA_LIVE}"
} > "${TARGET}/manifest.txt"
${COMPOSE} exec -T backend sh -c 'echo "object_storage_bucket=${AWS_STORAGE_BUCKET_NAME:-none}"' >> "${TARGET}/manifest.txt" \
  || fail "cannot read storage configuration"
${COMPOSE} exec -T db sh -c 'psql -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "
  select '"'"'postgres='"'"' || current_setting('"'"'server_version'"'"')
  union all select '"'"'orders='"'"' || count(*) from orders_order
  union all select '"'"'documents='"'"' || count(*) from documents_document
  union all select '"'"'users='"'"' || count(*) from accounts_customuser
  union all select '"'"'payments='"'"' || count(*) from payment_payment
  union all select '"'"'audit_logs='"'"' || count(*) from audit_auditlog
  union all select '"'"'migrations='"'"' || count(*) from django_migrations"' >> "${TARGET}/manifest.txt" \
  || fail "cannot record row counts"
( cd "${TARGET}" && sha256sum database.dump media.tar.gz manifest.txt > SHA256SUMS ) || fail "cannot write checksums"

mv "${TARGET}" "${FINAL}" || fail "cannot finalize ${FINAL}"

echo "Backup written to ${FINAL}"
cat "${FINAL}/manifest.txt"
if grep -q "object_storage_bucket=none" "${FINAL}/manifest.txt"; then :; else
  echo "NOTE: uploads are stored in object storage; back up the bucket separately." >&2
fi
