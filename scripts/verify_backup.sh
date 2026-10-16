#!/bin/sh
# Khalsni backup verification: check a backup directory made by scripts/backup.sh.
#
#   sh scripts/verify_backup.sh <backup-directory>
#
# Needs no running stack, so it also works on the off-server copy. Checks:
#   - the directory is complete (no ".partial" suffix) and holds every file;
#   - SHA256SUMS matches database.dump, media.tar.gz and manifest.txt;
#   - media.tar.gz is a readable gzip/tar archive;
#   - the database dump is a non-empty PostgreSQL custom-format archive;
#   - manifest.txt records the time, commit and row counts.
# Exit 0 means every check passed. It does not prove the backup restores:
# do the restore drill in docs/total-audit/RECOVERY_RUNBOOK.md for that.
set -eu

DIR="${1:?usage: scripts/verify_backup.sh <backup-directory>}"
fail() { echo "BACKUP VERIFY FAILED: $1" >&2; exit 1; }

case "${DIR}" in *.partial|*.partial/) fail "${DIR} is an incomplete backup (.partial)";; esac
[ -d "${DIR}" ] || fail "${DIR} is not a directory"
for name in database.dump media.tar.gz manifest.txt SHA256SUMS; do
  [ -s "${DIR}/${name}" ] || fail "missing or empty ${name}"
done

( cd "${DIR}" && sha256sum -c --quiet SHA256SUMS ) || fail "checksums do not match"
gzip -t "${DIR}/media.tar.gz" || fail "media archive is corrupt"
tar -tzf - < "${DIR}/media.tar.gz" > /dev/null || fail "media archive cannot be listed"
# pg_dump -Fc archives start with the magic bytes "PGDMP".
[ "$(head -c 5 "${DIR}/database.dump")" = "PGDMP" ] || fail "database.dump is not a PostgreSQL custom-format dump"
for key in backup_utc release_commit orders documents users migrations; do
  grep -q "^${key}=" "${DIR}/manifest.txt" || fail "manifest.txt has no ${key}"
done

echo "Backup verified: ${DIR}"
grep -E "^(backup_utc|orders|documents|users)=" "${DIR}/manifest.txt"
