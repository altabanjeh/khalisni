#!/bin/sh
# Khalsni scheduled backup: back up, verify, copy off the server, rotate, and
# record the result for monitoring. Meant for cron or a systemd timer
# (docs/total-audit/RECOVERY_RUNBOOK.md, "Schedule").
#
#   sh scripts/backup_scheduled.sh <backup-root>
#
# Environment (all optional):
#   COMPOSE                       Compose command, as for scripts/backup.sh.
#   KHALSNI_BACKUP_OFFSITE_CMD    Shell command that copies ONE finished backup
#                                 set off the server. It runs with
#                                 KHALSNI_BACKUP_DIR (full path) and
#                                 KHALSNI_BACKUP_NAME (folder name) exported and
#                                 the path as "$1"; if it mentions neither, the
#                                 path is appended as its last argument. Examples:
#                                   rclone copy "$KHALSNI_BACKUP_DIR" offsite:khalsni/"$KHALSNI_BACKUP_NAME"
#                                   rsync -a "$1" backup@vault.example:/srv/khalsni/
#                                 Credentials belong in the tool's own config
#                                 (rclone.conf, ~/.ssh), never in this variable.
#                                 A non-zero exit fails the run.
#   KHALSNI_BACKUP_COPY_COMMAND   Older name for KHALSNI_BACKUP_OFFSITE_CMD
#                                 (path always appended). Still honoured.
#   KHALSNI_BACKUP_KEEP           Number of newest complete local backup sets to
#                                 keep in <backup-root>. Unset: nothing deleted.
#                                 Retention of identity documents is a client
#                                 policy (D06); this script has no default.
#   KHALSNI_BACKUP_STATUS_FILE    Machine-readable status (JSON), rewritten on
#                                 every run. Default <backup-root>/backup-status.json.
#                                 Check it with scripts/backup_status_check.sh.
#
# Exit status is non-zero if any step fails, so cron/systemd can alert, and the
# status file then says last_result "failure" with the failed step.
set -eu

ROOT="${1:?usage: scripts/backup_scheduled.sh <backup-root>}"
ROOT="${ROOT%/}"
HERE="$(cd "$(dirname "$0")" && pwd)"
STATUS_FILE="${KHALSNI_BACKUP_STATUS_FILE:-${ROOT}/backup-status.json}"
LOCK="${ROOT}/.backup.lock"
RUN_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
STEP="start"
LATEST=""
OFFSITE="not_configured"
DONE=0

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) khalsni-scheduled-backup: $*"; }

previous() {
  [ -f "${STATUS_FILE}" ] || return 0
  sed -n "s/^  \"$1\": \"\([^\"]*\)\",\{0,1\}$/\1/p" "${STATUS_FILE}" | head -n 1
}

write_status() {
  result="$1"
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if [ "${result}" = "success" ]; then
    last_success="${now}"; last_failure="$(previous last_failure_at)"; error=""
  else
    last_success="$(previous last_success_at)"; last_failure="${now}"; error="step ${STEP} failed"
  fi
  artifacts=""
  if [ -n "${LATEST}" ] && [ -f "${LATEST}/SHA256SUMS" ]; then
    artifacts="$(while read -r sum name; do
      name="${name#\*}"
      printf '    {"name": "%s", "bytes": %s, "sha256": "%s"},\n' "${name}" "$(wc -c < "${LATEST}/${name}" | tr -d '[:space:]')" "${sum}"
    done < "${LATEST}/SHA256SUMS" | sed '$ s/,$//')"
  fi
  tmp="${STATUS_FILE}.tmp"
  {
    echo '{'
    echo "  \"last_run_at\": \"${RUN_AT}\","
    echo "  \"last_result\": \"${result}\","
    echo "  \"last_success_at\": \"${last_success}\","
    echo "  \"last_failure_at\": \"${last_failure}\","
    echo "  \"last_error\": \"${error}\","
    echo "  \"backup_dir\": \"${LATEST}\","
    echo "  \"offsite\": \"${OFFSITE}\","
    echo '  "artifacts": ['
    [ -z "${artifacts}" ] || printf '%s\n' "${artifacts}"
    echo '  ]'
    echo '}'
  } > "${tmp}" && mv "${tmp}" "${STATUS_FILE}"
}

finish() {
  code=$?
  if [ "${DONE}" -ne 1 ]; then
    [ "${code}" -ne 0 ] || code=1
    write_status failure || true
    log "SCHEDULED BACKUP FAILED at step ${STEP} (exit ${code})" >&2
  fi
  [ "${HOLD_LOCK:-0}" -ne 1 ] || rmdir "${LOCK}" 2>/dev/null || true
  exit "${code}"
}

