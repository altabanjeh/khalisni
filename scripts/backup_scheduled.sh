#!/bin/sh
# Khalsni scheduled backup: back up, verify, optionally copy off the server and
# rotate. Meant for cron or a systemd timer (docs/total-audit/RECOVERY_RUNBOOK.md).
#
#   sh scripts/backup_scheduled.sh <backup-root>
#
# Environment (all optional):
#   COMPOSE                     Compose command, as for scripts/backup.sh.
#   KHALSNI_BACKUP_COPY_COMMAND Command that copies one finished backup off the
#                               server; the backup directory is appended as its
#                               last argument, e.g. "rclone copy --immutable"
#                               plus a remote path, or an rsync target script.
#   KHALSNI_BACKUP_KEEP         Number of newest complete backups to keep in
#                               <backup-root>. Unset: nothing is ever deleted.
#                               How long identity documents may be kept is a
#                               client policy (D06); this script has no default.
#
# Exit status is non-zero if any step fails, so cron/systemd can alert.
set -eu

ROOT="${1:?usage: scripts/backup_scheduled.sh <backup-root>}"
HERE="$(cd "$(dirname "$0")" && pwd)"

# Refuse a bad rotation setting before taking a backup.
if [ -n "${KHALSNI_BACKUP_KEEP:-}" ]; then
  case "${KHALSNI_BACKUP_KEEP}" in *[!0-9]*) echo "SCHEDULED BACKUP FAILED: KHALSNI_BACKUP_KEEP must be a whole number" >&2; exit 1;; esac
  [ "${KHALSNI_BACKUP_KEEP}" -ge 1 ] || { echo "SCHEDULED BACKUP FAILED: KHALSNI_BACKUP_KEEP must be at least 1" >&2; exit 1; }
fi

sh "${HERE}/backup.sh" "${ROOT}"
LATEST="$(ls -1d "${ROOT}"/khalsni-* 2>/dev/null | grep -v '\.partial$' | sort | tail -n 1)"
[ -n "${LATEST}" ] || { echo "SCHEDULED BACKUP FAILED: no finished backup found in ${ROOT}" >&2; exit 1; }
sh "${HERE}/verify_backup.sh" "${LATEST}"

if [ -n "${KHALSNI_BACKUP_COPY_COMMAND:-}" ]; then
  echo "Copying ${LATEST} off the server..."
  # shellcheck disable=SC2086 # the command is intentionally word-split
  ${KHALSNI_BACKUP_COPY_COMMAND} "${LATEST}" || { echo "SCHEDULED BACKUP FAILED: off-server copy failed" >&2; exit 1; }
else
  echo "WARNING: KHALSNI_BACKUP_COPY_COMMAND is not set; the backup exists only on this server." >&2
fi

if [ -n "${KHALSNI_BACKUP_KEEP:-}" ]; then
  # Only complete local backups are rotated; ".partial" directories are kept for inspection.
  COMPLETE="$(ls -1d "${ROOT}"/khalsni-* 2>/dev/null | grep -v '\.partial$' | sort)"
  TOTAL="$(printf '%s
' "${COMPLETE}" | grep -c . || true)"
  REMOVE=$((TOTAL - KHALSNI_BACKUP_KEEP))
  if [ "${REMOVE}" -gt 0 ]; then
    printf '%s
' "${COMPLETE}" | head -n "${REMOVE}" | while read -r old; do
      echo "Removing old local backup ${old}"
      rm -rf -- "${old}"
    done
  fi
else
  echo "NOTE: KHALSNI_BACKUP_KEEP is not set; old local backups are not rotated." >&2
fi
echo "Scheduled backup finished: ${LATEST}"
