#!/bin/sh
# Khalsni backup verification: check one backup set made by scripts/backup.sh.
#
#   sh scripts/verify_backup.sh <backup-directory>
#
# Needs no running stack, so it also works on the off-server copy. Checks:
#   - the directory is complete (no ".partial" suffix) and holds every file;
#   - SHA256SUMS matches every artifact, and so does manifest.json;
#   - the database dump reads back with pg_restore --list and contains the key
#     tables and the consent append-only triggers;
#   - media.tar.gz is a valid gzip/tar archive whose file list equals
#     media.inventory.tsv, and the manifest's media file count matches;
#   - manifest.json records time, commit, database, row counts and media size.
#
# pg_restore: the host's pg_restore when installed, otherwise the
# postgres:16-alpine image through docker (KHALSNI_VERIFY_PG_IMAGE overrides).
# Set KHALSNI_VERIFY_SKIP_PG_RESTORE=1 only where neither exists; the result is
# then reported as partial.
#
# Exit 0 means every check passed. It does not prove the backup restores: do
# the restore drill in docs/total-audit/RECOVERY_RUNBOOK.md for that.
set -eu

DIR="${1:?usage: scripts/verify_backup.sh <backup-directory>}"
DIR="${DIR%/}"
PG_IMAGE="${KHALSNI_VERIFY_PG_IMAGE:-postgres:16-alpine}"
log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-verify: $*"; }
fail() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-verify: BACKUP VERIFY FAILED: $1" >&2; exit 1; }

case "${DIR}" in *.partial) fail "${DIR} is an incomplete backup (.partial)";; esac
[ -d "${DIR}" ] || fail "${DIR} is not a directory"

pg_list() {
  if command -v pg_restore >/dev/null 2>&1; then
    pg_restore --list < "${DIR}/database.dump"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm -i "${PG_IMAGE}" pg_restore --list < "${DIR}/database.dump"
  else
    return 127
  fi
}

check_dump() {
  # pg_dump -Fc archives start with the magic bytes "PGDMP".
  [ "$(head -c 5 "${DIR}/database.dump")" = "PGDMP" ] || fail "database.dump is not a PostgreSQL custom-format dump"
  if [ "${KHALSNI_VERIFY_SKIP_PG_RESTORE:-0}" = "1" ]; then
    log "WARNING: pg_restore --list skipped (KHALSNI_VERIFY_SKIP_PG_RESTORE=1); verification is partial"
    return 0
  fi
  LISTING="$(pg_list)" || fail "pg_restore --list cannot read database.dump (or no pg_restore/docker available)"
  for table in orders_order orders_orderconsent documents_document accounts_customuser services_service django_migrations; do
    printf '%s\n' "${LISTING}" | grep -q "TABLE DATA public ${table} " || fail "dump has no data for ${table}"
  done
  printf '%s\n' "${LISTING}" | grep -q "TRIGGER public orders_orderconsent " \
    || fail "dump has no trigger on orders_orderconsent (consent append-only protection)"
  log "pg_restore --list: $(printf '%s\n' "${LISTING}" | grep -c 'TABLE DATA') table data entries, consent triggers present"
}

if [ ! -f "${DIR}/manifest.json" ] && [ -f "${DIR}/manifest.txt" ]; then
  # Backup sets written before format 2 (manifest.txt, no inventory).
  log "legacy backup set (manifest.txt)"
  for name in database.dump media.tar.gz manifest.txt SHA256SUMS; do
    [ -s "${DIR}/${name}" ] || fail "missing or empty ${name}"
  done
  ( cd "${DIR}" && sha256sum -c --quiet SHA256SUMS ) || fail "checksums do not match"
  gzip -t "${DIR}/media.tar.gz" || fail "media archive is corrupt"
  tar -tzf - < "${DIR}/media.tar.gz" > /dev/null || fail "media archive cannot be listed"
  check_dump
  log "BACKUP VERIFY OK (legacy) ${DIR}"
  exit 0
fi

for name in database.dump database.toc media.tar.gz media.inventory.tsv manifest.json SHA256SUMS; do
  [ -f "${DIR}/${name}" ] || fail "missing ${name}"
done
for name in database.dump database.toc media.tar.gz manifest.json SHA256SUMS; do
  [ -s "${DIR}/${name}" ] || fail "empty ${name}"
done

( cd "${DIR}" && sha256sum -c --quiet SHA256SUMS ) || fail "SHA256SUMS does not match"
for name in database.dump database.toc media.tar.gz media.inventory.tsv; do
  # "<sum>  name" (text mode) or "<sum> *name" (binary mode, e.g. Git Bash).
  grep -Eq "^[0-9a-f]{64} [ *]${name}\$" "${DIR}/SHA256SUMS" || fail "SHA256SUMS does not cover ${name}"
  recorded="$(sed -n "s/^ *\"${name}\": {\"bytes\": [0-9]*, \"sha256\": \"\([0-9a-f]*\)\"}.*/\1/p" "${DIR}/manifest.json")"
  actual="$(sha256sum "${DIR}/${name}" | cut -d ' ' -f 1)"
  [ -n "${recorded}" ] || fail "manifest.json records no sha256 for ${name}"
  [ "${recorded}" = "${actual}" ] || fail "manifest.json sha256 of ${name} does not match the file"
done
log "checksums: SHA256SUMS and manifest.json match all artifacts"

for key in format created_at release_sha repository_commit database row_counts media artifacts; do
  grep -q "^  \"${key}\":" "${DIR}/manifest.json" || fail "manifest.json has no ${key}"
done
for key in users services orders documents order_consents; do
  grep '^  "row_counts":' "${DIR}/manifest.json" | grep -q "\"${key}\" *: *[0-9]" || fail "manifest.json row_counts has no ${key}"
done

check_dump

gzip -t "${DIR}/media.tar.gz" || fail "media archive is corrupt"
ARCHIVED="$(tar -tzf - < "${DIR}/media.tar.gz" | grep -v '/$' | LC_ALL=C sort)" || fail "media archive cannot be listed"
INVENTORY="$(cut -f3 "${DIR}/media.inventory.tsv" | LC_ALL=C sort)"
[ "${ARCHIVED}" = "${INVENTORY}" ] || fail "media archive file list differs from media.inventory.tsv"
COUNT="$(grep -c . "${DIR}/media.inventory.tsv" || true)"
RECORDED_COUNT="$(sed -n 's/^  "media": {"file_count": \([0-9]*\),.*/\1/p' "${DIR}/manifest.json")"
[ "${COUNT}" = "${RECORDED_COUNT}" ] || fail "manifest media file_count ${RECORDED_COUNT} != inventory ${COUNT}"
log "media archive: ${COUNT} file(s), list equals the inventory"

log "BACKUP VERIFY OK ${DIR}"
grep -E '^  "(created_at|release_sha|row_counts|media)":' "${DIR}/manifest.json"