mkdir -p "${ROOT}"
# One run at a time; a stale lock (crashed host) must be removed by hand.
if ! mkdir "${LOCK}" 2>/dev/null; then
  log "SCHEDULED BACKUP FAILED: another run holds ${LOCK} (remove it if no backup is running)" >&2
  exit 1
fi
HOLD_LOCK=1
trap finish EXIT
trap 'exit 130' INT TERM

STEP="settings"
if [ -n "${KHALSNI_BACKUP_KEEP:-}" ]; then
  case "${KHALSNI_BACKUP_KEEP}" in *[!0-9]*) log "KHALSNI_BACKUP_KEEP must be a whole number" >&2; exit 1;; esac
  [ "${KHALSNI_BACKUP_KEEP}" -ge 1 ] || { log "KHALSNI_BACKUP_KEEP must be at least 1" >&2; exit 1; }
fi
log "run started; root=${ROOT} keep=${KHALSNI_BACKUP_KEEP:-unset} status=${STATUS_FILE}"

STEP="backup"
RESULT_FILE="${ROOT}/.last-backup-path"
rm -f "${RESULT_FILE}"
KHALSNI_BACKUP_RESULT_FILE="${RESULT_FILE}" sh "${HERE}/backup.sh" "${ROOT}"
LATEST="$(cat "${RESULT_FILE}")"
rm -f "${RESULT_FILE}"
[ -d "${LATEST}" ] || { log "backup.sh reported ${LATEST}, which does not exist" >&2; exit 1; }

STEP="verify"
sh "${HERE}/verify_backup.sh" "${LATEST}"

STEP="offsite"
if [ -n "${KHALSNI_BACKUP_OFFSITE_CMD:-}" ]; then
  log "copying ${LATEST} off the server"
  export KHALSNI_BACKUP_DIR="${LATEST}" KHALSNI_BACKUP_NAME="${LATEST##*/}"
  case "${KHALSNI_BACKUP_OFFSITE_CMD}" in
    *KHALSNI_BACKUP_DIR*|*KHALSNI_BACKUP_NAME*|*'$1'*|*'${1}'*) offsite_cmd="${KHALSNI_BACKUP_OFFSITE_CMD}" ;;
    *) offsite_cmd="${KHALSNI_BACKUP_OFFSITE_CMD} \"\$1\"" ;;
  esac
  if sh -c "${offsite_cmd}" khalsni-offsite "${LATEST}"; then
    OFFSITE="copied"
    log "off-server copy finished"
  else
    OFFSITE="failed"
    log "off-server copy command exited non-zero" >&2
    exit 1
  fi
elif [ -n "${KHALSNI_BACKUP_COPY_COMMAND:-}" ]; then
  log "copying ${LATEST} off the server (KHALSNI_BACKUP_COPY_COMMAND)"
  # shellcheck disable=SC2086 # the command is intentionally word-split
  if ${KHALSNI_BACKUP_COPY_COMMAND} "${LATEST}"; then OFFSITE="copied"; else OFFSITE="failed"; exit 1; fi
else
  log "WARNING: KHALSNI_BACKUP_OFFSITE_CMD is not set; the backup exists only on this server." >&2
fi

STEP="rotate"
if [ -n "${KHALSNI_BACKUP_KEEP:-}" ]; then
  # Only complete local sets are rotated; ".partial" directories stay for inspection.
  COMPLETE="$(ls -1d "${ROOT}"/khalsni-* 2>/dev/null | grep -v '\.partial$' | sort || true)"
  TOTAL="$(printf '%s\n' "${COMPLETE}" | grep -c . || true)"
  REMOVE=$((TOTAL - KHALSNI_BACKUP_KEEP))
  if [ "${REMOVE}" -gt 0 ]; then
    printf '%s\n' "${COMPLETE}" | head -n "${REMOVE}" | while read -r old; do
      [ "${old}" != "${LATEST}" ] || continue
      log "removing old local backup ${old}"
      rm -rf -- "${old}"
    done
  fi
  log "rotation: kept the newest ${KHALSNI_BACKUP_KEEP} of ${TOTAL} complete set(s)"
else
  log "NOTE: KHALSNI_BACKUP_KEEP is not set; old local backups are not rotated."
fi
PARTIALS="$(ls -1d "${ROOT}"/khalsni-*.partial 2>/dev/null | grep -c . || true)"
[ "${PARTIALS}" -eq 0 ] || log "WARNING: ${PARTIALS} incomplete .partial set(s) in ${ROOT} need inspection"

STEP="status"
write_status success
DONE=1
log "SCHEDULED BACKUP OK ${LATEST} (offsite: ${OFFSITE})"
